from datetime import date, timedelta
import math
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
        counterparties = db.query(Counterparty).order_by(Counterparty.name).all()
        netting_sets = db.query(NettingSet).all()
        currencies = sorted(set([n.base_currency for n in netting_sets] + ["USD", "EUR", "GBP", "CHF"]))

        return {
            "counterparties": [
                {
                    "id": c.counterparty_id,
                    "name": c.name,
                    "netting_set": build_netting_set_summary(db, c.counterparty_id),
                }
                for c in counterparties
            ],
            "instruments": ["IRS"],
            "currencies": currencies,
            "floating_indices": ["SOFR", "EURIBOR", "SONIA", "SARON"],
            "maturities": ["1Y", "2Y", "3Y", "5Y", "7Y", "10Y"],
            "directions": ["PAY", "RECEIVE"],
            "par_rates": PAR_RATES,
        }
    finally:
        db.close()


@router.post("/screen1/calculate")
def calculate_from_screen1(request: Screen1Request):
    db = SessionLocal()

    try:
        counterparty = db.query(Counterparty).filter(
            Counterparty.counterparty_id == request.counterparty_id
        ).first()
        if not counterparty:
            raise HTTPException(status_code=404, detail="Counterparty not found. Run /mvp/seed first.")

        netting_set = db.query(NettingSet).filter(
            NettingSet.counterparty_id == counterparty.counterparty_id
        ).first()
        if not netting_set:
            raise HTTPException(status_code=404, detail="Netting set not found. Run /mvp/seed first.")

        csa = db.query(CsaAgreement).filter(
            CsaAgreement.netting_set_id == netting_set.netting_set_id
        ).first()
        if not csa:
            raise HTTPException(status_code=404, detail="CSA agreement not found. Run /mvp/seed first.")

        snapshot = db.query(MarketDataSnapshot).order_by(MarketDataSnapshot.valuation_date.desc()).first()
        if not snapshot:
            raise HTTPException(status_code=404, detail="Market data snapshot not found. Run /mvp/seed first.")

        discount_curve = db.query(Curve).filter(
            Curve.market_data_snapshot_id == snapshot.market_data_snapshot_id,
            Curve.curve_type == "DISCOUNT",
            Curve.currency == request.currency,
        ).first()
        if not discount_curve:
            raise HTTPException(status_code=404, detail=f"Discount curve not found for {request.currency}. Run /mvp/seed first.")

        credit_curve = db.query(Curve).filter(
            Curve.market_data_snapshot_id == snapshot.market_data_snapshot_id,
            Curve.curve_type == "CREDIT",
            Curve.counterparty_id == counterparty.counterparty_id,
        ).first()
        if not credit_curve:
            raise HTTPException(status_code=404, detail="Credit curve not found. Run /mvp/seed first.")

        recovery = db.query(RecoveryRate).filter(
            RecoveryRate.counterparty_id == counterparty.counterparty_id,
            RecoveryRate.market_data_snapshot_id == snapshot.market_data_snapshot_id,
        ).first()
        if not recovery:
            raise HTTPException(status_code=404, detail="Recovery rate not found. Run /mvp/seed first.")

        maturity_years = maturity_to_years(request.maturity)
        fixed_rate_pct = normalise_rate_to_pct(request.fixed_rate)
        par_rate_pct = get_par_rate(request.currency, request.maturity)
        rate_delta_bps = round((fixed_rate_pct - par_rate_pct) * 100, 1)

        existing_trades = db.query(IrsTrade).filter(IrsTrade.netting_set_id == netting_set.netting_set_id).all()
        existing_notional = sum(t.notional for t in existing_trades)
        existing_trade_count = len(existing_trades)

        credit_point = db.query(CurvePoint).filter(CurvePoint.curve_id == credit_curve.curve_id).first()
        credit_spread = credit_point.value if credit_point else 0.0125
        lgd = 1.0 - recovery.recovery_rate

        profile = build_incremental_profile(
            valuation_date=snapshot.valuation_date,
            existing_notional=existing_notional or 2_100_000_000,
            trade_notional=request.notional,
            maturity_years=maturity_years,
            rate_delta_bps=rate_delta_bps,
            direction=request.direction,
        )

        incremental_epe = max(p["epe_new_trade"] - p["epe_current"] for p in profile)
        cva_incremental = -abs(incremental_epe * credit_spread * lgd * maturity_years * 0.19)
        dva_incremental = abs(cva_incremental) * 0.146
        fva_incremental = -abs(cva_incremental) * 0.346
        total_xva_charge = cva_incremental + dva_incremental + fva_incremental

        run_id = f"RUN-{uuid.uuid4()}"
        trade_id = f"TRADE-{uuid.uuid4()}"
        maturity_date = snapshot.valuation_date + timedelta(days=int(365 * maturity_years))

        db.add(
            IrsTrade(
                trade_id=trade_id,
                external_trade_id=f"SCREEN1-{str(uuid.uuid4())[:8]}",
                netting_set_id=netting_set.netting_set_id,
                notional=request.notional,
                currency=request.currency,
                trade_date=snapshot.valuation_date,
                effective_date=snapshot.valuation_date + timedelta(days=2),
                maturity_date=maturity_date,
                fixed_rate=fixed_rate_pct / 100,
                floating_index=request.floating_index or "SOFR",
                pay_receive_fixed=request.direction,
            )
        )

        db.add(
            CalculationRun(
                calculation_run_id=run_id,
                run_type="INCREMENTAL_XVA",
                netting_set_id=netting_set.netting_set_id,
                market_data_snapshot_id=snapshot.market_data_snapshot_id,
                csa_id=csa.csa_id,
                valuation_date=snapshot.valuation_date,
                status="CALCULATED",
                model_version="MVP-INCREMENTAL-XVA-0.1",
            )
        )

        db.flush()

        exposure_rows = [
            ExposureProfile(
                exposure_profile_id=f"EXP-{uuid.uuid4()}",
                calculation_run_id=run_id,
                time_bucket_date=date.fromisoformat(point["date"]),
                expected_exposure=point["epe_new_trade"],
                expected_positive_exposure=point["epe_new_trade"],
                pfe=point["pfe_95"],
                discount_factor=0.89,
                marginal_default_probability=round(credit_spread * (index + 1) / len(profile), 6),
            )
            for index, point in enumerate(profile)
        ]

        db.add_all(exposure_rows)
        db.add(
            CvaResult(
                cva_result_id=f"CVA-{uuid.uuid4()}",
                calculation_run_id=run_id,
                cva_amount=round(cva_incremental, 2),
                currency=request.currency,
                cs01=round(abs(cva_incremental) * 0.0118, 2),
            )
        )
        db.commit()

        total_bps = to_bps(total_xva_charge, request.notional)
        cva_bps = to_bps(cva_incremental, request.notional)
        dva_bps = to_bps(dva_incremental, request.notional)
        fva_bps = to_bps(fva_incremental, request.notional)

        return {
            "status": "CALCULATED",
            "calculation_run_id": run_id,
            "trade_id": trade_id,
            "valuation_date": str(snapshot.valuation_date),
            "maturity_date": str(maturity_date),
            "counterparty": {"id": counterparty.counterparty_id, "name": counterparty.name},
            "netting_set": {
                "id": netting_set.netting_set_id,
                "base_currency": netting_set.base_currency,
                "existing_trades": existing_trade_count,
                "existing_notional": existing_notional,
            },
            "par_rate_pct": par_rate_pct,
            "rate_delta_bps": rate_delta_bps,
            "credit_spread": credit_spread,
            "recovery_rate": recovery.recovery_rate,
            "cva_incremental": round(cva_incremental, 2),
            "dva_incremental": round(dva_incremental, 2),
            "fva_incremental": round(fva_incremental, 2),
            "total_xva_charge": round(total_xva_charge, 2),
            "cva_bps": round(cva_bps, 1),
            "dva_bps": round(dva_bps, 1),
            "fva_bps": round(fva_bps, 1),
            "total_xva_bps": round(total_bps, 1),
            "confidence": "Moderate",
            "approx_trades": 23,
            "approx_pct": 2.1,
            "exposure_profile": profile,
            "netting_set_composition": [
                {
                    "label": f"{existing_trade_count} existing",
                    "notional": existing_notional,
                    "source": "Computed",
                    "maturities": "6m–12Y",
                },
                {
                    "label": "2 added today",
                    "notional": 180_000_000,
                    "source": "Interpolated",
                    "maturities": "3Y, 5Y",
                },
                {
                    "label": "+ this trade",
                    "notional": request.notional,
                    "source": "Interpolated",
                    "maturities": request.maturity,
                },
            ],
            "par_rates": PAR_RATES.get(request.currency, PAR_RATES["USD"]),
        }

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


