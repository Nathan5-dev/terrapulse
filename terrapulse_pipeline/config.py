"""Configuration partagée du pipeline TerraPulse.

Aucune logique métier ici : uniquement des constantes, des URLs et des chemins.
"""
from pathlib import Path

# ---------------- Zone et période ----------------
LAT, LON = -2.51, 28.85          # Centre de Bukavu
START_DATE, END_DATE = "2021-01-01", "2025-12-31"
KM_AROUND = 5                    # Fenêtre NDVI : 5 km de chaque côté (~10 x 10 km)
WATER_THRESHOLD = 0.10           # Pixel dont le NDVI médian est < 0.10 = lac, exclu
REGION = "Bukavu_Kivu"
COMMUNES = ["Kadutu", "Ibanda", "Bagira"]   # communes tracées sur la carte

# ---------------- Indice de vulnérabilité ----------------
# indice = min(pente / SLOPE_REFERENCE, 1) x (0.5 + 0.5 x déficit de végétation)
# déficit = 0 si NDVI >= NDVI_DENSE, 1 si NDVI <= NDVI_BARE, linéaire entre les deux
SLOPE_REFERENCE = 25.0
NDVI_DENSE = 0.60
NDVI_BARE = 0.30

# ---------------- Chemins ----------------
BASE_DIR = Path(__file__).resolve().parent.parent
MODIS_CACHE = BASE_DIR / "cache_modis"
MAP_CACHE = BASE_DIR / "cache_carte"
SUFFIX = f"{START_DATE[:4]}_{END_DATE[:4]}"

# ---------------- Sources ----------------
POWER_URL = (
    "https://power.larc.nasa.gov/api/temporal/daily/point"
    "?parameters=PRECTOTCORR,GWETTOP,GWETROOT&community=AG"
    f"&longitude={LON}&latitude={LAT}"
    f"&start={START_DATE.replace('-', '')}&end={END_DATE.replace('-', '')}&format=JSON"
)
MODIS_BASE = "https://modis.ornl.gov/rst/api/v1/MOD13Q1"
SRTM_URL = "https://s3.amazonaws.com/elevation-tiles-prod/skadi/{prefix}/{name}.hgt.gz"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

SINUSOIDAL_RADIUS = 6371007.181   # rayon de la sphère de la grille sinusoïdale MODIS (m)

SOURCES = {
    "precipitation": "NASA POWER v2 (réanalyse MERRA-2), paramètre PRECTOTCORR, "
                     "pas journalier, maille ~0.5° x 0.625° - https://power.larc.nasa.gov",
    "humidity": "NASA POWER v2 (réanalyse MERRA-2), paramètre GWETTOP (humidité de "
                "surface du sol, 0-100 % de saturation), pas journalier - "
                "https://power.larc.nasa.gov",
    "ndvi": "NASA MODIS/Terra MOD13Q1 v6.1 (NDVI 250 m, composite 16 jours), "
            "via ORNL DAAC - https://doi.org/10.5067/MODIS/MOD13Q1.061",
}

MAP_SOURCES = {
    "pente": "NASA SRTM 1 arc-seconde (~30 m), tuiles HGT des Terrain Tiles "
             "Mapzen / AWS Open Data - https://registry.opendata.aws/terrain-tiles",
    "ndvi": "NASA MODIS/Terra MOD13Q1 v6.1, moyenne par cellule de 231 m - "
            "https://doi.org/10.5067/MODIS/MOD13Q1.061",
    "communes": "Limites administratives © contributeurs OpenStreetMap (ODbL), "
                "via Nominatim",
}
