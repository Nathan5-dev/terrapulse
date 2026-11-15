"""Relief et pente (Domain).

Les altitudes HGT sont fournies par la couche Data ; ce module ne fait que
les transformer en pente moyenne et altitude moyenne par cellule MODIS.
"""
import math

from .geometry import latlon_to_sin

HGT_SIZE = 3601
EARTH_RADIUS_M = 6371008.8
ARCSECONDS_PER_DEGREE = 3600


def slope_and_altitude(
    heights, hgt_size, lat0, lon0,
    lat_min, lat_max, lon_min, lon_max,
    grid, pixel_count, radius,
):
    """Pente moyenne (degrés) et altitude moyenne (m) de chaque cellule.

    heights : tableau d'altitudes HGT, du nord au sud.
    grid    : {xll, yll, cs, nrows, ncols} de la grille MODIS.
    """
    xll, yll = grid["xll"], grid["yll"]
    cs, nrows, ncols = grid["cs"], grid["nrows"], grid["ncols"]

    i_min = max(1, int((lat0 + 1 - lat_max) * ARCSECONDS_PER_DEGREE) - 1)
    i_max = min(hgt_size - 2, int((lat0 + 1 - lat_min) * ARCSECONDS_PER_DEGREE) + 1)
    j_min = max(1, int((lon_min - lon0) * ARCSECONDS_PER_DEGREE) - 1)
    j_max = min(hgt_size - 2, int((lon_max - lon0) * ARCSECONDS_PER_DEGREE) + 1)

    # 1 arc-seconde en mètres (~30,9 m).
    step = 2 * math.pi * EARTH_RADIUS_M / 360 / ARCSECONDS_PER_DEGREE

    slope_sum = [0.0] * pixel_count
    altitude_sum = [0.0] * pixel_count
    dem_count = [0] * pixel_count

    for i in range(i_min, i_max + 1):
        lat = lat0 + 1 - i / ARCSECONDS_PER_DEGREE
        dx = step * math.cos(math.radians(lat))
        for j in range(j_min, j_max + 1):
            k = i * hgt_size + j
            v = (
                heights[k], heights[k - 1], heights[k + 1],
                heights[k - hgt_size], heights[k + hgt_size],
            )
            if min(v) < -1000:          # trou dans les données SRTM
                continue

            x, y = latlon_to_sin(lat, lon0 + j / ARCSECONDS_PER_DEGREE, radius)
            c, r = int((x - xll) // cs), nrows - 1 - int((y - yll) // cs)
            if 0 <= c < ncols and 0 <= r < nrows:
                pixel = r * ncols + c
                gx = (v[2] - v[1]) / (2 * dx)
                gy = (v[3] - v[4]) / (2 * step)
                slope_sum[pixel] += math.degrees(math.atan(math.hypot(gx, gy)))
                altitude_sum[pixel] += v[0]
                dem_count[pixel] += 1

    slope = [
        round(slope_sum[p] / dem_count[p], 1) if dem_count[p] else None
        for p in range(pixel_count)
    ]
    altitude = [
        round(altitude_sum[p] / dem_count[p]) if dem_count[p] else None
        for p in range(pixel_count)
    ]
    return slope, altitude
