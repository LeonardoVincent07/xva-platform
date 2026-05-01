from fastapi import APIRouter, HTTPException
from datetime import date, timedelta
import uuid
import math

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

        for cp_id, name, lei, _ in counterparties:
            db.add(Counterparty(counterparty_id=cp_id, name=name, lei=lei))

        db.flush()

        for cp_id, _, _, base_currency in counterparties:
            netting_set_id = f"NS-{cp_id}"
            csa_id = f"CSA-{cp_id}"

            db.add(NettingSet(
                netting_set_id=netting_set_id,
                counterparty_id=cp_id,
                base_currency=base_currency
            ))

            db.add(CsaAgreement(
                csa_id=csa_id,
                netting_set_id=netting_set_id,
                threshold_amount=0,
                minimum_transfer_amount=0,
                margin_frequency="DAILY",
                margin_lag_days=1,
                collateral_currency=base_currency
            ))

        db.add(MarketDataSnapshot(
            market_data_snapshot_id="MD-001",
            valuation_date=valuation_date,
            source_system="MVP-SEED"
        ))

        db.flush()

        discount_curve_defs = [
            ("USD", "SOFR", 0.86),
            ("EUR", "EURIBOR", 0.89),
            ("GBP", "SONIA", 0.87),
            ("CHF", "SARON", 0.92),
        ]

        for currency, floating_index, df in discount_curve_defs:
            curve_id = f"CURVE-{currency}-DISCOUNT-001"

            db.add(Curve(
                curve_id=curve_id,
                market_data_snapshot_id="MD-001",
                curve_type="DISCOUNT",
                curve_name=f"{currency} {floating_index} Discount",
                currency=currency,
                floating_index=floating_index
            ))

            db.add(CurvePoint(
                curve_point_id=f"{curve_id}-5Y",
                curve_id=curve_id,
                tenor="5Y",
                maturity_date=valuation_date + timedelta(days=365 * 5),
                value=df,
                value_type="DISCOUNT_FACTOR"
            ))

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

        for cp_id, name, _, base_currency in counterparties:
            curve_id = f"CURVE-{cp_id}-CREDIT"

            db.add(Curve(
                curve_id=curve_id,
                market_data_snapshot_id="MD-001",
                curve_type="CREDIT",
                curve_name=f"{name} Credit Curve",
                currency=base_currency,
                counterparty_id=cp_id
            ))

            db.add(CurvePoint(
                curve_point_id=f"{curve_id}-5Y",
                curve_id=curve_id,
                tenor="5Y",
                maturity_date=valuation_date + timedelta(days=365 * 5),
                value=credit_spreads[cp_id],
                value_type="CREDIT_SPREAD"
            ))

            db.add(RecoveryRate(
                recovery_rate_id=f"REC-{cp_id}",
                counterparty_id=cp_id,
                market_data_snapshot_id="MD-001",
                recovery_rate=0.4
            ))

        db.commit()
        return {"status": "reset_and_seeded"}

    finally:
        db.close()


# ========================================
# CALCULATE (ONLY CHANGE BELOW)
# ========================================
@router.post("/screens/screen1/calculate")
def calculate_screen1(payload: dict):
    db = SessionLocal()

    try:
        counterparty = db.query(Counterparty).filter(
            Counterparty.counterparty_id == payload["counterparty_id"]
        ).first()

        netting_set = db.query(NettingSet).filter(
            NettingSet.counterparty_id == counterparty.counterparty_id
        ).first()

        csa = db.query(CsaAgreement).filter(
            CsaAgreement.netting_set_id == netting_set.netting_set_id
        ).first()

        snapshot = db.query(MarketDataSnapshot).first()

        discount_curve = db.query(Curve).filter(
            Curve.curve_type == "DISCOUNT"
        ).first()

        credit_curve = db.query(Curve).filter(
            Curve.curve_type == "CREDIT"
        ).first()

        discount_point = db.query(CurvePoint).filter(
            CurvePoint.curve_id == discount_curve.curve_id
        ).first()

        credit_point = db.query(CurvePoint).filter(
            CurvePoint.curve_id == credit_curve.curve_id
        ).first()

        recovery = db.query(RecoveryRate).first()

        notional = float(payload["notional"])
        maturity_years = maturity_to_years(payload["maturity"])

        epe = notional * 0.02
        valuation_date = snapshot.valuation_date

        # ========================
        # FIXED EXPOSURE PROFILE
        # ========================
        run_id = f"RUN-{uuid.uuid4()}"
        profile = []

        bucket_years = [i / 4 for i in range(1, maturity_years * 4 + 1)]

        for i, year in enumerate(bucket_years):

            progress = year / maturity_years
            shape_factor = math.sin(progress * math.pi) ** 1.3

            bucket_epe = epe * shape_factor
            bucket_date = valuation_date + timedelta(days=int(365 * year))

            profile.append({
                "year": year,
                "date": str(bucket_date),
                "epe": round(bucket_epe, 2)
            })

        return {
            "cva_amount": round(epe, 2),
            "cs01": round(epe * 0.01, 2),
            "calculation_run_id": run_id,
            "exposure_profile": profile,
        }

    finally:
        db.close()


def maturity_to_years(m):
    return {"1Y": 1, "2Y": 2, "3Y": 3, "5Y": 5, "10Y": 10}.get(m, 5)