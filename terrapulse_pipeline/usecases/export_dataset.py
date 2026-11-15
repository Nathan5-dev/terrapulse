"""Cas d'utilisation : exporter le jeu de données collecté."""
from ..data.writers import write_all


def export_dataset(config, days, composites, map_data, output_dir=None):
    return write_all(config, days, composites, map_data, output_dir)