def build_netting_set_summary(db, counterparty_id: str):
    netting_set = db.query(NettingSet).filter(NettingSet.counterparty_id == counterparty_id).first()
    if not netting_set:
        return None
    trades = db.query(IrsTrade).filter(IrsTrade.netting_set_id == netting_set.netting_set_id).all()
    return {
        "id": netting_set.netting_set_id,
        "base_currency": netting_set.base_currency,
        "existing_trades": len(trades),
        "existing_notional": sum(t.notional for t in trades),
    }


def build_incremental_profile(valuation_date: date, existing_notional: float, trade_notional: float, maturity_years: float, rate_delta_bps: float, direction: str):
    buckets = [
        ("1m", 1 / 12),
        ("3m", 0.25),
        ("6m", 0.5),
        ("1Y", 1),
        ("2Y", 2),
        ("3Y", 3),
        ("5Y", 5),
        ("7Y", 7),
        ("10Y", 10),
    ]

    direction_sign = 1 if direction.upper() == "PAY" else -1
    rate_sensitivity = 1 + min(abs(rate_delta_bps) / 50, 0.35)
    profile = []

    for label, year in buckets:
        long_horizon = 10
        shape = math.sin(min(year / long_horizon, 1) * math.pi) ** 0.88
        current_epe = existing_notional * 0.060 * shape
        trade_shape = math.sin(min(year / max(maturity_years, 0.25), 1) * math.pi) ** 1.20
        trade_increment = trade_notional * 0.115 * trade_shape * rate_sensitivity * direction_sign
        epe_new_trade = max(current_epe + trade_increment, 0)
        pfe_95 = max(epe_new_trade * 1.68, current_epe * 1.62)
        bucket_date = valuation_date + timedelta(days=int(365 * year))

        profile.append(
            {
                "label": label,
                "date": str(bucket_date),
                "year": round(year, 4),
                "show_tick": True,
                "epe_current": round(current_epe, 2),
                "epe_new_trade": round(epe_new_trade, 2),
                "pfe_95": round(pfe_95, 2),
            }
        )

    return profile


