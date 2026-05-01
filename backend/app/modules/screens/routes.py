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
        currencies = get_available_currencies(db)

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
            "floating_indices": get_available_floating_indices(db),
            "maturities": ["1Y", "2Y", "3Y", "5Y", "7Y", "10Y"],
            "directions": ["PAY", "RECEIVE"],
            "par_rates": get_par_rates_from_db(db),
        }
    finally:
        db.close()


@router.get("/screen1/context/{counterparty_id}")
def get_screen1_context(counterparty_id: str, currency: str | None = None):
    db = SessionLocal()
    try:
        counterparty, netting_set, snapshot = get_counterparty_context(db, counterparty_id)
        base_currency = currency or netting_set.base_currency
        trades = get_existing_trades(db, netting_set.netting_set_id)
        profile = build_portfolio_profile(snapshot.valuation_date, trades, base_currency)

        return {
            "counterparty": {"id": counterparty.counterparty_id, "name": counterparty.name},
            "netting_set": build_netting_set_payload(netting_set, trades),
            "exposure_profile": profile,
            "netting_set_composition": build_composition_rows(trades, 0, None),
            "par_rates": get_par_rates_for_currency(db, base_currency),
        }
    finally:
        db.close()


@router.post("/screen1/calculate")
def calculate_from_screen1(request: Screen1Request):
    db = SessionLocal()

    try:
        counterparty, netting_set, snapshot = get_counterparty_context(db, request.counterparty_id)

        csa = db.query(CsaAgreement).filter(
            CsaAgreement.netting_set_id == netting_set.netting_set_id
        ).first()
        if not csa:
            raise HTTPException(status_code=404, detail="CSA agreement not found. Run /mvp/seed first.")

        credit_curve = db.query(Curve).filter(
            Curve.market_data_snapshot_id == snapshot.market_data_snapshot_id,
            Curve.curve_type == "CREDIT",
            Curve.counterparty_id == counterparty.counterparty_id,
        ).first()
        if not credit_curve:
            raise HTTPException(status_code=404, detail="Credit curve not found. Run /mvp/seed first.")

        credit_point = db.query(CurvePoint).filter(CurvePoint.curve_id == credit_curve.curve_id).first()
        if not credit_point:
            raise HTTPException(status_code=404, detail="Credit curve point not found. Run /mvp/seed first.")

        recovery = db.query(RecoveryRate).filter(
            RecoveryRate.counterparty_id == counterparty.counterparty_id,
            RecoveryRate.market_data_snapshot_id == snapshot.market_data_snapshot_id,
        ).first()
        if not recovery:
            raise HTTPException(status_code=404, detail="Recovery rate not found. Run /mvp/seed first.")

        maturity_years = maturity_to_years(request.maturity)
        fixed_rate_pct = normalise_rate_to_pct(request.fixed_rate)
        par_rate_pct = get_par_rate_from_db(db, request.currency, request.maturity)
        rate_delta_bps = round((fixed_rate_pct - par_rate_pct) * 100, 1)

        existing_trades = get_existing_trades(db, netting_set.netting_set_id)
        credit_spread = float(credit_point.value)
        lgd = 1.0 - float(recovery.recovery_rate)

        profile = build_incremental_profile(
            valuation_date=snapshot.valuation_date,
            existing_trades=existing_trades,
            currency=request.currency,
            trade_notional=request.notional,
            maturity_years=maturity_years,
            rate_delta_bps=rate_delta_bps,
            direction=request.direction,
        )

        incremental_epe = max(
            max(point["epe_new_trade"] - point["epe_current"], 0)
            for point in profile
        )
        cva_incremental = -abs(incremental_epe * credit_spread * lgd * maturity_years * 0.19)
        dva_incremental = abs(cva_incremental) * 0.146
        fva_incremental = -abs(cva_incremental) * 0.346
        total_xva_charge = cva_incremental + dva_incremental + fva_incremental

        run_id = f"RUN-{uuid.uuid4()}"
        maturity_date = snapshot.valuation_date + timedelta(days=int(365 * maturity_years))

        # Persist the run and its exposure profile. Do not add the proposed trade to the live
        # IRS trade table; this screen is an incremental pre-trade calculation.
        db.add(
            CalculationRun(
                calculation_run_id=run_id,
                run_type="INCREMENTAL_XVA",
                netting_set_id=netting_set.netting_set_id,
                market_data_snapshot_id=snapshot.market_data_snapshot_id,
                csa_id=csa.csa_id,
                valuation_date=snapshot.valuation_date,
                status="CALCULATED",
                model_version="MVP-INCREMENTAL-XVA-0.2",
            )
        )
        db.flush()

        db.add_all(
            [
                ExposureProfile(
                    exposure_profile_id=f"EXP-{uuid.uuid4()}",
                    calculation_run_id=run_id,
                    time_bucket_date=date.fromisoformat(point["date"]),
                    expected_exposure=point["epe_new_trade"],
                    expected_positive_exposure=point["epe_new_trade"],
                    pfe=point["pfe_95"],
                    discount_factor=0.89,
                    marginal_default_probability=round(credit_spread * point["year"] / max(maturity_years, 1), 6),
                )
                for point in profile
            ]
        )
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
            "valuation_date": str(snapshot.valuation_date),
            "maturity_date": str(maturity_date),
            "counterparty": {"id": counterparty.counterparty_id, "name": counterparty.name},
            "netting_set": build_netting_set_payload(netting_set, existing_trades),
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
            "approx_trades": max(2, round(len(existing_trades) * 0.18)),
            "approx_pct": round(max(1.1, min(3.4, len(existing_trades) * 0.14)), 1),
            "exposure_profile": profile,
            "netting_set_composition": build_composition_rows(existing_trades, request.notional, request.maturity),
            "par_rates": get_par_rates_for_currency(db, request.currency),
        }

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


