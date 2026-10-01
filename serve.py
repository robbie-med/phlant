#!/usr/bin/env python3
"""Static server for the built PWA (dist/). Port 3510 is registered in /home/user/Projects/PORTS.md.
No framework: stdlib only, loopback bind, correct manifest MIME, no-cache on the HTML and service worker."""
import mimetypes, os, sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dist')
PORT = int(os.environ.get('PORT', '3510'))
mimetypes.add_type('application/manifest+json', '.webmanifest')
mimetypes.add_type('image/svg+xml', '.svg')
mimetypes.add_type('application/javascript', '.js')

class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def end_headers(self):
        p = self.path.split('?')[0]
        if p in ('/', '/index.html', '/sw.js', '/manifest.webmanifest', '/registerSW.js') or p.startswith('/workbox-'):
            self.send_header('Cache-Control', 'no-cache')
        elif p.startswith('/assets/'):
            self.send_header('Cache-Control', 'public, max-age=31536000, immutable')
        super().end_headers()
    def log_message(self, fmt, *args): sys.stderr.write("%s %s\n" % (self.address_string(), fmt % args))

if __name__ == '__main__':
    if not os.path.isdir(ROOT): sys.exit('dist/ missing — run npm run build first')
    ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
