from fastapi import APIRouter, HTTPException
from datetime import date, timedelta
import uuid

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

router = APIRouter(tags=["mvp"])


# ========================================
# SEED
# ========================================
@router.post("/mvp/seed")
def seed_mvp_dataset():
    db = SessionLocal()

    try:
        valuation_date = date.today()

        # Reset demo data deterministically. This is MVP/demo behaviour only.
        # It avoids stale rows from previous seed runs fighting current code.
        db.query(CvaResult).delete()
        db.query(ExposureProfile).delete()
        db.query(CalculationRun).delete()
        db.query(IrsTrade).delete()
        db.query(RecoveryRate).delete()
        db.query(CurvePoint).delete()
        db.query(Curve).delete()
        db.query(CsaAgreement).delete()
        db.query(NettingSet).delete()
        db.query(Counterparty).delete()
        db.query(MarketDataSnapshot).delete()
        db.commit()

        counterparties = [
            ("CP-001", "Morgan Stanley", "MSIPGB2LXXX", "USD"),
            ("CP-002", "J.P. Morgan", "CHASGB2LXXX", "USD"),
            ("CP-003", "Deutsche Bank", "DEUTDEFFXXX", "EUR"),
            ("CP-004", "Citigroup", "CITIGB2LXXX", "USD"),
            ("CP-005", "Goldman Sachs", "GSGLGB2LXXX", "USD"),
            ("CP-006", "Barclays", "BARCGB22XXX", "GBP"),
            ("CP-007", "BNP Paribas", "BNPAFRPPXXX", "EUR"),
            ("CP-008", "UBS", "UBSWCHZH80A", "CHF"),
        ]

        for cp_id, name, lei, _base_currency in counterparties:
            db.add(
                Counterparty(
                    counterparty_id=cp_id,
                    name=name,
                    lei=lei,
                )
            )

        db.flush()

        for cp_id, _name, _lei, base_currency in counterparties:
            netting_set_id = f"NS-{cp_id}"
            csa_id = f"CSA-{cp_id}"

            db.add(
                NettingSet(
                    netting_set_id=netting_set_id,
                    counterparty_id=cp_id,
                    base_currency=base_currency,
                )
            )

            db.add(
                CsaAgreement(
                    csa_id=csa_id,
                    netting_set_id=netting_set_id,
                    threshold_amount=0,
                    minimum_transfer_amount=0,
                    margin_frequency="DAILY",
                    margin_lag_days=1,
                    collateral_currency=base_currency,
                )
            )

        db.add(
            MarketDataSnapshot(
                market_data_snapshot_id="MD-001",
                valuation_date=valuation_date,
                source_system="MVP-SEED",
            )
        )

        db.flush()

        discount_curve_defs = [
            ("USD", "SOFR", 0.86),
            ("EUR", "EURIBOR", 0.89),
            ("GBP", "SONIA", 0.87),
            ("CHF", "SARON", 0.92),
        ]

        for currency, floating_index, discount_factor in discount_curve_defs:
            curve_id = f"CURVE-{currency}-DISCOUNT-001"

            db.add(
                Curve(
                    curve_id=curve_id,
                    market_data_snapshot_id="MD-001",
                    curve_type="DISCOUNT",
                    curve_name=f"{currency} {floating_index} Discount",
                    currency=currency,
                    floating_index=floating_index,
                )
            )

            db.add(
                CurvePoint(
                    curve_point_id=f"{curve_id}-5Y",
                    curve_id=curve_id,
                    tenor="5Y",
                    maturity_date=valuation_date + timedelta(days=365 * 5),
                    value=discount_factor,
                    value_type="DISCOUNT_FACTOR",
                )
            )

        credit_spreads = {
            "CP-001": 0.0110,
            "CP-002": 0.0100,
            "CP-003": 0.0135,
            "CP-004": 0.0120,
            "CP-005": 0.0105,
            "CP-006": 0.0125,
            "CP-007": 0.0140,
            "CP-008": 0.0095,
        }

        for cp_id, name, _lei, base_currency in counterparties:
            curve_id = f"CURVE-{cp_id}-CREDIT"

            db.add(
                Curve(
                    curve_id=curve_id,
                    market_data_snapshot_id="MD-001",
                    curve_type="CREDIT",
                    curve_name=f"{name} Credit Curve",
                    currency=base_currency,
                    counterparty_id=cp_id,
                )
            )

            db.add(
                CurvePoint(
                    curve_point_id=f"{curve_id}-5Y",
                    curve_id=curve_id,
                    tenor="5Y",
                    maturity_date=valuation_date + timedelta(days=365 * 5),
                    value=credit_spreads[cp_id],
                    value_type="CREDIT_SPREAD",
                )
            )

            db.add(
                RecoveryRate(
                    recovery_rate_id=f"REC-{cp_id}",
                    counterparty_id=cp_id,
                    market_data_snapshot_id="MD-001",
                    recovery_rate=0.4,
                )
            )

        db.commit()

        return {
            "status": "reset_and_seeded",
            "totals": {
                "counterparties": db.query(Counterparty).count(),
                "netting_sets": db.query(NettingSet).count(),
                "csas": db.query(CsaAgreement).count(),
                "curves": db.query(Curve).count(),
                "curve_points": db.query(CurvePoint).count(),
                "recovery_rates": db.query(RecoveryRate).count(),
                "cva_results": db.query(CvaResult).count(),
            },
        }

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


