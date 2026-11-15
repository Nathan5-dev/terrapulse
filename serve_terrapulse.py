"""Serve TerraPulse and refresh its local dataset from APIs when possible."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import threading

from terrapulse_pipeline.cli import fetch_live_dataset

ROOT = Path(__file__).resolve().parent
REFRESH_LOCK = threading.Lock()


class TerraPulseHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        if self.path.split("?", 1)[0] != "/api/data":
            return super().do_GET()

        if not REFRESH_LOCK.acquire(blocking=False):
            return self._json(409, {"ok": False, "error": "actualisation déjà en cours"})

        try:
            result = fetch_live_dataset()
            return self._json(200, {"ok": True, **result})
        except Exception as exc:  # noqa: BLE001
            return self._json(200, {"ok": False, "error": str(exc)})
        finally:
            REFRESH_LOCK.release()

    def _json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 8000), TerraPulseHandler)
    print("TerraPulse : http://127.0.0.1:8000")
    print("Arrêter avec Ctrl+C")
    server.serve_forever()
