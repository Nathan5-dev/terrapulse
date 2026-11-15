# TERRAPULSE

**Listen to Earth. Understand Change. Predict Tomorrow.**

A seasonal landslide and soil-erosion monitoring prototype for Bukavu, Democratic Republic of the Congo, built by **Kivu EarthLab** for the **NASA Space Apps Challenge 2026**.

TerraPulse helps communities and local decision-makers understand **when** environmental conditions may require attention and **where** vulnerable slopes are located. It is a prevention and planning tool, not a real-time warning system.

## Demo

1. Install Python 3.9 or later.
2. From the project folder, run:

   ```bash
   python3 serve_terrapulse.py
   ```

3. Open [http://127.0.0.1:8000](http://127.0.0.1:8000).

The site starts with the bundled `terrapulse_data.js` dataset and attempts to refresh it from the APIs. If the refresh fails, the local dataset remains available. Internet access is needed for live updates, map tiles, and the web libraries. No API key is required.

## What the demo includes

- Historical rainfall, soil-moisture, and vegetation (NDVI) charts with daily, weekly, monthly, and yearly views.
- Seasonal forecasts for the next 3, 6, or 12 months, with 80% prediction intervals and a monthly risk assessment.
- An interactive vulnerability map with satellite and terrain basemaps, slope, NDVI, elevation, and coordinates.
- Explanations of each chart, its local relevance, and the mathematical model.
- CSV, JSON, and PDF exports, plus French and English interface options.

## Where the data comes from

The dataset starts on **February 18, 2000**, the first date available in the MODIS/Terra product used by the project. The latest observation date can differ by source.

| Data | Source | Resolution / use |
| --- | --- | --- |
| Rainfall (`PRECTOTCORR`) and surface soil moisture (`GWETTOP`) | [NASA POWER](https://power.larc.nasa.gov) | Daily, regional model data |
| Vegetation index (NDVI), product MOD13Q1 v6.1 | [NASA MODIS/Terra via ORNL DAAC](https://modis.ornl.gov) | 250 m, 16-day composites |
| Elevation and slope | [NASA SRTM terrain tiles](https://registry.opendata.aws/terrain-tiles/) | About 30 m |
| Commune boundaries | [OpenStreetMap](https://www.openstreetmap.org/copyright), via Nominatim | Kadutu, Ibanda, and Bagira |

Rainfall and soil moisture are regional NASA model estimates, not measurements at individual slopes. The map combines terrain slope and vegetation cover into a 0–1 vulnerability index. Its thresholds are working assumptions and have not been validated against a local landslide inventory.

## How the app works

Choose a date range, time step, and forecast horizon. TerraPulse displays rainfall, soil-moisture, and NDVI charts, then estimates monthly seasonal patterns for the next 3, 6, or 12 months. The map highlights terrain with steeper slopes and less vegetation; hover over a cell to inspect its values and coordinates. Filtered results can be exported as CSV, JSON, or PDF.

## For judges and testers

Try changing the date range and time step, compare forecast horizons, switch map layers and basemaps, hover over a map cell to inspect its values, and export a filtered report. The map links **when** the forecast signals increased seasonal attention with **where** terrain vulnerability is higher.

The first live refresh may take several minutes while MODIS data are retrieved. The bundled dataset lets the demo start immediately and remains available if an API is unavailable.

## Data attribution

NASA POWER, NASA MODIS/Terra MOD13Q1 v6.1, and NASA SRTM. Commune boundaries © OpenStreetMap contributors (ODbL). Basemaps © Esri and their respective data providers.

---

*Kivu EarthLab · Bukavu, DRC*
