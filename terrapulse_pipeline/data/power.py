"""NASA POWER : pluie et humidité du sol (Data)."""
import datetime as dt

from .http import get_json


def _valid(value):
    """POWER utilise -999 comme valeur manquante."""
    return value is not None and value > -900


def fetch_daily(config):
    """Retourne [[date, pluie_mm, humidite_%, humidite_racinaire_%], ...]."""
    power = get_json(config.POWER_URL)["properties"]["parameter"]

    days = []
    current = dt.date.fromisoformat(config.START_DATE)
    end = dt.date.fromisoformat(config.END_DATE)

    while current <= end:
        key = current.strftime("%Y%m%d")
        rain, surface, root = (
            power[name].get(key)
            for name in ("PRECTOTCORR", "GWETTOP", "GWETROOT")
        )
        days.append([
            current.isoformat(),
            round(rain, 2) if _valid(rain) else None,
            round(surface * 100, 1) if _valid(surface) else None,
            round(root * 100, 1) if _valid(root) else None,
        ])
        current += dt.timedelta(days=1)

    print(f"   {len(days)} jours, dont "
          f"{sum(day[1] is None for day in days)} sans pluie mesurée")
    return days
