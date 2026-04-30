from datetime import date, timedelta
import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.app.database import SessionLocal
from backend.app.modules.trades.models import (
    Counterparty,
    NettingSet,
    CsaAgreement,
    IrsTrade,
    MarketDataSnapshot,
    Curve,
    CurvePoint,
    RecoveryRate,
    CalculationRun,
    ExposureProfile,
    CvaResult,
)

router = APIRouter(prefix="/screens", tags=["screens"])


class Screen1Request(BaseModel):
    counterparty_id: str
    instrument: str
    currency: str
    maturity: str
    direction: str
    floating_index: str | None = None
    notional: float
    fixed_rate: float
    maturity_override: str | None = None


@router.get("/screen1/options")
def get_screen1_options():
    db = SessionLocal()
    try:
        counterparties = db.query(Counterparty).all()
        trades = db.query(IrsTrade).all()
        netting_sets = db.query(NettingSet).all()

        currencies = sorted(
            list(set([t.currency for t in trades] + [n.base_currency for n in netting_sets]))
        )

        return {
            "counterparties": [
                {"id": c.counterparty_id, "name": c.name}
                for c in counterparties
            ],
            "instruments": ["IRS"],
            "currencies": currencies,
            "maturities": ["1Y", "2Y", "5Y", "10Y", "Broken Period"],
            "directions": ["PAY", "RECEIVE"],
        }
    finally:
        db.close()


@router.post("/screen1/calculate")
def calculate_from_screen1(request: Screen1Request):
    db = SessionLocal()

    try:
        counterparty = (
            db.query(Counterparty)
            .filter(Counterparty.counterparty_id == request.counterparty_id)
            .first()
        )

        if not counterparty:
            raise HTTPException(status_code=404, detail="Counterparty not found")

        netting_set = (
            db.query(NettingSet)
            .filter(NettingSet.counterparty_id == counterparty.counterparty_id)
            .first()
        )

        if not netting_set:
            raise HTTPException(status_code=404, detail="Netting set not found")

        csa = (
            db.query(CsaAgreement)
            .filter(CsaAgreement.netting_set_id == netting_set.netting_set_id)
            .first()
        )

        if not csa:
            raise HTTPException(status_code=404, detail="CSA agreement not found")

        snapshot = (
            db.query(MarketDataSnapshot)
            .order_by(MarketDataSnapshot.valuation_date.desc())
            .first()
        )

        if not snapshot:
            raise HTTPException(status_code=404, detail="Market data snapshot not found")

        discount_curve = (
            db.query(Curve)
            .filter(
                Curve.market_data_snapshot_id == snapshot.market_data_snapshot_id,
                Curve.curve_type == "DISCOUNT",
                Curve.currency == request.currency,
            )
            .first()
        )

        credit_curve = (
            db.query(Curve)
            .filter(
                Curve.market_data_snapshot_id == snapshot.market_data_snapshot_id,
                Curve.curve_type == "CREDIT",
                Curve.counterparty_id == counterparty.counterparty_id,
            )
            .first()
        )

        if not discount_curve:
            raise HTTPException(status_code=404, detail="Discount curve not found")

        if not credit_curve:
            raise HTTPException(status_code=404, detail="Credit curve not found")

        discount_point = (
            db.query(CurvePoint)
            .filter(CurvePoint.curve_id == discount_curve.curve_id)
            .order_by(CurvePoint.maturity_date.desc())
            .first()
        )

        credit_point = (
            db.query(CurvePoint)
            .filter(CurvePoint.curve_id == credit_curve.curve_id)
            .order_by(CurvePoint.maturity_date.desc())
            .first()
        )

        if not discount_point:
            raise HTTPException(status_code=404, detail="Discount curve point not found")

        if not credit_point:
            raise HTTPException(status_code=404, detail="Credit curve point not found")

        recovery = (
            db.query(RecoveryRate)
            .filter(
                RecoveryRate.counterparty_id == counterparty.counterparty_id,
                RecoveryRate.market_data_snapshot_id == snapshot.market_data_snapshot_id,
            )
            .first()
        )

        if not recovery:
            raise HTTPException(status_code=404, detail="Recovery rate not found")

        valuation_date = snapshot.valuation_date
        maturity_date = derive_maturity_date(valuation_date, request.maturity)

        trade_id = f"TRADE-{uuid.uuid4()}"
        run_id = f"RUN-CVA-{uuid.uuid4()}"
        cva_result_id = f"CVA-{uuid.uuid4()}"

        new_trade = IrsTrade(
            trade_id=trade_id,
            external_trade_id=f"SCREEN1-{trade_id[:8]}",
            netting_set_id=netting_set.netting_set_id,
            notional=request.notional,
            currency=request.currency,
            trade_date=valuation_date,
            effective_date=valuation_date + timedelta(days=2),
            maturity_date=maturity_date,
            fixed_rate=request.fixed_rate,
            floating_index=request.floating_index or "SONIA",
            pay_receive_fixed=request.direction,
        )

        calculation_run = CalculationRun(
            calculation_run_id=run_id,
            run_type="CVA",
            netting_set_id=netting_set.netting_set_id,
            market_data_snapshot_id=snapshot.market_data_snapshot_id,
            csa_id=csa.csa_id,
            valuation_date=valuation_date,
            status="CALCULATED",
            model_version="MVP-CVA-0.2",
        )

        # MVP exposure approximation
        #
        # This is deliberately simple:
        # - exposure scales with notional
        # - maturity creates longer-dated exposure
        # - fixed rate away from a rough par rate increases exposure
        # - collateral threshold reduces effective exposure
        #
        # Full Monte Carlo comes later.
        maturity_years = maturity_to_years(request.maturity)
        par_rate = 0.0347
        rate_spread = abs(request.fixed_rate - par_rate)

        gross_epe = request.notional * (0.0125 * maturity_years + rate_spread * 2.5)
        collateral_reduction = max(csa.threshold_amount, 0.0)
        epe = max(gross_epe - collateral_reduction, 0.0)

        discount_factor = discount_point.value
        credit_spread = credit_point.value
        recovery_rate = recovery.recovery_rate
        lgd = 1.0 - recovery_rate

        # simple marginal default probability approximation
        marginal_default_probability = min(max(credit_spread * maturity_years, 0.0), 1.0)

        cva_amount = epe * marginal_default_probability * lgd * discount_factor
        cs01 = cva_amount * 0.0114

        exposure_profile_rows = build_exposure_profile_rows(
            run_id=run_id,
            valuation_date=valuation_date,
            maturity_years=maturity_years,
            epe=epe,
            discount_factor=discount_factor,
            marginal_default_probability=marginal_default_probability,
        )

        cva_result = CvaResult(
            cva_result_id=cva_result_id,
            calculation_run_id=run_id,
            cva_amount=round(cva_amount, 2),
            currency=request.currency,
            cs01=round(cs01, 2),
        )

        db.add(new_trade)
        db.add(calculation_run)
        db.flush()

        db.add_all(exposure_profile_rows)
        db.add(cva_result)
        db.commit()

        return {
            "status": "CALCULATED",
            "input": request.model_dump(),
            "counterparty": {
                "id": counterparty.counterparty_id,
                "name": counterparty.name,
            },
            "netting_set": {
                "id": netting_set.netting_set_id,
                "base_currency": netting_set.base_currency,
            },
            "calculation_run_id": run_id,
            "trade_id": trade_id,
            "valuation_date": str(valuation_date),
            "maturity_date": str(maturity_date),
            "model_version": "MVP-CVA-0.2",
            "epe": round(epe, 2),
            "discount_factor": discount_factor,
            "credit_spread": credit_spread,
            "recovery_rate": recovery_rate,
            "lgd": round(lgd, 4),
            "marginal_default_probability": round(marginal_default_probability, 6),
            "cva_amount": round(cva_amount, 2),
            "currency": request.currency,
            "cs01": round(cs01, 2),
            "message": "CVA calculated from submitted trade and database market data",
            "exposure_profile": [
                {
                    "date": str(row.time_bucket_date),
                    "expected_exposure": row.expected_exposure,
                    "expected_positive_exposure": row.expected_positive_exposure,
                    "pfe": row.pfe,
                    "discount_factor": row.discount_factor,
                    "marginal_default_probability": row.marginal_default_probability,
                }
                for row in exposure_profile_rows
            ],
        }

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


