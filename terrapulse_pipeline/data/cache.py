"""Cache JSON sur disque (Data)."""
import json
from pathlib import Path


def ensure_dir(path):
    Path(path).mkdir(parents=True, exist_ok=True)


def cached_json(directory, name, factory):
    """Lit directory/name s'il existe, sinon appelle factory() et l'enregistre."""
    path = Path(directory) / name
    if path.exists():
        with path.open(encoding="utf-8") as handle:
            return json.load(handle)

    result = factory()
    ensure_dir(directory)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(result, handle)
    return result
