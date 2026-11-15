"""NASA POWER : pluie et humidité du sol (Data)."""
import datetime as dt

from .http import get_json


def _valid(value):
    """POWER utilise -999 comme valeur manquante."""
    return value is not None and value > -900


def fetch_daily(config):
    """Retourne [[date, pluie_mm, humidite_%, humidite_racinaire_%], ...]."""
    start = dt.date.fromisoformat(config.START_DATE)
    end = dt.date.fromisoformat(config.END_DATE)
    power = {name: {} for name in ("PRECTOTCORR", "GWETTOP", "GWETROOT")}
    year_start = start.year
    while year_start <= end.year:
        chunk_start = max(start, dt.date(year_start, 1, 1))
        chunk_end = min(end, dt.date(year_start, 12, 31))
        url = config.power_url(chunk_end.isoformat())
        if chunk_start != start:
            url = url.replace(
                f"start={config.START_DATE.replace('-', '')}",
                f"start={chunk_start.strftime('%Y%m%d')}",
            )
        print(f"   POWER {chunk_start.year}…{chunk_end.year}", flush=True)
        chunk = get_json(url)["properties"]["parameter"]
        for name in power:
            power[name].update(chunk[name])
        year_start += 1

    days = []
    current = start

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
