"""Relief SRTM au format HGT (Data)."""
import gzip
import urllib.request
from array import array
from pathlib import Path

from ..domain.terrain import HGT_SIZE
from .cache import ensure_dir
from .http import open_url


def tile_name(lat0, lon0):
    """Nom de tuile SRTM, par exemple S07E028."""
    return (
        f"{'S' if lat0 < 0 else 'N'}{abs(lat0):02d}"
        f"{'W' if lon0 < 0 else 'E'}{abs(lon0):03d}"
    )


def ensure_tile(config, lat0, lon0):
    """Télécharge la tuile HGT si nécessaire et retourne son chemin."""
    ensure_dir(config.MAP_CACHE)
    name = tile_name(lat0, lon0)
    path = Path(config.MAP_CACHE) / f"{name}.hgt.gz"

    if not path.exists():
        url = config.SRTM_URL.format(prefix=name[:3], name=name)
        print(f"   téléchargement du relief {name} (~15 Mo)...")
        req = urllib.request.Request(url, headers={"User-Agent": "python-urllib"})
        with open_url(req, timeout=300) as response, path.open("wb") as handle:
            handle.write(response.read())

    return path


def load_heights(path):
    """Lit une tuile HGT gros-boutiste et retourne les altitudes."""
    with gzip.open(path, "rb") as handle:
        altitudes = array("h", handle.read())
    altitudes.byteswap()      # le format HGT est en gros-boutiste

    if len(altitudes) != HGT_SIZE * HGT_SIZE:
        raise RuntimeError("tuile SRTM de taille inattendue")
    return altitudes
