"""Local preview of static files with exact rules from Cloudflare _redirects."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def redirect(self):
        path = unquote(urlsplit(self.path).path)
        rules = ROOT / '_redirects'
        if not rules.is_file():
            return False
        for line in rules.read_text(encoding='utf-8').splitlines():
            if not line.strip() or line.lstrip().startswith('#'):
                continue
            fields = line.split()
            if len(fields) not in (2, 3):
                continue
            source, target = fields[:2]
            if '*' in source or ':' in source:
                continue  # This preview implements exact local rules only.
            status = fields[2] if len(fields) == 3 else '302'
            if unquote(source) != path or status not in ('301', '302', '303', '307', '308'):
                continue
            self.send_response(int(status))
            self.send_header('Location', target)
            self.send_header('Content-Length', '0')
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            return True
        return False

    def do_GET(self):
        if not self.redirect():
            super().do_GET()

    def do_HEAD(self):
        if not self.redirect():
            super().do_HEAD()

def make_server(port):
    return ThreadingHTTPServer(('127.0.0.1', port), Handler)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8770)
    args = parser.parse_args()
    with make_server(args.port) as server:
        print('Preview: http://127.0.0.1:{}/ (Ctrl+C to stop)'.format(server.server_port), flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass

