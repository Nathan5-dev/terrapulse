"""
TerraPulse - téléchargement des vraies données NASA pour Bukavu.

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
  - terrapulse_data.js                               -> jeu local utilisé au démarrage du site
  - bukavu_terrapulse_nasa_2000_<année_actuelle>.csv             -> mensuel
  - bukavu_terrapulse_nasa_journalier_2000_<année_actuelle>.csv  -> pluie + humidité par jour
  - bukavu_terrapulse_nasa_ndvi_16j_2000_<année_actuelle>.csv    -> NDVI par composite 16 jours

L'implémentation est découpée en couches dans le paquet terrapulse_pipeline/
(configuration, domain, data, usecases). Cet outil d'export utilise les caches
cache_modis/ et cache_carte/. Le site lit terrapulse_data.js au démarrage, puis
le serveur tente de rafraîchir ce jeu local via les API.
"""
from terrapulse_pipeline.cli import main

if __name__ == "__main__":
    main()
