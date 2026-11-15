"""Accès HTTP avec réessais (Data)."""
import json
import ssl
import time
import urllib.request
from pathlib import Path


def _ssl_context():
    """
    Contexte TLS avec un bundle de CA utilisable.

    Certaines installations Python (notamment sur macOS) n'embarquent pas de
    certificats racine. On réutilise alors le bundle du système, ou certifi
    lorsqu'il est installé, sans jamais désactiver la vérification.
    """
    default = ssl.get_default_verify_paths().cafile
    if default and Path(default).exists():
        return None

    candidates = []
    try:
        import certifi  # dépendance optionnelle
        candidates.append(certifi.where())
    except ImportError:
        pass
    candidates += [
        "/etc/ssl/cert.pem",
        "/etc/ssl/certs/ca-certificates.crt",
        "/etc/pki/tls/certs/ca-bundle.crt",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ssl.create_default_context(cafile=candidate)
    return None


_SSL_CONTEXT = _ssl_context()


def open_url(request, timeout=180):
    """Ouvre une URL avec le contexte TLS adapté à la plateforme."""
    return urllib.request.urlopen(request, timeout=timeout, context=_SSL_CONTEXT)


def get_json(url, attempts=5, timeout=180):
    """GET JSON avec quelques réessais (les serveurs NASA sont parfois lents)."""
    for i in range(attempts):
        try:
            req = urllib.request.Request(url, headers={
                "Accept": "application/json",
                "User-Agent": "python-urllib",
            })
            with open_url(req, timeout=timeout) as response:
                return json.loads(response.read().decode("utf-8"))
        except Exception as exc:  # noqa: BLE001
            if i == attempts - 1:
                raise
            print(f"   nouvel essai ({exc})")
            time.sleep(5 * (i + 1))