def get_counterparty_context(db, counterparty_id: str):
    counterparty = db.query(Counterparty).filter(Counterparty.counterparty_id == counterparty_id).first()
    if not counterparty:
        raise HTTPException(status_code=404, detail="Counterparty not found. Run /mvp/seed first.")

    netting_set = db.query(NettingSet).filter(NettingSet.counterparty_id == counterparty.counterparty_id).first()
    if not netting_set:
        raise HTTPException(status_code=404, detail="Netting set not found. Run /mvp/seed first.")

    snapshot = db.query(MarketDataSnapshot).order_by(MarketDataSnapshot.valuation_date.desc()).first()
    if not snapshot:
        raise HTTPException(status_code=404, detail="Market data snapshot not found. Run /mvp/seed first.")

    return counterparty, netting_set, snapshot


def get_existing_trades(db, netting_set_id: str):
    return db.query(IrsTrade).filter(IrsTrade.netting_set_id == netting_set_id).all()


def build_netting_set_summary(db, counterparty_id: str):
    netting_set = db.query(NettingSet).filter(NettingSet.counterparty_id == counterparty_id).first()
    if not netting_set:
        return None
    trades = get_existing_trades(db, netting_set.netting_set_id)
    return build_netting_set_payload(netting_set, trades)


def build_netting_set_payload(netting_set: NettingSet, trades: list[IrsTrade]):
    return {
        "id": netting_set.netting_set_id,
        "base_currency": netting_set.base_currency,
        "existing_trades": len(trades),
        "existing_notional": sum(t.notional for t in trades),
    }


def build_portfolio_profile(valuation_date: date, existing_trades: list[IrsTrade], currency: str):
    profile = []
    for label, year in profile_buckets():
        current_epe = portfolio_epe(existing_trades, year, currency)
        pfe_95 = current_epe * 1.62
        bucket_date = valuation_date + timedelta(days=int(365 * year))
        profile.append(
            {
                "label": label,
                "date": str(bucket_date),
                "year": round(year, 4),
                "show_tick": True,
                "epe_current": round(current_epe, 2),
                "epe_new_trade": round(current_epe, 2),
                "pfe_95": round(pfe_95, 2),
            }
        )
    return profile


