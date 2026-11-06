"""Local, read-only sample library. Art stays in the project's art/ directory."""

from __future__ import annotations

import argparse
from functools import partial
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import mimetypes
from pathlib import Path
from urllib.parse import unquote, urlsplit


def resolve_asset(root: Path, request_path: str) -> Path | None:
    decoded = unquote(urlsplit(request_path).path)
    if decoded.startswith('/art/'):
        base, suffix = root / 'art', decoded[5:]
    elif decoded.startswith('/assets/'):
        base, suffix = root / 'game/public/assets', decoded[8:]
    else:
        base, suffix = root / 'game', decoded.lstrip('/') or 'index.html'
    base = base.resolve()
    candidate = (base / suffix).resolve()
    if not candidate.is_relative_to(base):
        return None
    if any(part.startswith('.') for part in candidate.relative_to(base).parts):
        return None
    return candidate if candidate.is_file() else None


class PreviewHandler(BaseHTTPRequestHandler):
    def __init__(self, *args, project_root: Path, **kwargs):
        self.project_root = project_root
        super().__init__(*args, **kwargs)

    def do_GET(self):
        self.serve_file(include_body=True)

    def do_HEAD(self):
        self.serve_file(include_body=False)

    def serve_file(self, *, include_body: bool):
        try:
            path = resolve_asset(self.project_root, self.path)
            if path is None:
                self.send_error(404)
                return
            data = path.read_bytes()
        except (OSError, ValueError):
            self.send_error(404)
            return
        content_type = mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
        if path.suffix in {'.js', '.css', '.html', '.json', '.txt', '.md'}:
            content_type = {'.js': 'text/javascript', '.json': 'application/json'}.get(path.suffix, content_type)
            content_type += '; charset=utf-8'
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Security-Policy', "default-src 'self'; img-src 'self' blob: data:; style-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'")
        self.end_headers()
        if include_body:
            self.wfile.write(data)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--port', type=int, default=4173)
    args = parser.parse_args()
    root = args.root.resolve()
    if not (root / 'game/index.html').is_file() or not 1 <= args.port <= 65535:
        parser.error('Use this project root and a port from 1 to 65535')
    server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(PreviewHandler, project_root=root))
    print(f'Local: http://127.0.0.1:{args.port}/#/samples/characters/clone_01', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
