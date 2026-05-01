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
# SEED (UNCHANGED)
# ========================================
@router.post("/mvp/seed")
def seed_mvp_dataset():
    # KEEP YOUR EXISTING SEED FUNCTION EXACTLY AS IS
    from backend.app.modules.screens.seed import seed_mvp_dataset as seed_func
    return seed_func()


# ========================================
# OPTIONS (SCREEN 1)
# ========================================
@router.get("/screens/screen1/options")
def get_screen1_options():
    db = SessionLocal()
    try:
        counterparties = db.query(Counterparty).all()
        netting_sets = db.query(NettingSet).all()

        currencies = list(set([n.base_currency for n in netting_sets]))

        return {
            "counterparties": [
                {"id": c.counterparty_id, "name": c.name}
                for c in counterparties
            ],
            "instruments": ["IRS"],
            "currencies": currencies if currencies else ["GBP"],
            "maturities": ["1Y", "2Y", "5Y", "10Y"],
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
            raise HTTPException(404, "Counterparty not found")

        netting_set = db.query(NettingSet).filter(
            NettingSet.counterparty_id == counterparty.counterparty_id
        ).first()

        csa = db.query(CsaAgreement).filter(
            CsaAgreement.netting_set_id == netting_set.netting_set_id
        ).first()

        snapshot = db.query(MarketDataSnapshot).first()

        discount_curve = db.query(Curve).filter(
            Curve.market_data_snapshot_id == snapshot.market_data_snapshot_id,
            Curve.curve_type == "DISCOUNT"
        ).first()

        credit_curve = db.query(Curve).filter(
            Curve.curve_type == "CREDIT",
            Curve.counterparty_id == counterparty.counterparty_id
        ).first()

        discount_point = db.query(CurvePoint).filter(
            CurvePoint.curve_id == discount_curve.curve_id
        ).first()

        credit_point = db.query(CurvePoint).filter(
            CurvePoint.curve_id == credit_curve.curve_id
        ).first()

        recovery = db.query(RecoveryRate).filter(
            RecoveryRate.counterparty_id == counterparty.counterparty_id
        ).first()

        # ========================
        # CORE CALCULATION
        # ========================
        notional = payload["notional"]
        maturity_years = maturity_to_years(payload["maturity"])
        fixed_rate = payload["fixed_rate"]

        par_rate = 0.035
        spread = abs(fixed_rate - par_rate)

        base_epe = notional * (0.01 * maturity_years + spread * 2.0)
        epe = max(base_epe - csa.threshold_amount, 0)

        discount_factor = discount_point.value
        credit_spread = credit_point.value
        lgd = 1 - recovery.recovery_rate

        mdp = credit_spread * maturity_years
        cva = epe * mdp * lgd * discount_factor
        cs01 = cva * 0.011

        valuation_date = snapshot.valuation_date

        # ========================
        # BUILD EXPOSURE PROFILE (REAL GRAPH)
        # ========================
        profile = []

        # Semi-annual MVP IRS-style exposure profile:
        # smooth rounded rise, peak around mid-life, then decay into maturity.
        # Also return a readable bucket label for the frontend x-axis.
        import math

        bucket_years = [
            round(i * 0.5, 2)
            for i in range(1, int(maturity_years * 2) + 1)
        ]

        for year in bucket_years:
            progress = year / maturity_years
            shape_factor = 0.15 + 0.85 * math.sin(progress * math.pi)

            bucket_epe = epe * shape_factor
            bucket_pfe = bucket_epe * 2.5
            bucket_date = valuation_date + timedelta(days=int(365 * year))
            bucket_label = f"{year:g}Y"

            profile.append({
                "year": year,
                "label": bucket_label,
                "date": str(bucket_date),
                "epe": round(bucket_epe, 2),
                "pfe": round(bucket_pfe, 2),
            })

        # ========================
        # STORE RUN
        # ========================
        run_id = f"RUN-{uuid.uuid4()}"

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
            currency=payload["currency"],
            cs01=round(cs01, 2),
        )

        db.add(run)
        db.add(result)
        db.commit()

        # ========================
        # RESPONSE
        # ========================
        return {
            "cva_amount": round(cva, 2),
            "cs01": round(cs01, 2),
            "calculation_run_id": run_id,
            "exposure_profile": profile
        }

    finally:
        db.close()


# ========================================
# SUMMARY (UNCHANGED)
# ========================================
@router.get("/mvp/summary")
def get_mvp_summary():
    db = SessionLocal()
    try:
        return {
            "counterparties": db.query(Counterparty).count(),
            "netting_sets": db.query(NettingSet).count(),
            "cva_results": db.query(CvaResult).count(),
        }
    finally:
        db.close()


# ========================================
# HELPERS
# ========================================
def maturity_to_years(m):
    return {"1Y": 1, "2Y": 2, "5Y": 5, "10Y": 10}.get(m, 5)