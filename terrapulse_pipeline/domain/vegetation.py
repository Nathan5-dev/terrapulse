"""Traitement du NDVI (Domain).

Le masque du lac, les composites et la moyenne par cellule sont des règles
métier : elles ne connaissent ni HTTP, ni le cache, ni le format de sortie.
"""
import statistics

NDVI_SCALE = 0.0001
MIN_VALID_FRACTION = 0.10


def pixel_is_valid(reliability, date, pixel, value):
    """Pixel observé correctement : fiabilité 0 (bon) ou 1 (acceptable)."""
    return date in reliability and reliability[date][pixel] in (0, 1) and value > -2000


def build_pixel_series(ndvi_raw, reliability):
    """Séries NDVI par pixel, exprimées en unités NDVI (pas en entiers MODIS)."""
    pixel_count = len(next(iter(ndvi_raw.values())))
    series = [[] for _ in range(pixel_count)]
    for date, values in ndvi_raw.items():
        for pixel, value in enumerate(values):
            if pixel_is_valid(reliability, date, pixel, value):
                series[pixel].append(value * NDVI_SCALE)
    return series


def land_mask(series, water_threshold):
    """Pixels terrestres : NDVI médian au moins égal au seuil d'eau."""
    return [
        len(values) > 0 and statistics.median(values) >= water_threshold
        for values in series
    ]


def build_composites(ndvi_raw, reliability, land, min_fraction=MIN_VALID_FRACTION):
    """Composites 16 jours : [date, NDVI moyen, nombre de pixels valides]."""
    land_count = sum(land)
    composites = []
    for date, values in sorted(ndvi_raw.items()):
        good = [
            value * NDVI_SCALE
            for pixel, value in enumerate(values)
            if land[pixel] and pixel_is_valid(reliability, date, pixel, value)
        ]
        # On exige qu'au moins 10 % de la zone terrestre soit observée.
        if land_count and len(good) >= min_fraction * land_count:
            composites.append([date, round(sum(good) / len(good), 4), len(good)])
    return composites


def build_cell_ndvi(ndvi_raw, reliability, land, min_date, pixel_count):
    """NDVI moyen de chaque cellule sur les 12 derniers mois de la période."""
    sums = [0.0] * pixel_count
    counts = [0] * pixel_count
    for date, values in ndvi_raw.items():
        if date <= min_date:
            continue
        for pixel, value in enumerate(values):
            if pixel_is_valid(reliability, date, pixel, value):
                sums[pixel] += value * NDVI_SCALE
                counts[pixel] += 1
    return [
        round(sums[pixel] / counts[pixel], 3) if counts[pixel] else None
        for pixel in range(pixel_count)
    ]
