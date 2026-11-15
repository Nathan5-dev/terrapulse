"""Primitives de géométrie pure (Domain).

Aucune dépendance aux sources de données ni au système de fichiers.
"""
import math


def sin_to_latlon(x, y, radius):
    """Convertit une coordonnée de la grille sinusoïdale MODIS en (lat, lon)."""
    lat = y / radius
    return math.degrees(lat), math.degrees(x / (radius * math.cos(lat)))


def latlon_to_sin(lat, lon, radius):
    """Convertit (lat, lon) en coordonnées de la grille sinusoïdale MODIS."""
    la = math.radians(lat)
    return radius * math.radians(lon) * math.cos(la), radius * la


def point_in_polygon(lat, lon, ring):
    """Test du point dans un polygone (ring = liste de [lon, lat])."""
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if (yi > lat) != (yj > lat) and lon < (xj - xi) * (lat - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def polygon_area_km2(ring, radius):
    """Surface d'un anneau en projection locale, en km²."""
    pts = [latlon_to_sin(lat, lon, radius) for lon, lat in ring]
    area = abs(sum(
        pts[i][0] * pts[i - 1][1] - pts[i - 1][0] * pts[i][1]
        for i in range(len(pts))
    )) / 2 / 1e6
    return area
