from __future__ import annotations

import math

CVA_MODEL_VERSION = "MVP-CVA-HAZARD-0.1"
RISK_FREE_RATE = 0.035


def calculate_cva_profile(
    profile: list[dict],
    spread_by_tenor: dict[str, float],
    recovery_rate: float,
    epe_field: str = "epe_current",
) -> dict:
    lgd = 1.0 - recovery_rate
    default_spread = _default_spread(spread_by_tenor)

    total_cva = 0.0
    exposure_profile = []
    peak_epe = 0.0
    peak_bucket = "—"
    previous_year = 0.0

    for point in profile:
        label = point["label"]
        year = float(point["year"] or 0)
        spread = float(spread_by_tenor.get(label) or default_spread)
        epe = float(point.get(epe_field) or 0)
        pfe = float(point.get("pfe_95") or 0)

        marginal_pd = _marginal_pd(spread, recovery_rate, previous_year, year)
        discount_factor = _discount_factor(year)
        cva_contribution = -abs(epe * marginal_pd * lgd * discount_factor)
        total_cva += cva_contribution

        if epe > peak_epe:
            peak_epe = epe
            peak_bucket = label

        exposure_profile.append(
            {
                "label": label,
                "date": point["date"],
                "year": year,
                "epe": round(epe, 2),
                "pfe_95": round(pfe, 2),
                "credit_spread_bps": round(spread * 10000, 1),
                "marginal_pd": round(marginal_pd, 6),
                "recovery_rate": round(recovery_rate, 4),
                "lgd": round(lgd, 4),
                "discount_factor": round(discount_factor, 6),
                "cva_contribution": round(cva_contribution, 2),
                "driver": "Exposure" if label == peak_bucket else "Credit / LGD",
            }
        )
        previous_year = max(previous_year, year)

    return {
        "total_cva": total_cva,
        "exposure_profile": exposure_profile,
        "peak_epe": peak_epe,
        "peak_bucket": peak_bucket,
        "lgd": lgd,
    }


def calculate_incremental_cva(
    profile: list[dict],
    spread_by_tenor: dict[str, float],
    recovery_rate: float,
) -> float:
    lgd = 1.0 - recovery_rate
    default_spread = _default_spread(spread_by_tenor)
    total_cva = 0.0
    previous_year = 0.0

    for point in profile:
        label = point["label"]
        year = float(point["year"] or 0)
        spread = float(spread_by_tenor.get(label) or default_spread)
        incremental_epe = max(float(point.get("epe_new_trade") or 0) - float(point.get("epe_current") or 0), 0.0)

        marginal_pd = _marginal_pd(spread, recovery_rate, previous_year, year)
        discount_factor = _discount_factor(year)
        total_cva += -abs(incremental_epe * marginal_pd * lgd * discount_factor)
        previous_year = max(previous_year, year)

    return total_cva


def _default_spread(spread_by_tenor: dict[str, float]) -> float:
    if not spread_by_tenor:
        return 0.0125
    return spread_by_tenor.get("5Y") or sum(spread_by_tenor.values()) / len(spread_by_tenor)


def _marginal_pd(spread: float, recovery_rate: float, previous_year: float, current_year: float) -> float:
    # Simple hazard-rate approximation: spread ~= hazard * LGD.
    lgd = max(1.0 - recovery_rate, 0.05)
    hazard_rate = max(spread / lgd, 0.0)
    start_survival = math.exp(-hazard_rate * max(previous_year, 0.0))
    end_survival = math.exp(-hazard_rate * max(current_year, previous_year))
    return max(min(start_survival - end_survival, 0.45), 0.0)


def _discount_factor(year: float) -> float:
    return 1 / ((1 + RISK_FREE_RATE) ** max(year, 0.08))
