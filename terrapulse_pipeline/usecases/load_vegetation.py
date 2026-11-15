"""Cas d'utilisation : charger et préparer le NDVI MODIS."""
from ..data.cache import ensure_dir
from ..data.modis import NDVI_BANDS, download_batches, fetch_dates
from ..domain.vegetation import build_composites, build_pixel_series, land_mask


def load_vegetation(config, refresh=False):
    ensure_dir(config.MODIS_CACHE)
    dates = fetch_dates(config)
    raw = download_batches(config, dates, NDVI_BANDS, refresh=refresh)

    ndvi_raw = raw[NDVI_BANDS[0]]
    reliability = raw[NDVI_BANDS[1]]
    pixel_count = len(next(iter(ndvi_raw.values())))

    series = build_pixel_series(ndvi_raw, reliability)
    land = land_mask(series, config.WATER_THRESHOLD)
    print(f"   pixels terrestres retenus : {sum(land)}/{pixel_count}")

    composites = build_composites(ndvi_raw, reliability, land)
    print(f"   composites NDVI exploitables : {len(composites)}/{len(dates)}")

    return {
        "dates": dates,
        "ndvi_raw": ndvi_raw,
        "reliability": reliability,
        "pixel_count": pixel_count,
        "land": land,
        "composites": composites,
    }
