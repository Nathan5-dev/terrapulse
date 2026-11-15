"""
TerraPulse - Téléchargement des vraies données NASA pour Bukavu.

Sources (publiques, sans compte ni clé) :
  1. NASA POWER (https://power.larc.nasa.gov) - réanalyse MERRA-2, pas journalier
       - PRECTOTCORR : précipitations corrigées (mm/jour)
       - GWETTOP     : humidité de la couche superficielle du sol (0-1)
       - GWETROOT    : humidité de la zone racinaire (0-1)
  2. MODIS/Terra MOD13Q1 v6.1 via ORNL DAAC (https://modis.ornl.gov)
       - NDVI 250 m, composite 16 jours, filtré par la bande de fiabilité
  3. Pour la carte (pilier LOCATE) :
       - Relief NASA SRTM 1 arc-seconde (~30 m), distribué au format HGT par les
         Terrain Tiles Mapzen / AWS Open Data -> pente de chaque cellule
       - Limites des communes de Bukavu : OpenStreetMap (via Nominatim)

Usage :  python telecharger_donnees_nasa.py

Fichiers produits (dans ce dossier) :
  - terrapulse_data.js                               -> chargé par l'application web
  - bukavu_terrapulse_nasa_2021_2025.csv             -> mensuel (format historique)
  - bukavu_terrapulse_nasa_journalier_2021_2025.csv  -> pluie + humidité par jour
  - bukavu_terrapulse_nasa_ndvi_16j_2021_2025.csv    -> NDVI par composite 16 jours

Les réponses MODIS sont mises en cache dans cache_modis/, le relief et les communes
dans cache_carte/ : une relance est rapide. Supprimez ces dossiers pour forcer un
nouveau téléchargement.
"""
import calendar
import csv
import datetime as dt
import gzip
import json
import math
import os
import statistics
import time
import urllib.parse
import urllib.request
from array import array
from concurrent.futures import ThreadPoolExecutor

# ---------------- Paramètres ----------------
LAT, LON = -2.51, 28.85          # Centre de Bukavu
DEBUT, FIN = "2021-01-01", "2025-12-31"
KM_AUTOUR = 5                    # Fenêtre NDVI : 5 km de chaque côté (~10 x 10 km)
SEUIL_EAU = 0.10                 # Pixel dont le NDVI médian est < 0.10 = lac, exclu
REGION = "Bukavu_Kivu"
COMMUNES = ["Kadutu", "Ibanda", "Bagira"]   # communes de Bukavu tracées sur la carte

# Indice de vulnérabilité des versants (0 à 1), calculé par cellule de 231 m :
#   indice = min(pente / PENTE_REF, 1) x (0.5 + 0.5 x déficit de végétation)
#   déficit = 0 si NDVI >= NDVI_DENSE, 1 si NDVI <= NDVI_NU, linéaire entre les deux
PENTE_REF = 25.0     # degrés : pente à partir de laquelle le score de pente vaut 1
NDVI_DENSE = 0.60
NDVI_NU = 0.30

DOSSIER = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(DOSSIER, "cache_modis")
CACHE_CARTE = os.path.join(DOSSIER, "cache_carte")
SUFFIXE = f"{DEBUT[:4]}_{FIN[:4]}"

POWER_URL = ("https://power.larc.nasa.gov/api/temporal/daily/point"
             "?parameters=PRECTOTCORR,GWETTOP,GWETROOT&community=AG"
             f"&longitude={LON}&latitude={LAT}"
             f"&start={DEBUT.replace('-', '')}&end={FIN.replace('-', '')}&format=JSON")
MODIS_BASE = "https://modis.ornl.gov/rst/api/v1/MOD13Q1"

