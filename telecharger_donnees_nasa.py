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
  - terrapulse_data.js                               -> chargé par l'application web
  - bukavu_terrapulse_nasa_2021_2025.csv             -> mensuel (format historique)
  - bukavu_terrapulse_nasa_journalier_2021_2025.csv  -> pluie + humidité par jour
  - bukavu_terrapulse_nasa_ndvi_16j_2021_2025.csv    -> NDVI par composite 16 jours

L'implémentation est découpée en couches dans le paquet terrapulse_pipeline/
(configuration, domain, data, usecases). Les réponses MODIS sont mises en cache
dans cache_modis/, le relief et les communes dans cache_carte/ : une relance est
rapide. Supprimez ces dossiers pour forcer un nouveau téléchargement.
"""
from terrapulse_pipeline.cli import main

if __name__ == "__main__":
    main()
