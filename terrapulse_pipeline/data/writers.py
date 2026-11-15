"""Écriture des CSV et du fichier de données web (Data)."""
import calendar
import csv
import datetime as dt
import json
import statistics
from pathlib import Path


def _monthly_rows(config, days, composites):
    """Agrège les jours et les composites en lignes mensuelles."""
    months = {}
    for date, rain, surface, root in days:
        month = months.setdefault(
            date[:7], {"p": [], "t": [], "r": [], "n": [], "pix": 0},
        )
        if rain is not None:
            month["p"].append(rain)
        if surface is not None:
            month["t"].append(surface)
        if root is not None:
            month["r"].append(root)

    for date, value, pixels in composites:
        if date[:7] in months:
            months[date[:7]]["n"].append(value)
            months[date[:7]]["pix"] += pixels

    missing = []
    rows = []
    for key, month in sorted(months.items()):
        year, month_number = int(key[:4]), int(key[5:7])
        if not (month["p"] and month["t"] and month["n"]):
            missing.append(key)

        rows.append([
            f"{key}-{calendar.monthrange(year, month_number)[1]:02d}",
            round(sum(month["p"]), 1) if month["p"] else "",
            round(statistics.mean(month["t"]), 1) if month["t"] else "",
            round(statistics.mean(month["n"]), 3) if month["n"] else "",
            config.REGION,
            round(statistics.mean(month["r"]), 1) if month["r"] else "",
            month["pix"],
        ])

    return rows, missing


def _write_csv(path, header, rows):
    with Path(path).open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(header)
        writer.writerows(rows)


def _write_app_data(path, config, days, composites, map_data):
    data = {
        "meta": {
            "genere_le": dt.date.today().isoformat(),
            "zone": "Bukavu / Lac Kivu (RDC)",
            "latitude": config.LAT,
            "longitude": config.LON,
            "fenetre_ndvi_km": 2 * config.KM_AROUND,
            "periode": [config.START_DATE, config.END_DATE],
            "sources": config.SOURCES,
        },
        "journalier": {
            "debut": config.START_DATE,
            "precipitation": [day[1] for day in days],
            "humidity": [day[2] for day in days],
        },
        "ndvi": [[composite[0], composite[1]] for composite in composites],
        "carte": map_data,
    }

    with Path(path).open("w", encoding="utf-8") as handle:
        handle.write("// Généré par telecharger_donnees_nasa.py - ne pas modifier à la main.\n")
        handle.write("window.TERRAPULSE_DATA = ")
        json.dump(data, handle, ensure_ascii=False, separators=(",", ":"))
        handle.write(";\n")


def write_all(config, days, composites, map_data, output_dir=None):
    """Écrit les quatre sorties et retourne la liste des mois incomplets."""
    output = Path(output_dir) if output_dir else Path(config.BASE_DIR)

    _write_csv(
        output / f"bukavu_terrapulse_nasa_journalier_{config.SUFFIX}.csv",
        ["date", "precipitation_mm", "humidite_sol_pourcent",
         "humidite_racinaire_pourcent", "region"],
        [["" if value is None else value for value in day] + [config.REGION]
         for day in days],
    )

    _write_csv(
        output / f"bukavu_terrapulse_nasa_ndvi_16j_{config.SUFFIX}.csv",
        ["date_debut_composite", "ndvi_moyen_vegetation",
         "ndvi_pixels_valides", "region"],
        [composite + [config.REGION] for composite in composites],
    )

    rows, missing = _monthly_rows(config, days, composites)
    _write_csv(
        output / f"bukavu_terrapulse_nasa_{config.SUFFIX}.csv",
        ["date", "precipitation_mensuelle_mm", "humidite_sol_pourcent",
         "ndvi_moyen_vegetation", "region",
         "humidite_racinaire_pourcent", "ndvi_pixels_valides"],
        rows,
    )

    _write_app_data(output / "terrapulse_data.js", config, days, composites, map_data)
    return missing