SOURCES = {
    "precipitation": "NASA POWER v2 (réanalyse MERRA-2), paramètre PRECTOTCORR, "
                     "pas journalier, maille ~0.5° x 0.625° - https://power.larc.nasa.gov",
    "humidity": "NASA POWER v2 (réanalyse MERRA-2), paramètre GWETTOP (humidité de "
                "surface du sol, 0-100 % de saturation), pas journalier - "
                "https://power.larc.nasa.gov",
    "ndvi": "NASA MODIS/Terra MOD13Q1 v6.1 (NDVI 250 m, composite 16 jours), "
            "via ORNL DAAC - https://doi.org/10.5067/MODIS/MOD13Q1.061",
}
SOURCES_CARTE = {
    "pente": "NASA SRTM 1 arc-seconde (~30 m), tuiles HGT des Terrain Tiles "
             "Mapzen / AWS Open Data - https://registry.opendata.aws/terrain-tiles",
    "ndvi": "NASA MODIS/Terra MOD13Q1 v6.1, moyenne par cellule de 231 m - "
            "https://doi.org/10.5067/MODIS/MOD13Q1.061",
    "communes": "Limites administratives © contributeurs OpenStreetMap (ODbL), "
                "via Nominatim",
}


def get_json(url, essais=5):
    """GET avec quelques réessais (les serveurs NASA sont parfois lents)."""
    for i in range(essais):
        try:
            req = urllib.request.Request(url, headers={
                "Accept": "application/json", "User-Agent": "python-urllib"})
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:  # noqa: BLE001
            if i == essais - 1:
                raise
            print(f"   nouvel essai ({e})")
            time.sleep(5 * (i + 1))


def valide(x):
    """POWER utilise -999 comme valeur manquante."""
    return x is not None and x > -900


def chemin(nom):
    return os.path.join(DOSSIER, nom)


# ---------------- 1. NASA POWER : pluie + humidité du sol (journalier) ----------------
print("1/4  NASA POWER (pluie, humidité du sol, journalier)...")
power = get_json(POWER_URL)["properties"]["parameter"]

jours = []   # [date, pluie_mm, humidite_%, humidite_racinaire_%]
d = dt.date.fromisoformat(DEBUT)
fin = dt.date.fromisoformat(FIN)
while d <= fin:
    cle = d.strftime("%Y%m%d")
    p, t, r = (power[k].get(cle) for k in ("PRECTOTCORR", "GWETTOP", "GWETROOT"))
    jours.append([d.isoformat(),
                  round(p, 2) if valide(p) else None,
                  round(t * 100, 1) if valide(t) else None,
                  round(r * 100, 1) if valide(r) else None])
    d += dt.timedelta(days=1)
print(f"   {len(jours)} jours, dont {sum(j[1] is None for j in jours)} sans pluie mesurée")

# ---------------- 2. MODIS MOD13Q1 : NDVI ----------------
print("2/4  MODIS MOD13Q1 (NDVI 250 m)...")
os.makedirs(CACHE, exist_ok=True)
toutes = get_json(f"{MODIS_BASE}/dates?latitude={LAT}&longitude={LON}")["dates"]
dates = [x for x in toutes if DEBUT <= x["calendar_date"] <= FIN]


def telecharger_lot(args):
    bande, lot = args
    fichier = os.path.join(
        CACHE, f"{bande}_{lot[0]['modis_date']}_{lot[-1]['modis_date']}"
               f"_{LAT}_{LON}_{KM_AUTOUR}.json")
    if os.path.exists(fichier):
        with open(fichier, encoding="utf-8") as f:
            return bande, json.load(f)
    url = (f"{MODIS_BASE}/subset?latitude={LAT}&longitude={LON}"
           f"&startDate={lot[0]['modis_date']}&endDate={lot[-1]['modis_date']}"
           f"&kmAboveBelow={KM_AUTOUR}&kmLeftRight={KM_AUTOUR}&band={bande}")
    res = {s["calendar_date"]: s["data"] for s in get_json(url)["subset"]}
    with open(fichier, "w", encoding="utf-8") as f:
        json.dump(res, f)
    return bande, res


BANDES = ("250m_16_days_NDVI", "250m_16_days_pixel_reliability")
taches = [(b, dates[i:i + 10]) for b in BANDES for i in range(0, len(dates), 10)]
brut = {b: {} for b in BANDES}
with ThreadPoolExecutor(max_workers=4) as pool:
    for n, (bande, res) in enumerate(pool.map(telecharger_lot, taches), 1):
        brut[bande].update(res)
        print(f"   lot {n}/{len(taches)}")