# ========================================
# OPTIONS (SCREEN 1)
# ========================================
@router.get("/screens/screen1/options")
def get_screen1_options():
    db = SessionLocal()
    try:
        counterparties = db.query(Counterparty).order_by(Counterparty.name).all()
        netting_sets = db.query(NettingSet).all()

        currencies = sorted(set([n.base_currency for n in netting_sets]))

        return {
            "counterparties": [
                {"id": c.counterparty_id, "name": c.name}
                for c in counterparties
            ],
            "instruments": ["IRS", "OIS", "Cross-Currency Swap", "FX Forward"],
            "currencies": currencies if currencies else ["USD", "EUR", "GBP", "CHF"],
            "floating_indices": ["SOFR", "EURIBOR", "SONIA", "SARON"],
            "maturities": ["1Y", "2Y", "3Y", "5Y", "10Y"],
            "directions": ["PAY", "RECEIVE"],
        }
    finally:
        db.close()


# ========================================
# CALCULATE (REAL + GRAPH DATA)
# ========================================
@router.post("/screens/screen1/calculate")
def calculate_screen1(payload: dict):
    db = SessionLocal()

    try:
        counterparty = db.query(Counterparty).filter(
            Counterparty.counterparty_id == payload["counterparty_id"]
        ).first()

        if not counterparty:
            raise HTTPException(404, "Counterparty not found. Run /mvp/seed first.")

        netting_set = db.query(NettingSet).filter(
            NettingSet.counterparty_id == counterparty.counterparty_id
        ).first()

        if not netting_set:
            raise HTTPException(404, "Netting set not found for counterparty. Run /mvp/seed first.")

        csa = db.query(CsaAgreement).filter(
            CsaAgreement.netting_set_id == netting_set.netting_set_id
        ).first()

        if not csa:
            raise HTTPException(404, "CSA agreement not found for netting set. Run /mvp/seed first.")

        snapshot = db.query(MarketDataSnapshot).first()

        if not snapshot:
            raise HTTPException(404, "Market data snapshot not found. Run /mvp/seed first.")

        currency = payload.get("currency") or netting_set.base_currency

        discount_curve = db.query(Curve).filter(
            Curve.market_data_snapshot_id == snapshot.market_data_snapshot_id,
            Curve.curve_type == "DISCOUNT",
            Curve.currency == currency,
        ).first()

        if not discount_curve:
            raise HTTPException(404, f"Discount curve not found for {currency}. Run /mvp/seed first.")

        credit_curve = db.query(Curve).filter(
            Curve.curve_type == "CREDIT",
            Curve.counterparty_id == counterparty.counterparty_id,
        ).first()

        if not credit_curve:
            raise HTTPException(404, "Credit curve not found for selected counterparty. Run /mvp/seed first.")

        discount_point = db.query(CurvePoint).filter(
            CurvePoint.curve_id == discount_curve.curve_id
        ).first()

        if not discount_point:
            raise HTTPException(404, "Discount curve point not found. Run /mvp/seed first.")

        credit_point = db.query(CurvePoint).filter(
            CurvePoint.curve_id == credit_curve.curve_id
        ).first()

        if not credit_point:
            raise HTTPException(404, "Credit curve point not found. Run /mvp/seed first.")

        recovery = db.query(RecoveryRate).filter(
            RecoveryRate.counterparty_id == counterparty.counterparty_id
        ).first()

        if not recovery:
            raise HTTPException(404, "Recovery rate not found for selected counterparty. Run /mvp/seed first.")

        # ========================
        # CORE CALCULATION
        # ========================
        notional = float(payload["notional"])
        maturity_years = maturity_to_years(payload["maturity"])
        fixed_rate_input = float(payload["fixed_rate"])
        fixed_rate = fixed_rate_input / 100 if fixed_rate_input > 1 else fixed_rate_input

        par_rate = 0.035
        spread = abs(fixed_rate - par_rate)

        base_epe = notional * (0.01 * maturity_years + spread * 2.0)
        epe = max(base_epe - float(csa.threshold_amount), 0)

        discount_factor = float(discount_point.value)
        credit_spread = float(credit_point.value)
        lgd = 1 - float(recovery.recovery_rate)

        mdp = credit_spread * maturity_years
        cva = epe * mdp * lgd * discount_factor
        cs01 = cva * 0.011

        valuation_date = snapshot.valuation_date

        # ========================
        # BUILD AND STORE EXPOSURE PROFILE
        # ========================
        run_id = f"RUN-{uuid.uuid4()}"
        profile = []
        exposure_rows = []
        bucket_years = sorted(set([1, 2, 3, maturity_years]))

        for i, year in enumerate(bucket_years):
            # Simple MVP IRS-style profile: rises through mid-life then stabilises.
            shape_factor = 0.35 + (0.20 * i)
            bucket_epe = epe * shape_factor
            bucket_pfe = bucket_epe * 2.5
            bucket_date = valuation_date + timedelta(days=365 * int(year))

            profile.append({
                "year": year,
                "date": str(bucket_date),
                "epe": round(bucket_epe, 2),
                "pfe": round(bucket_pfe, 2),
            })

            exposure_rows.append(
                ExposureProfile(
                    exposure_profile_id=str(uuid.uuid4()),
                    calculation_run_id=run_id,
                    time_bucket_date=bucket_date,
                    expected_exposure=round(bucket_epe, 2),
                    expected_positive_exposure=round(bucket_epe, 2),
                    pfe=round(bucket_pfe, 2),
                    discount_factor=discount_factor,
                    marginal_default_probability=round(credit_spread * year, 6),
                )
            )

        # ========================
        # STORE RUN + RESULT
        # ========================
        run = CalculationRun(
            calculation_run_id=run_id,
            run_type="CVA",
            netting_set_id=netting_set.netting_set_id,
            market_data_snapshot_id=snapshot.market_data_snapshot_id,
            csa_id=csa.csa_id,
            valuation_date=valuation_date,
            status="CALCULATED",
            model_version="MVP-REAL-1",
        )

        result = CvaResult(
            cva_result_id=str(uuid.uuid4()),
            calculation_run_id=run_id,
            cva_amount=round(cva, 2),
            currency=currency,
            cs01=round(cs01, 2),
        )

        db.add(run)
        db.add_all(exposure_rows)
        db.add(result)
        db.commit()

        return {
            "cva_amount": round(cva, 2),
            "cs01": round(cs01, 2),
            "calculation_run_id": run_id,
            "exposure_profile": profile,
        }

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


# ========================================
# SUMMARY
# ========================================
@router.get("/mvp/summary")
def get_mvp_summary():
    db = SessionLocal()
    try:
        return {
            "counterparties": db.query(Counterparty).count(),
            "netting_sets": db.query(NettingSet).count(),
            "csas": db.query(CsaAgreement).count(),
            "curves": db.query(Curve).count(),
            "curve_points": db.query(CurvePoint).count(),
            "recovery_rates": db.query(RecoveryRate).count(),
            "calculation_runs": db.query(CalculationRun).count(),
            "exposure_profiles": db.query(ExposureProfile).count(),
            "cva_results": db.query(CvaResult).count(),
        }
    finally:
        db.close()


# ========================================
# HELPERS
# ========================================
def maturity_to_years(m):
    return {"1Y": 1, "2Y": 2, "3Y": 3, "5Y": 5, "10Y": 10}.get(m, 5)
