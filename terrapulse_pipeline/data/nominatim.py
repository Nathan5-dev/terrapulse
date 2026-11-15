"""Limites des communes via Nominatim (Data)."""
import time
import urllib.parse

from .http import get_json


def fetch_communes(config):
    """Retourne [{nom, anneau: [[lon, lat], ...]}, ...]."""
    communes = []

    for name in config.COMMUNES:
        url = config.NOMINATIM_URL + "?" + urllib.parse.urlencode({
            "q": f"{name}, Bukavu",
            "format": "jsonv2",
            "polygon_geojson": 1,
            "limit": 5,
        })

        for candidate in get_json(url):
            geo = candidate.get("geojson", {})
            if candidate.get("type") == "administrative" and geo.get("type") == "Polygon":
                ring, previous = [], None
                for lon, lat in geo["coordinates"][0]:
                    point = [round(lon, 5), round(lat, 5)]
                    if point != previous:
                        ring.append(point)
                    previous = point
                communes.append({"nom": name, "anneau": ring})
                break

        time.sleep(1.5)   # politesse envers le service Nominatim

    return communes
