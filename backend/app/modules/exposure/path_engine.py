from __future__ import annotations

from datetime import date, timedelta
import math

PATH_COUNT = 250
MODEL_VERSION = "MVP-PATH-EXPOSURE-0.1"


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


def build_portfolio_profile(valuation_date: date, existing_trades: list, currency: str, path_count: int = PATH_COUNT):
    profile = []

    for label, year in profile_buckets():
        path_exposures = [
            max(_portfolio_exposure_for_path(existing_trades, year, currency, path_index), 0.0)
            for path_index in range(path_count)
        ]
        epe_current = _mean(path_exposures)
        pfe_95 = _percentile(path_exposures, 95)
        bucket_date = valuation_date + timedelta(days=int(365 * year))

        profile.append(
            {
                "label": label,
                "date": str(bucket_date),
                "year": round(year, 4),
                "show_tick": True,
                "epe_current": round(epe_current, 2),
                "epe_new_trade": round(epe_current, 2),
                "pfe_95": round(pfe_95, 2),
                "path_count": path_count,
            }
        )

    return profile


def build_incremental_profile(
    valuation_date: date,
    existing_trades: list,
    currency: str,
    trade_notional: float,
    maturity_years: float,
    rate_delta_bps: float,
    direction: str,
    path_count: int = PATH_COUNT,
):
    direction_sign = 1 if direction.upper() == "PAY" else -1
    rate_sensitivity = 1 + min(abs(rate_delta_bps) / 50, 0.35)
    profile = []

    for label, year in profile_buckets():
        current_paths = []
        new_trade_paths = []

        for path_index in range(path_count):
            current = max(_portfolio_exposure_for_path(existing_trades, year, currency, path_index), 0.0)
            increment = _new_trade_increment(
                trade_notional=trade_notional,
                year=year,
                maturity_years=maturity_years,
                rate_sensitivity=rate_sensitivity,
                direction_sign=direction_sign,
                path_index=path_index,
            )
            new_exposure = max(current + increment, 0.0)
            current_paths.append(current)
            new_trade_paths.append(new_exposure)

        epe_current = _mean(current_paths)
        epe_new_trade = _mean(new_trade_paths)
        pfe_95 = max(_percentile(new_trade_paths, 95), _percentile(current_paths, 95))
        bucket_date = valuation_date + timedelta(days=int(365 * year))

        profile.append(
            {
                "label": label,
                "date": str(bucket_date),
                "year": round(year, 4),
                "show_tick": True,
                "epe_current": round(epe_current, 2),
                "epe_new_trade": round(epe_new_trade, 2),
                "pfe_95": round(pfe_95, 2),
                "path_count": path_count,
            }
        )

    return profile


def _portfolio_exposure_for_path(trades: list, year: float, currency: str, path_index: int) -> float:
    total = 0.0

    for trade_index, trade in enumerate(trades):
        if trade.currency != currency:
            continue

        maturity_years = max((trade.maturity_date - trade.effective_date).days / 365, 0.25)
        progress = min(year / maturity_years, 1)
        if progress >= 1:
            continue

        shape = math.sin(progress * math.pi) ** 0.88
        direction_multiplier = 1.0 if trade.pay_receive_fixed.upper() == "PAY" else 0.82
        rate_multiplier = 1 + min(abs(float(trade.fixed_rate) - 0.04) * 8, 0.35)
        path_multiplier = _synthetic_path_multiplier(path_index, year, trade_index)

        total += float(trade.notional) * 0.060 * shape * direction_multiplier * rate_multiplier * path_multiplier

    return total


def _new_trade_increment(
    trade_notional: float,
    year: float,
    maturity_years: float,
    rate_sensitivity: float,
    direction_sign: int,
    path_index: int,
) -> float:
    progress = min(year / max(maturity_years, 0.25), 1)
    trade_shape = math.sin(progress * math.pi) ** 1.20 if progress < 1 else 0
    path_multiplier = _synthetic_path_multiplier(path_index, year, 997)
    return trade_notional * 0.115 * trade_shape * rate_sensitivity * direction_sign * path_multiplier


def _synthetic_path_multiplier(path_index: int, year: float, salt: int) -> float:
    # Deterministic low-discrepancy-style variation. This is intentionally not random:
    # the same inputs produce the same demo numbers every run.
    cyclical = math.sin((path_index + 1) * 0.173 + year * 0.71 + salt * 0.037)
    secondary = math.cos((path_index + 1) * 0.097 + year * 0.43 + salt * 0.019)
    stress_tilt = ((path_index % 25) - 12) / 12

    multiplier = 1.0 + (0.22 * cyclical) + (0.10 * secondary) + (0.035 * stress_tilt)
    return max(multiplier, 0.35)


def _mean(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def _percentile(values: list[float], percentile: float) -> float:
    if not values:
        return 0.0

    ordered = sorted(values)
    rank = (len(ordered) - 1) * (percentile / 100)
    low = math.floor(rank)
    high = math.ceil(rank)

    if low == high:
        return ordered[int(rank)]

    weight = rank - low
    return ordered[low] * (1 - weight) + ordered[high] * weight