ndvi_brut, fiab = brut[BANDES[0]], brut[BANDES[1]]


def bon(date, p, v):
    """Pixel observé correctement : fiabilité 0 (bon) ou 1 (acceptable)."""
    return date in fiab and fiab[date][p] in (0, 1) and v > -2000


nb_pix = len(next(iter(ndvi_brut.values())))
series = [[] for _ in range(nb_pix)]
for date, vals in ndvi_brut.items():
    for p, v in enumerate(vals):
        if bon(date, p, v):
            series[p].append(v * 0.0001)

# Masque du lac Kivu : pixels dont le NDVI médian est très bas
terre = [len(s) > 0 and statistics.median(s) >= SEUIL_EAU for s in series]
nb_terre = sum(terre)
print(f"   pixels terrestres retenus : {nb_terre}/{nb_pix}")

composites = []  # [date, ndvi_moyen, nb_pixels_valides]
for date, vals in sorted(ndvi_brut.items()):
    bons = [v * 0.0001 for p, v in enumerate(vals) if terre[p] and bon(date, p, v)]
    # On exige au moins 10 % de la zone terrestre observée pour garder le composite
    if len(bons) >= 0.10 * nb_terre:
        composites.append([date, round(sum(bons) / len(bons), 4), len(bons)])
print(f"   composites NDVI exploitables : {len(composites)}/{len(dates)}")

# ---------------- 3. Carte : pente (SRTM), NDVI par cellule, communes ----------------
R_SIN = 6371007.181   # rayon de la sphère de la grille sinusoïdale MODIS (m)


def sin_vers_latlon(x, y):
    lat = y / R_SIN
    return math.degrees(lat), math.degrees(x / (R_SIN * math.cos(lat)))


def latlon_vers_sin(lat, lon):
    la = math.radians(lat)
    return R_SIN * math.radians(lon) * math.cos(la), R_SIN * la


def en_cache(nom, fabrique):
    """Lit cache_carte/nom s'il existe, sinon appelle fabrique() et enregistre."""
    fichier = os.path.join(CACHE_CARTE, nom)
    if os.path.exists(fichier):
        with open(fichier, encoding="utf-8") as f:
            return json.load(f)
    res = fabrique()
    with open(fichier, "w", encoding="utf-8") as f:
        json.dump(res, f)
    return res


def dans_polygone(lat, lon, anneau):
    """Test du point dans un polygone (anneau = liste de [lon, lat])."""
    dedans = False
    j = len(anneau) - 1
    for i in range(len(anneau)):
        xi, yi = anneau[i]
        xj, yj = anneau[j]
        if (yi > lat) != (yj > lat) and lon < (xj - xi) * (lat - yi) / (yj - yi) + xi:
            dedans = not dedans
        j = i
    return dedans


def moyenne(xs):
    return round(sum(xs) / len(xs), 3) if xs else None