def build_exposure_profile_rows(
    run_id: str,
    valuation_date: date,
    maturity_years: float,
    epe: float,
    discount_factor: float,
    marginal_default_probability: float,
) -> list[ExposureProfile]:
    bucket_count = max(int(maturity_years), 1)
    rows = []

    for bucket in range(1, bucket_count + 1):
        time_fraction = bucket / bucket_count
        profile_shape = max(1.0 - ((time_fraction - 0.45) ** 2 * 1.8), 0.2)
        bucket_epe = epe * profile_shape

        rows.append(
            ExposureProfile(
                exposure_profile_id=f"EXP-{uuid.uuid4()}",
                calculation_run_id=run_id,
                time_bucket_date=date(
                    valuation_date.year + bucket,
                    valuation_date.month,
                    valuation_date.day,
                ),
                expected_exposure=round(bucket_epe, 2),
                expected_positive_exposure=round(bucket_epe, 2),
                pfe=round(bucket_epe * 2.5, 2),
                discount_factor=round(discount_factor, 6),
                marginal_default_probability=round(
                    marginal_default_probability * time_fraction,
                    6,
                ),
            )
        )

    return rows


def maturity_to_years(maturity: str) -> float:
    if maturity == "1Y":
        return 1.0
    if maturity == "2Y":
        return 2.0
    if maturity == "5Y":
        return 5.0
    if maturity == "10Y":
        return 10.0
    return 5.0


def derive_maturity_date(valuation_date: date, maturity: str) -> date:
    years = int(maturity_to_years(maturity))
    return date(valuation_date.year + years, valuation_date.month, valuation_date.day)