def build_incremental_profile(
    valuation_date: date,
    existing_trades: list[IrsTrade],
    currency: str,
    trade_notional: float,
    maturity_years: float,
    rate_delta_bps: float,
    direction: str,
):
    direction_sign = 1 if direction.upper() == "PAY" else -1
    rate_sensitivity = 1 + min(abs(rate_delta_bps) / 50, 0.35)
    profile = []

    for label, year in profile_buckets():
        current_epe = portfolio_epe(existing_trades, year, currency)
        progress = min(year / max(maturity_years, 0.25), 1)
        trade_shape = math.sin(progress * math.pi) ** 1.20 if progress < 1 else 0
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


def profile_buckets():
    return [
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


def portfolio_epe(trades: list[IrsTrade], year: float, currency: str) -> float:
    total = 0.0
    for trade in trades:
        if trade.currency != currency:
            continue
        maturity_years = max((trade.maturity_date - trade.effective_date).days / 365, 0.25)
        progress = min(year / maturity_years, 1)
        if progress >= 1:
            continue
        shape = math.sin(progress * math.pi) ** 0.88
        direction_multiplier = 1.0 if trade.pay_receive_fixed.upper() == "PAY" else 0.82
        rate_multiplier = 1 + min(abs(float(trade.fixed_rate) - 0.04) * 8, 0.35)
        total += float(trade.notional) * 0.060 * shape * direction_multiplier * rate_multiplier
    return total


def build_composition_rows(existing_trades: list[IrsTrade], proposed_notional: float, proposed_maturity: str | None):
    return [
        {
            "label": f"{len(existing_trades)} existing",
            "notional": sum(t.notional for t in existing_trades),
            "source": "Computed",
            "maturities": maturity_range(existing_trades),
        },
        {
            "label": "2 added today",
            "notional": 180_000_000,
            "source": "Interpolated",
            "maturities": "3Y, 5Y",
        },
        {
            "label": "+ this trade",
            "notional": proposed_notional,
            "source": "Interpolated" if proposed_notional else "Pending",
            "maturities": proposed_maturity or "—",
        },
    ]


def maturity_range(trades: list[IrsTrade]) -> str:
    if not trades:
        return "—"
    years = sorted(max(1, round((t.maturity_date - t.effective_date).days / 365)) for t in trades)
    return f"{years[0]}Y–{years[-1]}Y"


def get_available_currencies(db):
    currencies = sorted({c[0] for c in db.query(NettingSet.base_currency).distinct().all()})
    return currencies or ["USD", "EUR", "GBP", "CHF"]


def get_available_floating_indices(db):
    indices = sorted({c[0] for c in db.query(Curve.floating_index).filter(Curve.floating_index.isnot(None)).distinct().all()})
    return indices or ["SOFR", "EURIBOR", "SONIA", "SARON"]


def get_par_rates_from_db(db):
    rates = {}
    curves = db.query(Curve).filter(Curve.curve_type == "DISCOUNT").all()
    for curve in curves:
        rates[curve.currency] = get_par_rates_for_curve(db, curve.curve_id)
    return rates


def get_par_rates_for_currency(db, currency: str):
    curve = db.query(Curve).filter(Curve.curve_type == "DISCOUNT", Curve.currency == currency).first()
    if not curve:
        return {}
    return get_par_rates_for_curve(db, curve.curve_id)


def get_par_rates_for_curve(db, curve_id: str):
    points = db.query(CurvePoint).filter(CurvePoint.curve_id == curve_id).all()
    return {p.tenor: p.value for p in points if p.value_type == "PAR_RATE_PCT"}


def get_par_rate_from_db(db, currency: str, maturity: str) -> float:
    rates = get_par_rates_for_currency(db, currency)
    return float(rates.get(maturity) or rates.get("5Y") or 4.28)


def maturity_to_years(maturity: str) -> float:
    return {"1Y": 1, "2Y": 2, "3Y": 3, "5Y": 5, "7Y": 7, "10Y": 10}.get(maturity, 5)


def normalise_rate_to_pct(rate: float) -> float:
    return rate * 100 if rate < 1 else rate


def to_bps(amount: float, notional: float) -> float:
    if notional == 0:
        return 0
    return amount / notional * 10000
