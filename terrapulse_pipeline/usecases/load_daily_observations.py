"""Cas d'utilisation : charger les observations journalières NASA POWER."""
from ..data.power import fetch_daily


def load_daily_observations(config):
    return fetch_daily(config)
