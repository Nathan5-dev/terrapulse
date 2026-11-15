"""Cas d'utilisation : construire la carte des versants vulnérables."""
import datetime as dt
import math

from ..data.cache import cached_json, ensure_dir
from ..data.modis import fetch_grid
from ..data.nominatim import fetch_communes
from ..data.srtm import ensure_tile, load_heights
from ..domain.geometry import point_in_polygon, polygon_area_km2, sin_to_latlon
from ..domain.terrain import HGT_SIZE, slope_and_altitude
from ..domain.vulnerability import build_index
from ..domain.vegetation import build_cell_ndvi


def _mean(values):
    return round(sum(values) / len(values), 3) if values else None


def build_map(config, dates, ndvi_raw, reliability, land, pixel_count):
    """Retourne le dictionnaire `carte` consommé par l'application web."""
    ensure_dir(config.MAP_CACHE)

    grid = cached_json(
        config.MAP_CACHE,
        f"grille_{config.LAT}_{config.LON}_{config.KM_AROUND}.json",
        lambda: fetch_grid(config, dates[0]),
    )
    xll, yll, cs = grid["xll"], grid["yll"], grid["cs"]
    nrows, ncols = grid["nrows"], grid["ncols"]
    if nrows * ncols != pixel_count:
        raise RuntimeError("la grille MODIS ne correspond pas aux données NDVI")

    radius = config.SINUSOIDAL_RADIUS

    def centre(pixel):
        row, col = divmod(pixel, ncols)
        return sin_to_latlon(
            xll + (col + 0.5) * cs,
            yll + (nrows - row - 0.5) * cs,
            radius,
        )

    # Emprise de la grille et tuile SRTM de 1 degré.
    corners = [
        sin_to_latlon(xll + i * ncols * cs, yll + j * nrows * cs, radius)
        for i in (0, 1) for j in (0, 1)
    ]
    lat_min, lat_max = min(c[0] for c in corners), max(c[0] for c in corners)
    lon_min, lon_max = min(c[1] for c in corners), max(c[1] for c in corners)
    lat0, lon0 = math.floor(lat_min), math.floor(lon_min)
    if math.floor(lat_max) != lat0 or math.floor(lon_max) != lon0:
        raise RuntimeError("la zone chevauche plusieurs tuiles SRTM (non géré)")

    heights = load_heights(ensure_tile(config, lat0, lon0))
    slopes, altitudes = slope_and_altitude(
        heights, HGT_SIZE, lat0, lon0,
        lat_min, lat_max, lon_min, lon_max,
        grid, pixel_count, radius,
    )

    # NDVI moyen de chaque cellule sur les 12 derniers mois de la période.
    limit = (dt.date.fromisoformat(config.END_DATE) - dt.timedelta(days=365)).isoformat()
    cell_ndvi = build_cell_ndvi(ndvi_raw, reliability, land, limit, pixel_count)

    index = build_index(
        slopes, cell_ndvi, altitudes, land,
        config.SLOPE_REFERENCE, config.NDVI_DENSE, config.NDVI_BARE,
    )

    try:
        communes = cached_json(
            config.MAP_CACHE, "communes.json",
            lambda: fetch_communes(config),
        )
    except Exception as exc:  # noqa: BLE001
        print(f"   communes indisponibles ({exc}) : la carte sera tracée sans elles")
        communes = []

    for commune in communes:
        cells = [
            pixel for pixel in range(pixel_count)
            if index[pixel] is not None
            and point_in_polygon(*centre(pixel), commune["anneau"])
        ]
        area = polygon_area_km2(commune["anneau"], radius)
        commune["stats"] = {
            "cellules": len(cells),
            "surface_km2": round(len(cells) * cs * cs / 1e6, 1),
            "surface_commune_km2": round(area, 1),
            "pente_moyenne": _mean([slopes[p] for p in cells]),
            "part_pente_sup_15": _mean([1.0 if slopes[p] > 15 else 0.0 for p in cells]),
            "ndvi_moyen": _mean([cell_ndvi[p] for p in cells if cell_ndvi[p] is not None]),
            "indice_moyen": _mean([index[p] for p in cells]),
            "part_indice_sup_04": _mean([1.0 if index[p] >= 0.4 else 0.0 for p in cells]),
        }
        print(f"   {commune['nom']}: {commune['stats']}")

    return {
        "grille": grid,
        "rayon_sinusoidal": radius,
        "terre": [1 if value else 0 for value in land],
        "pente": slopes,
        "altitude": altitudes,
        "ndvi": cell_ndvi,
        "indice": index,
        "periode_ndvi": [limit, config.END_DATE],
        "formule": {
            "pente_ref": config.SLOPE_REFERENCE,
            "ndvi_dense": config.NDVI_DENSE,
            "ndvi_nu": config.NDVI_BARE,
        },
        "communes": communes,
        "sources": config.MAP_SOURCES,
    }