def construire_carte():
    os.makedirs(CACHE_CARTE, exist_ok=True)

    # 3a. Géométrie exacte de la grille MODIS (coin bas-gauche, taille de cellule)
    def lire_grille():
        url = (f"{MODIS_BASE}/subset?latitude={LAT}&longitude={LON}"
               f"&startDate={dates[0]['modis_date']}&endDate={dates[0]['modis_date']}"
               f"&kmAboveBelow={KM_AUTOUR}&kmLeftRight={KM_AUTOUR}&band={BANDES[0]}")
        g = get_json(url)
        return {"xll": float(g["xllcorner"]), "yll": float(g["yllcorner"]),
                "cs": float(g["cellsize"]), "nrows": int(g["nrows"]), "ncols": int(g["ncols"])}
    G = en_cache(f"grille_{LAT}_{LON}_{KM_AUTOUR}.json", lire_grille)
    xll, yll, cs, nrows, ncols = G["xll"], G["yll"], G["cs"], G["nrows"], G["ncols"]
    if nrows * ncols != nb_pix:
        raise RuntimeError("la grille MODIS ne correspond pas aux données NDVI")

    def centre(p):   # la cellule 0 est en haut à gauche (nord-ouest)
        r, c = divmod(p, ncols)
        return sin_vers_latlon(xll + (c + 0.5) * cs, yll + (nrows - r - 0.5) * cs)

    # 3b. Relief SRTM : une tuile HGT de 1 degré (3601 x 3601 altitudes, du nord au sud)
    coins = [sin_vers_latlon(xll + i * ncols * cs, yll + j * nrows * cs)
             for i in (0, 1) for j in (0, 1)]
    lat_min, lat_max = min(c[0] for c in coins), max(c[0] for c in coins)
    lon_min, lon_max = min(c[1] for c in coins), max(c[1] for c in coins)
    lat0, lon0 = math.floor(lat_min), math.floor(lon_min)
    if math.floor(lat_max) != lat0 or math.floor(lon_max) != lon0:
        raise RuntimeError("la zone chevauche plusieurs tuiles SRTM (non géré)")
    nom = (f"{'S' if lat0 < 0 else 'N'}{abs(lat0):02d}"
           f"{'W' if lon0 < 0 else 'E'}{abs(lon0):03d}")
    fichier = os.path.join(CACHE_CARTE, nom + ".hgt.gz")
    if not os.path.exists(fichier):
        url = f"https://s3.amazonaws.com/elevation-tiles-prod/skadi/{nom[:3]}/{nom}.hgt.gz"
        print(f"   téléchargement du relief {nom} (~15 Mo)...")
        req = urllib.request.Request(url, headers={"User-Agent": "python-urllib"})
        with urllib.request.urlopen(req, timeout=300) as r, open(fichier, "wb") as f:
            f.write(r.read())
    with gzip.open(fichier, "rb") as f:
        alt = array("h", f.read())
    alt.byteswap()                     # le format HGT est en gros-boutiste
    N = 3601
    if len(alt) != N * N:
        raise RuntimeError("tuile SRTM de taille inattendue")

    # Pente de chaque point SRTM (différences centrées), moyennée par cellule MODIS.
    # Indices : i = ligne depuis le nord, j = colonne depuis l'ouest.
    i_min = max(1, int((lat0 + 1 - lat_max) * 3600) - 1)
    i_max = min(N - 2, int((lat0 + 1 - lat_min) * 3600) + 1)
    j_min = max(1, int((lon_min - lon0) * 3600) - 1)
    j_max = min(N - 2, int((lon_max - lon0) * 3600) + 1)
    pas = 2 * math.pi * 6371008.8 / 360 / 3600     # 1 arc-seconde en mètres (~30,9 m)
    s_pente, s_alt, n_dem = [0.0] * nb_pix, [0.0] * nb_pix, [0] * nb_pix
    for i in range(i_min, i_max + 1):
        lat = lat0 + 1 - i / 3600
        dx = pas * math.cos(math.radians(lat))
        for j in range(j_min, j_max + 1):
            k = i * N + j
            v = (alt[k], alt[k - 1], alt[k + 1], alt[k - N], alt[k + N])
            if min(v) < -1000:          # trou dans les données SRTM
                continue
            x, y = latlon_vers_sin(lat, lon0 + j / 3600)
            c, r = int((x - xll) // cs), nrows - 1 - int((y - yll) // cs)
            if 0 <= c < ncols and 0 <= r < nrows:
                p = r * ncols + c
                gx, gy = (v[2] - v[1]) / (2 * dx), (v[3] - v[4]) / (2 * pas)
                s_pente[p] += math.degrees(math.atan(math.hypot(gx, gy)))
                s_alt[p] += v[0]
                n_dem[p] += 1
    pente = [round(s_pente[p] / n_dem[p], 1) if n_dem[p] else None for p in range(nb_pix)]
    altitude = [round(s_alt[p] / n_dem[p]) if n_dem[p] else None for p in range(nb_pix)]

    # 3c. NDVI moyen de chaque cellule sur les 12 derniers mois de la période
    limite = (dt.date.fromisoformat(FIN) - dt.timedelta(days=365)).isoformat()
    s_ndvi, n_ndvi = [0.0] * nb_pix, [0] * nb_pix
    for date, vals in ndvi_brut.items():
        if date <= limite:
            continue
        for p, v in enumerate(vals):
            if bon(date, p, v):
                s_ndvi[p] += v * 0.0001
                n_ndvi[p] += 1
    ndvi_cell = [round(s_ndvi[p] / n_ndvi[p], 3) if n_ndvi[p] else None for p in range(nb_pix)]

    # 3d. Indice de vulnérabilité
    # Le masque NDVI laisse passer quelques cellules du lac (eaux peu profondes, rives).
    # On les écarte aussi par le relief : surface plane située à l'altitude du lac.
    alt_eau = [altitude[p] for p in range(nb_pix) if not terre[p] and altitude[p] is not None]
    alt_lac = statistics.mode(alt_eau) if alt_eau else None

    def est_lac(p):
        return (alt_lac is not None and pente[p] is not None
                and pente[p] < 1.0 and abs(altitude[p] - alt_lac) <= 2)

    indice = []
    for p in range(nb_pix):
        if not terre[p] or pente[p] is None or est_lac(p):
            indice.append(None)
            continue
        deficit = 0.5 if ndvi_cell[p] is None else min(1.0, max(
            0.0, (NDVI_DENSE - ndvi_cell[p]) / (NDVI_DENSE - NDVI_NU)))
        indice.append(round(min(pente[p] / PENTE_REF, 1.0) * (0.5 + 0.5 * deficit), 3))

    # 3e. Communes : limites OpenStreetMap et statistiques des cellules qu'elles contiennent
    def lire_communes():
        res = []
        for nom_c in COMMUNES:
            url = ("https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode({
                "q": f"{nom_c}, Bukavu", "format": "jsonv2", "polygon_geojson": 1, "limit": 5}))
            for cand in get_json(url):
                geo = cand.get("geojson", {})
                if cand.get("type") == "administrative" and geo.get("type") == "Polygon":
                    anneau, prec = [], None
                    for lon, lat in geo["coordinates"][0]:
                        pt = [round(lon, 5), round(lat, 5)]
                        if pt != prec:
                            anneau.append(pt)
                        prec = pt
                    res.append({"nom": nom_c, "anneau": anneau})
                    break
            time.sleep(1.5)            # politesse envers le service Nominatim
        return res
    try:
        communes = en_cache("communes.json", lire_communes)
    except Exception as e:  # noqa: BLE001
        print(f"   communes indisponibles ({e}) : la carte sera tracée sans elles")
        communes = []

    for com in communes:
        cells = [p for p in range(nb_pix) if indice[p] is not None
                 and dans_polygone(*centre(p), com["anneau"])]
        # Surface totale de la commune (formule du lacet, en projection locale)
        pts = [latlon_vers_sin(lat, lon) for lon, lat in com["anneau"]]
        aire = abs(sum(pts[i][0] * pts[i - 1][1] - pts[i - 1][0] * pts[i][1]
                       for i in range(len(pts)))) / 2 / 1e6
        com["stats"] = {
            "cellules": len(cells),
            "surface_km2": round(len(cells) * cs * cs / 1e6, 1),
            "surface_commune_km2": round(aire, 1),
            "pente_moyenne": moyenne([pente[p] for p in cells]),
            "part_pente_sup_15": moyenne([1.0 if pente[p] > 15 else 0.0 for p in cells]),
            "ndvi_moyen": moyenne([ndvi_cell[p] for p in cells if ndvi_cell[p] is not None]),
            "indice_moyen": moyenne([indice[p] for p in cells]),
            "part_indice_sup_04": moyenne([1.0 if indice[p] >= 0.4 else 0.0 for p in cells]),
        }
        print(f"   {com['nom']}: {com['stats']}")

    return {
        "grille": G, "rayon_sinusoidal": R_SIN,
        "terre": [1 if t else 0 for t in terre],
        "pente": pente, "altitude": altitude, "ndvi": ndvi_cell, "indice": indice,
        "periode_ndvi": [limite, FIN],
        "formule": {"pente_ref": PENTE_REF, "ndvi_dense": NDVI_DENSE, "ndvi_nu": NDVI_NU},
        "communes": communes,
        "sources": SOURCES_CARTE,
    }


