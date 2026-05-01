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
    portfolio_specs = {
        "NS-MS-001": ("MS", 12, 1_950_000_000, "USD", "SOFR"),
        "NS-JPM-001": ("JPM", 16, 2_850_000_000, "USD", "SOFR"),
        "NS-DB-001": ("DB", 14, 2_100_000_000, "USD", "SOFR"),
        "NS-CITI-001": ("CITI", 10, 1_725_000_000, "USD", "SOFR"),
        "NS-GS-001": ("GS", 13, 2_350_000_000, "USD", "SOFR"),
        "NS-BARC-001": ("BARC", 11, 1_425_000_000, "GBP", "SONIA"),
        "NS-BNP-001": ("BNP", 9, 1_260_000_000, "EUR", "EURIBOR"),
        "NS-UBS-001": ("UBS", 8, 875_000_000, "CHF", "SARON"),
    }

    maturity_cycle = [1, 2, 3, 5, 7, 10, 4, 6, 8, 12, 2, 3, 5, 9, 11, 6]
    direction_cycle = ["PAY", "RECEIVE", "PAY", "RECEIVE", "PAY", "RECEIVE"]

    for netting_set_id, (prefix, trade_count, total_notional, currency, floating_index) in portfolio_specs.items():
        base_notional = total_notional / trade_count
        for index in range(1, trade_count + 1):
            maturity_years = maturity_cycle[(index - 1) % len(maturity_cycle)]
            direction = direction_cycle[(index - 1) % len(direction_cycle)]
            notional = round(base_notional * (0.85 + ((index % 5) * 0.075)), 2)
            fixed_rate = seeded_fixed_rate(currency, maturity_years, index)

            db.add(
                IrsTrade(
                    trade_id=f"IRS-{prefix}-{index:03d}",
                    external_trade_id=f"{prefix}-IRS-{index:03d}",
                    netting_set_id=netting_set_id,
                    notional=notional,
                    currency=currency,
                    trade_date=valuation_date - timedelta(days=90 + index),
                    effective_date=valuation_date - timedelta(days=88 + index),
                    maturity_date=valuation_date + timedelta(days=365 * maturity_years),
                    fixed_rate=fixed_rate / 100,
                    floating_index=floating_index,
                    pay_receive_fixed=direction,
                )
            )


def seeded_fixed_rate(currency: str, maturity_years: int, index: int) -> float:
    base = {
        "USD": 4.28,
        "EUR": 2.94,
        "GBP": 4.18,
        "CHF": 1.20,
    }.get(currency, 4.28)
    maturity_adjustment = min(maturity_years, 10) * -0.015
    trade_adjustment = ((index % 4) - 1.5) * 0.035
    return round(base + maturity_adjustment + trade_adjustment, 4)
