"""Interface en ligne de commande du pipeline TerraPulse."""
import datetime as dt
import json
import statistics
from pathlib import Path
from types import SimpleNamespace

from . import config
from .usecases.build_map import build_map
from .usecases.export_dataset import export_dataset
from .usecases.load_daily_observations import load_daily_observations
from .usecases.load_vegetation import load_vegetation
from .data.modis import download_batches, fetch_dates, NDVI_BANDS
from .domain.vegetation import build_composites, build_pixel_series, land_mask
from .data.writers import build_app_data


def main():
    print("1/4  NASA POWER (pluie, humidité du sol, journalier)...")
    days = load_daily_observations(config)

    print("2/4  MODIS MOD13Q1 (NDVI 250 m)...")
    vegetation = load_vegetation(config)

    print("3/4  Carte (relief SRTM, NDVI par cellule, communes)...")
    try:
        map_data = build_map(
            config,
            vegetation["dates"],
            vegetation["ndvi_raw"],
            vegetation["reliability"],
            vegetation["land"],
            vegetation["pixel_count"],
        )
        valid = [value for value in map_data["indice"] if value is not None]
        print(f"   {len(valid)} cellules cartographiées, indice médian "
              f"{statistics.median(valid):.2f}, maximum {max(valid):.2f}")
    except Exception as exc:  # noqa: BLE001
        map_data = None
        print(f"   carte non générée ({exc}) : le reste de l'application n'est pas affecté")

    print("4/4  Écriture des fichiers...")
    missing = export_dataset(config, days, vegetation["composites"], map_data)
    months = len({day[0][:7] for day in days})

    print(f"\nTerminé : {len(days)} jours, {len(vegetation['composites'])} composites NDVI, "
          f"{months} mois.")
    print("Mois incomplets :", ", ".join(missing) if missing else "aucun")


def fetch_live_dataset():
    """Tente l'actualisation des données, avec le jeu local comme secours."""
    fallback = _load_local_dataset()
    try:
        return _refresh_dataset()
    except Exception as exc:  # noqa: BLE001
        if fallback is None:
            raise
        print(f"   actualisation impossible ({exc}); données locales conservées")
        return {"data": fallback, "updated": False, "error": str(exc)}


def _load_local_dataset():
    path = Path(config.BASE_DIR) / "terrapulse_data.js"
    if not path.exists():
        return None
    content = path.read_text(encoding="utf-8")
    prefix = "window.TERRAPULSE_DATA = "
    if not content.startswith(prefix):
        raise RuntimeError("format de terrapulse_data.js non reconnu")
    return json.loads(content[len(prefix):].rstrip().removesuffix(";"))


def _refresh_dataset():
    """Interroge les sources et met à jour les caches et le jeu local."""
    refresh_end = dt.date.today().isoformat()
    refresh_config = SimpleNamespace(**vars(config))
    refresh_config.END_DATE = refresh_end
    refresh_config.power_url = config.power_url
    refresh_config.POWER_URL = config.power_url(refresh_end)
    days = fetch_daily(refresh_config)
    dates = fetch_dates(config)
    if not dates:
        raise RuntimeError("aucune date MODIS disponible pour la période demandée")
    raw = download_batches(refresh_config, dates, NDVI_BANDS)
    ndvi_raw = raw[NDVI_BANDS[0]]
    reliability = raw[NDVI_BANDS[1]]
    pixel_count = len(next(iter(ndvi_raw.values())))
    land = land_mask(build_pixel_series(ndvi_raw, reliability), config.WATER_THRESHOLD)
    composites = build_composites(ndvi_raw, reliability, land)
    map_data = build_map(refresh_config, dates, ndvi_raw, reliability, land,
                         pixel_count, refresh=True)
    if not map_data or not map_data.get("indice"):
        raise RuntimeError("les données cartographiques sont incomplètes")
    if not composites:
        raise RuntimeError("aucun composite NDVI valide n'a été récupéré")
    dataset = build_app_data(refresh_config, days, composites, map_data)
    path = Path(config.BASE_DIR) / "terrapulse_data.js"
    temporary = path.with_suffix(".js.tmp")
    temporary.write_text("// Mis à jour depuis les API par serve_terrapulse.py.\n"
                         "window.TERRAPULSE_DATA = " + json.dumps(
                             dataset, ensure_ascii=False, separators=(",", ":")) + ";\n",
                         encoding="utf-8")
    temporary.replace(path)
    return {"data": dataset, "updated": True, "error": None}
