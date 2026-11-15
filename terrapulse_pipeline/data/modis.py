"""MODIS MOD13Q1 : NDVI et fiabilité (Data)."""
import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from .cache import ensure_dir
from .http import get_json

NDVI_BANDS = ("250m_16_days_NDVI", "250m_16_days_pixel_reliability")
BATCH_SIZE = 10
MAX_WORKERS = 4


def fetch_dates(config):
    """Dates MODIS disponibles dans la période du projet."""
    url = f"{config.MODIS_BASE}/dates?latitude={config.LAT}&longitude={config.LON}"
    all_dates = get_json(url)["dates"]
    return [
        item for item in all_dates
        if config.START_DATE <= item["calendar_date"] <= config.END_DATE
    ]


def download_batches(config, dates, bands=NDVI_BANDS, use_cache=True, refresh=False):
    """Télécharge les composites par lots de 10, avec cache facultatif.

    Retourne {bande: {date: [valeurs par pixel]}}.
    """
    if use_cache:
        ensure_dir(config.MODIS_CACHE)
    cache_dir = Path(config.MODIS_CACHE)

    def download_batch(args):
        band, batch = args
        filename = (
            f"{band}_{batch[0]['modis_date']}_{batch[-1]['modis_date']}"
            f"_{config.LAT}_{config.LON}_{config.KM_AROUND}.json"
        )
        path = cache_dir / filename
        if use_cache and not refresh and path.exists():
            with path.open(encoding="utf-8") as handle:
                return band, json.load(handle)

        url = (
            f"{config.MODIS_BASE}/subset?latitude={config.LAT}&longitude={config.LON}"
            f"&startDate={batch[0]['modis_date']}&endDate={batch[-1]['modis_date']}"
            f"&kmAboveBelow={config.KM_AROUND}&kmLeftRight={config.KM_AROUND}&band={band}"
        )
        result = {
            subset["calendar_date"]: subset["data"]
            for subset in get_json(url)["subset"]
        }
        if use_cache:
            with path.open("w", encoding="utf-8") as handle:
                json.dump(result, handle)
        return band, result

    tasks = [
        (band, dates[i:i + BATCH_SIZE])
        for band in bands
        for i in range(0, len(dates), BATCH_SIZE)
    ]

    raw = {band: {} for band in bands}
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        for number, (band, result) in enumerate(pool.map(download_batch, tasks), 1):
            raw[band].update(result)
            print(f"   lot {number}/{len(tasks)}")
    return raw


def fetch_grid(config, date):
    """Géométrie exacte de la grille MODIS pour une date donnée."""
    url = (
        f"{config.MODIS_BASE}/subset?latitude={config.LAT}&longitude={config.LON}"
        f"&startDate={date['modis_date']}&endDate={date['modis_date']}"
        f"&kmAboveBelow={config.KM_AROUND}&kmLeftRight={config.KM_AROUND}"
        f"&band={NDVI_BANDS[0]}"
    )
    grid = get_json(url)
    return {
        "xll": float(grid["xllcorner"]),
        "yll": float(grid["yllcorner"]),
        "cs": float(grid["cellsize"]),
        "nrows": int(grid["nrows"]),
        "ncols": int(grid["ncols"]),
    }
