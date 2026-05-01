from fastapi import APIRouter
from datetime import date, timedelta

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


@router.post("/mvp/seed")
def seed_mvp_dataset():
    db = SessionLocal()

    try:
        valuation_date = date.today()

        # Reset deterministic MVP/demo data only.
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
            ("CP-001", "Morgan Stanley", "MSIPGB2LXXX", "USD", "NS-MS-001"),
            ("CP-002", "J.P. Morgan", "CHASGB2LXXX", "USD", "NS-JPM-001"),
            ("CP-003", "Deutsche Bank AG", "DEUTDEFFXXX", "USD", "NS-DB-001"),
            ("CP-004", "Citigroup", "CITIGB2LXXX", "USD", "NS-CITI-001"),
            ("CP-005", "Goldman Sachs", "GSGLGB2LXXX", "USD", "NS-GS-001"),
            ("CP-006", "Barclays", "BARCGB22XXX", "GBP", "NS-BARC-001"),
            ("CP-007", "BNP Paribas", "BNPAFRPPXXX", "EUR", "NS-BNP-001"),
            ("CP-008", "UBS", "UBSWCHZH80A", "CHF", "NS-UBS-001"),
        ]

        for cp_id, name, lei, _base_currency, _netting_set_id in counterparties:
            db.add(Counterparty(counterparty_id=cp_id, name=name, lei=lei))

        db.flush()

        for cp_id, _name, _lei, base_currency, netting_set_id in counterparties:
            db.add(
                NettingSet(
                    netting_set_id=netting_set_id,
                    counterparty_id=cp_id,
                    base_currency=base_currency,
                )
            )
            db.add(
                CsaAgreement(
                    csa_id=f"CSA-{netting_set_id}",
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
            "USD": {"index": "SOFR", "rates": {"1Y": 4.85, "2Y": 4.62, "3Y": 4.48, "5Y": 4.28, "7Y": 4.22, "10Y": 4.18}},
            "EUR": {"index": "EURIBOR", "rates": {"1Y": 3.35, "2Y": 3.18, "3Y": 3.05, "5Y": 2.94, "7Y": 2.91, "10Y": 2.88}},
            "GBP": {"index": "SONIA", "rates": {"1Y": 4.70, "2Y": 4.43, "3Y": 4.31, "5Y": 4.18, "7Y": 4.10, "10Y": 4.02}},
            "CHF": {"index": "SARON", "rates": {"1Y": 1.38, "2Y": 1.30, "3Y": 1.25, "5Y": 1.20, "7Y": 1.18, "10Y": 1.15}},
        }

        for currency, curve_def in par_rate_curves.items():
            curve_id = f"CURVE-{currency}-DISCOUNT-001"
            db.add(
                Curve(
                    curve_id=curve_id,
                    market_data_snapshot_id="MD-001",
                    curve_type="DISCOUNT",
                    curve_name=f"{currency} {curve_def['index']} Cube Snap",
                    currency=currency,
                    floating_index=curve_def["index"],
                )
            )
            for tenor, rate in curve_def["rates"].items():
                years = int(tenor.replace("Y", ""))
                db.add(
                    CurvePoint(
                        curve_point_id=f"{curve_id}-{tenor}",
                        curve_id=curve_id,
                        tenor=tenor,
                        maturity_date=valuation_date + timedelta(days=365 * years),
                        value=rate,
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

        for cp_id, name, _lei, base_currency, _netting_set_id in counterparties:
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

        seed_existing_irs_trades(db, valuation_date)

        db.commit()

        return {
            "status": "reset_and_seeded",
            "totals": {
                "counterparties": db.query(Counterparty).count(),
                "netting_sets": db.query(NettingSet).count(),
                "irs_trades": db.query(IrsTrade).count(),
                "csas": db.query(CsaAgreement).count(),
                "curves": db.query(Curve).count(),
                "curve_points": db.query(CurvePoint).count(),
                "recovery_rates": db.query(RecoveryRate).count(),
            },
        }

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


@router.get("/mvp/summary")
def get_mvp_summary():
    db = SessionLocal()
    try:
        return {
            "counterparties": db.query(Counterparty).count(),
            "netting_sets": db.query(NettingSet).count(),
            "irs_trades": db.query(IrsTrade).count(),
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


def seed_existing_irs_trades(db, valuation_date: date):
    trade_specs = [
        ("DB-IRS-001", 125_000_000, "USD", 0.0470, "SOFR", "PAY", 1),
        ("DB-IRS-002", 150_000_000, "USD", 0.0462, "SOFR", "RECEIVE", 2),
        ("DB-IRS-003", 175_000_000, "USD", 0.0450, "SOFR", "PAY", 3),
        ("DB-IRS-004", 200_000_000, "USD", 0.0428, "SOFR", "RECEIVE", 5),
        ("DB-IRS-005", 125_000_000, "USD", 0.0422, "SOFR", "PAY", 7),
        ("DB-IRS-006", 150_000_000, "USD", 0.0418, "SOFR", "RECEIVE", 10),
        ("DB-IRS-007", 175_000_000, "USD", 0.0435, "SOFR", "PAY", 4),
        ("DB-IRS-008", 150_000_000, "USD", 0.0440, "SOFR", "PAY", 6),
        ("DB-IRS-009", 125_000_000, "USD", 0.0415, "SOFR", "RECEIVE", 8),
        ("DB-IRS-010", 175_000_000, "USD", 0.0425, "SOFR", "PAY", 12),
        ("DB-IRS-011", 150_000_000, "USD", 0.0455, "SOFR", "RECEIVE", 2),
        ("DB-IRS-012", 150_000_000, "USD", 0.0448, "SOFR", "PAY", 3),
        ("DB-IRS-013", 125_000_000, "USD", 0.0430, "SOFR", "RECEIVE", 5),
        ("DB-IRS-014", 125_000_000, "USD", 0.0421, "SOFR", "PAY", 9),
    ]

    for index, (external_id, notional, currency, fixed_rate, floating_index, direction, maturity_years) in enumerate(trade_specs, start=1):
        db.add(
            IrsTrade(
                trade_id=f"IRS-DB-{index:03d}",
                external_trade_id=external_id,
                netting_set_id="NS-DB-001",
                notional=notional,
                currency=currency,
                trade_date=valuation_date - timedelta(days=90 + index),
                effective_date=valuation_date - timedelta(days=88 + index),
                maturity_date=valuation_date + timedelta(days=365 * maturity_years),
                fixed_rate=fixed_rate,
                floating_index=floating_index,
                pay_receive_fixed=direction,
            )
        )
