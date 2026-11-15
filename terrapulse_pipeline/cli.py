"""Interface en ligne de commande du pipeline TerraPulse."""
import statistics

from . import config
from .usecases.build_map import build_map
from .usecases.export_dataset import export_dataset
from .usecases.load_daily_observations import load_daily_observations
from .usecases.load_vegetation import load_vegetation


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