def maturity_to_years(maturity: str) -> float:
    return {"1Y": 1, "2Y": 2, "3Y": 3, "5Y": 5, "7Y": 7, "10Y": 10}.get(maturity, 5)


def normalise_rate_to_pct(rate: float) -> float:
    return rate * 100 if rate < 1 else rate


def get_par_rate(currency: str, maturity: str) -> float:
    return PAR_RATES.get(currency, PAR_RATES["USD"]).get(maturity, PAR_RATES.get(currency, PAR_RATES["USD"])["5Y"])


def to_bps(amount: float, notional: float) -> float:
    if notional == 0:
        return 0
    return amount / notional * 10000


PAR_RATES = {
    "USD": {"1Y": 4.85, "2Y": 4.62, "3Y": 4.48, "5Y": 4.28, "7Y": 4.22, "10Y": 4.18},
    "EUR": {"1Y": 3.35, "2Y": 3.18, "3Y": 3.05, "5Y": 2.94, "7Y": 2.91, "10Y": 2.88},
    "GBP": {"1Y": 4.70, "2Y": 4.43, "3Y": 4.31, "5Y": 4.18, "7Y": 4.10, "10Y": 4.02},
    "CHF": {"1Y": 1.38, "2Y": 1.30, "3Y": 1.25, "5Y": 1.20, "7Y": 1.18, "10Y": 1.15},
}
