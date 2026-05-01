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

        par_rate_curves = {
            "USD": {"1Y": 4.86, "2Y": 4.64, "3Y": 4.49, "5Y": 4.29, "7Y": 4.23, "10Y": 4.19},
            "EUR": {"1Y": 4.12, "2Y": 3.91, "3Y": 3.77, "5Y": 3.59, "7Y": 3.48, "10Y": 3.37},
            "GBP": {"1Y": 4.73, "2Y": 4.45, "3Y": 4.32, "5Y": 4.17, "7Y": 4.09, "10Y": 4.01},
            "CHF": {"1Y": 1.91, "2Y": 1.77, "3Y": 1.68, "5Y": 1.54, "7Y": 1.47, "10Y": 1.41},
        }

        discount_curve_defs = [
            ("USD", "SOFR"),
            ("EUR", "EURIBOR"),
            ("GBP", "SONIA"),
            ("CHF", "SARON"),
        ]

        tenor_years = {"1Y": 1, "2Y": 2, "3Y": 3, "5Y": 5, "7Y": 7, "10Y": 10}

        for currency, floating_index in discount_curve_defs:
            curve_id = f"CURVE-{currency}-DISCOUNT-001"

            db.add(
                Curve(
                    curve_id=curve_id,
                    market_data_snapshot_id="MD-001",
                    curve_type="DISCOUNT",
                    curve_name=f"{currency} {floating_index} Discount / Par",
                    currency=currency,
                    floating_index=floating_index,
                )
            )

            for tenor, years in tenor_years.items():
                par_rate_pct = par_rate_curves[currency][tenor]
                annual_rate = par_rate_pct / 100
                discount_factor = 1 / ((1 + annual_rate) ** years)

                db.add(
                    CurvePoint(
                        curve_point_id=f"{curve_id}-{tenor}-DF",
                        curve_id=curve_id,
                        tenor=tenor,
                        maturity_date=valuation_date + timedelta(days=365 * years),
                        value=round(discount_factor, 6),
                        value_type="DISCOUNT_FACTOR",
                    )
                )
                db.add(
                    CurvePoint(
                        curve_point_id=f"{curve_id}-{tenor}-PAR",
                        curve_id=curve_id,
                        tenor=tenor,
                        maturity_date=valuation_date + timedelta(days=365 * years),
                        value=par_rate_pct,
                        value_type="PAR_RATE_PCT",
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

            for tenor, years in tenor_years.items():
                spread = credit_spreads[cp_id] * (1 + 0.035 * math.log1p(years))
                db.add(
                    CurvePoint(
                        curve_point_id=f"{curve_id}-{tenor}",
                        curve_id=curve_id,
                        tenor=tenor,
                        maturity_date=valuation_date + timedelta(days=365 * years),
                        value=round(spread, 6),
                        value_type="CREDIT_SPREAD",
                    )
                )

            recovery_by_currency = {"USD": 0.40, "EUR": 0.38, "GBP": 0.41, "CHF": 0.42}
            db.add(
                RecoveryRate(
                    recovery_rate_id=f"REC-{cp_id}",
                    counterparty_id=cp_id,
                    market_data_snapshot_id="MD-001",
                    recovery_rate=recovery_by_currency.get(base_currency, 0.40),
                )
            )

        trade_maturity_ladder = [1, 2, 3, 5, 7, 10]
        direction_ladder = ["PAY", "RECEIVE"]
        notional_ladder = [25_000_000, 40_000_000, 55_000_000, 75_000_000, 100_000_000, 125_000_000]
        base_trade_counts = {
            "CP-001": 58,
            "CP-002": 64,
            "CP-003": 51,
            "CP-004": 46,
            "CP-005": 55,
            "CP-006": 38,
            "CP-007": 44,
            "CP-008": 34,
        }

        for cp_id, _name, _lei, base_currency in counterparties:
            netting_set_id = f"NS-{cp_id}"
            floating_index = {
                "USD": "SOFR",
                "EUR": "EURIBOR",
                "GBP": "SONIA",
                "CHF": "SARON",
            }.get(base_currency, "SOFR")

            for i in range(base_trade_counts[cp_id]):
                years = trade_maturity_ladder[(i + len(cp_id)) % len(trade_maturity_ladder)]
                notional = notional_ladder[(i * 2 + len(base_currency)) % len(notional_ladder)]
                direction = direction_ladder[i % 2]
                par_rate = par_rate_curves[base_currency][f"{years}Y"]
                rate_offset = ((i % 7) - 3) * 0.035
                fixed_rate = round((par_rate + rate_offset) / 100, 6)

                db.add(
                    IrsTrade(
                        trade_id=f"TRD-{cp_id}-{i + 1:03d}",
                        external_trade_id=f"M7-{base_currency}-{cp_id[-3:]}-{i + 1:05d}",
                        netting_set_id=netting_set_id,
                        notional=notional,
                        currency=base_currency,
                        trade_date=valuation_date - timedelta(days=7 + (i % 19)),
                        effective_date=valuation_date - timedelta(days=i % 5),
                        maturity_date=valuation_date + timedelta(days=365 * years),
                        fixed_rate=fixed_rate,
                        floating_index=floating_index,
                        pay_receive_fixed=direction,
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
                "irs_trades": db.query(IrsTrade).count(),
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
# CALCULATE (INCREMENTAL XVA CONTRACT)
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
        maturity_years = maturity_to_years(payload.get("maturity", "5Y"))
        notional = float(payload.get("notional", 0) or 0)
        fixed_rate_input = float(payload.get("fixed_rate", 0) or 0)
        fixed_rate_pct = fixed_rate_input if fixed_rate_input > 1 else fixed_rate_input * 100

        existing_trades = db.query(IrsTrade).filter(
            IrsTrade.netting_set_id == netting_set.netting_set_id
        ).all()

        existing_notional = sum(float(t.notional or 0) for t in existing_trades)
        existing_trade_count = len(existing_trades)

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

        recovery = db.query(RecoveryRate).filter(
            RecoveryRate.counterparty_id == counterparty.counterparty_id
        ).first()

        if not recovery:
            raise HTTPException(404, "Recovery rate not found for selected counterparty. Run /mvp/seed first.")

        credit_point = db.query(CurvePoint).filter(
            CurvePoint.curve_id == credit_curve.curve_id,
            CurvePoint.tenor == payload.get("maturity", "5Y"),
        ).first() or db.query(CurvePoint).filter(
            CurvePoint.curve_id == credit_curve.curve_id
        ).first()

        discount_point = db.query(CurvePoint).filter(
            CurvePoint.curve_id == discount_curve.curve_id,
            CurvePoint.tenor == payload.get("maturity", "5Y"),
        ).first() or db.query(CurvePoint).filter(
            CurvePoint.curve_id == discount_curve.curve_id
        ).first()

        credit_spread = float(credit_point.value if credit_point else 0.0125)
        discount_factor = float(discount_point.value if discount_point else 0.84)
        recovery_rate = float(recovery.recovery_rate)
        lgd = 1 - recovery_rate

        par_rate_curves = {
            "USD": {"1Y": 4.85, "2Y": 4.62, "3Y": 4.48, "5Y": 4.28, "7Y": 4.22, "10Y": 4.18},
            "EUR": {"1Y": 4.15, "2Y": 3.92, "3Y": 3.78, "5Y": 3.58, "7Y": 3.47, "10Y": 3.36},
            "GBP": {"1Y": 4.70, "2Y": 4.43, "3Y": 4.31, "5Y": 4.18, "7Y": 4.10, "10Y": 4.02},
            "CHF": {"1Y": 1.92, "2Y": 1.78, "3Y": 1.69, "5Y": 1.55, "7Y": 1.48, "10Y": 1.42},
        }
        par_rates = par_rate_curves.get(currency, par_rate_curves["USD"])
        par_rate_pct = par_rates.get(payload.get("maturity", "5Y"), par_rates["5Y"])
        rate_delta_bps = round((fixed_rate_pct - par_rate_pct) * 100, 1)

        run_id = f"RUN-{uuid.uuid4()}"
        valuation_date = snapshot.valuation_date

        tenors = [
            (1 / 12, "1m", True),
            (0.25, "3m", True),
            (0.50, "6m", True),
            (1.00, "1Y", True),
            (2.00, "2Y", True),
            (3.00, "3Y", True),
            (5.00, "5Y", True),
            (7.00, "7Y", True),
            (10.00, "10Y", True),
        ]

        current_peak = max(existing_notional * 0.060, 1.0)
        incremental_peak = max(notional * 0.085, 0.0)

        exposure_profile = []
        exposure_rows = []

        for year, label, show_tick in tenors:
            current_progress = min(max(year / 10.0, 0), 1)
            current_shape = math.sin(current_progress * math.pi) ** 1.15
            epe_current = current_peak * current_shape

            if year <= maturity_years:
                new_progress = min(max(year / maturity_years, 0), 1)
                new_shape = math.sin(new_progress * math.pi) ** 1.30
            else:
                new_shape = 0

            epe_new_trade = epe_current + (incremental_peak * new_shape)
            pfe_95 = epe_current * 1.68
            bucket_date = valuation_date + timedelta(days=int(365 * year))

            point = {
                "year": year,
                "label": label,
                "date": str(bucket_date),
                "show_tick": show_tick,
                "epe_current": round(epe_current, 2),
                "epe_new_trade": round(epe_new_trade, 2),
                "pfe_95": round(pfe_95, 2),
            }
            exposure_profile.append(point)

            exposure_rows.append(
                ExposureProfile(
                    exposure_profile_id=str(uuid.uuid4()),
                    calculation_run_id=run_id,
                    time_bucket_date=bucket_date,
                    expected_exposure=round(epe_new_trade, 2),
                    expected_positive_exposure=round(epe_new_trade, 2),
                    pfe=round(pfe_95, 2),
                    discount_factor=discount_factor,
                    marginal_default_probability=round(credit_spread * year, 6),
                )
            )

        cva_incremental = -notional * credit_spread * lgd * maturity_years * discount_factor * 0.030
        dva_incremental = abs(cva_incremental) * 0.145
        fva_incremental = -notional * maturity_years * 0.000060
        total_xva_charge = cva_incremental + dva_incremental + fva_incremental

        def to_bps(amount):
            return round((amount / notional) * 10000, 1) if notional else 0

        run = CalculationRun(
            calculation_run_id=run_id,
            run_type="INCREMENTAL_XVA",
            netting_set_id=netting_set.netting_set_id,
            market_data_snapshot_id=snapshot.market_data_snapshot_id,
            csa_id=csa.csa_id,
            valuation_date=valuation_date,
            status="CALCULATED",
            model_version="M7-XVA-MVP-1",
        )

        result = CvaResult(
            cva_result_id=str(uuid.uuid4()),
            calculation_run_id=run_id,
            cva_amount=round(cva_incremental, 2),
            currency=currency,
            cs01=round(abs(cva_incremental) * 0.011, 2),
        )

        db.add(run)
        db.add_all(exposure_rows)
        db.add(result)
        db.commit()

        return {
            "calculation_run_id": run_id,
            "cva_incremental": round(cva_incremental, 2),
            "cva_bps": to_bps(cva_incremental),
            "dva_incremental": round(dva_incremental, 2),
            "dva_bps": to_bps(dva_incremental),
            "fva_incremental": round(fva_incremental, 2),
            "fva_bps": to_bps(fva_incremental),
            "total_xva_charge": round(total_xva_charge, 2),
            "total_xva_bps": to_bps(total_xva_charge),
            "cs01": round(abs(cva_incremental) * 0.011, 2),
            "par_rate_pct": par_rate_pct,
            "rate_delta_bps": rate_delta_bps,
            "confidence": "Moderate",
            "approx_trades": 23,
            "approx_pct": 2.1,
            "exposure_profile": exposure_profile,
            "netting_set": {
                "id": netting_set.netting_set_id,
                "existing_trades": existing_trade_count,
                "existing_notional": round(existing_notional, 2),
                "base_currency": netting_set.base_currency,
            },
            "netting_set_composition": [
                {
                    "label": f"{existing_trade_count} existing",
                    "notional": round(existing_notional, 2),
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
                    "notional": round(notional, 2),
                    "source": "Interpolated",
                    "maturities": payload.get("maturity", "5Y"),
                },
            ],
            "par_rates": par_rates,
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