print("3/4  Carte (relief SRTM, NDVI par cellule, communes)...")
try:
    carte = construire_carte()
    valides = [v for v in carte["indice"] if v is not None]
    print(f"   {len(valides)} cellules cartographiées, indice médian "
          f"{statistics.median(valides):.2f}, maximum {max(valides):.2f}")
except Exception as e:  # noqa: BLE001
    carte = None
    print(f"   carte non générée ({e}) : le reste de l'application n'est pas affecté")

# ---------------- 4. Exports ----------------
print("4/4  Écriture des fichiers...")

# 3a. Journalier
with open(chemin(f"bukavu_terrapulse_nasa_journalier_{SUFFIXE}.csv"), "w",
          newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["date", "precipitation_mm", "humidite_sol_pourcent",
                "humidite_racinaire_pourcent", "region"])
    for j in jours:
        w.writerow(["" if x is None else x for x in j] + [REGION])

# 3b. NDVI 16 jours
with open(chemin(f"bukavu_terrapulse_nasa_ndvi_16j_{SUFFIXE}.csv"), "w",
          newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["date_debut_composite", "ndvi_moyen_vegetation",
                "ndvi_pixels_valides", "region"])
    for c in composites:
        w.writerow(c + [REGION])

# 3c. Mensuel (même format que l'ancien CSV du projet)
mois = {}
for date, p, t, r in jours:
    m = mois.setdefault(date[:7], {"p": [], "t": [], "r": [], "n": [], "pix": 0})
    if p is not None:
        m["p"].append(p)
    if t is not None:
        m["t"].append(t)
    if r is not None:
        m["r"].append(r)
for date, v, n in composites:
    if date[:7] in mois:
        mois[date[:7]]["n"].append(v)
        mois[date[:7]]["pix"] += n

manquants = []
with open(chemin(f"bukavu_terrapulse_nasa_{SUFFIXE}.csv"), "w",
          newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["date", "precipitation_mensuelle_mm", "humidite_sol_pourcent",
                "ndvi_moyen_vegetation", "region",
                "humidite_racinaire_pourcent", "ndvi_pixels_valides"])
    for cle, m in sorted(mois.items()):
        an, mo = int(cle[:4]), int(cle[5:7])
        if not (m["p"] and m["t"] and m["n"]):
            manquants.append(cle)
        w.writerow([
            f"{cle}-{calendar.monthrange(an, mo)[1]:02d}",
            round(sum(m["p"]), 1) if m["p"] else "",
            round(statistics.mean(m["t"]), 1) if m["t"] else "",
            round(statistics.mean(m["n"]), 3) if m["n"] else "",
            REGION,
            round(statistics.mean(m["r"]), 1) if m["r"] else "",
            m["pix"],
        ])

# 3d. Fichier de données de l'application web (fonctionne en double-cliquant le HTML)
donnees = {
    "meta": {
        "genere_le": dt.date.today().isoformat(),
        "zone": "Bukavu / Lac Kivu (RDC)",
        "latitude": LAT, "longitude": LON,
        "fenetre_ndvi_km": 2 * KM_AUTOUR,
        "periode": [DEBUT, FIN],
        "sources": SOURCES,
    },
    "journalier": {
        "debut": DEBUT,
        "precipitation": [j[1] for j in jours],
        "humidity": [j[2] for j in jours],
    },
    "ndvi": [[c[0], c[1]] for c in composites],
    "carte": carte,
}
with open(chemin("terrapulse_data.js"), "w", encoding="utf-8") as f:
    f.write("// Généré par telecharger_donnees_nasa.py - ne pas modifier à la main.\n")
    f.write("window.TERRAPULSE_DATA = ")
    json.dump(donnees, f, ensure_ascii=False, separators=(",", ":"))
    f.write(";\n")

print(f"\nTerminé : {len(jours)} jours, {len(composites)} composites NDVI, "
      f"{len(mois)} mois.")
print("Mois incomplets :", ", ".join(manquants) if manquants else "aucun")
