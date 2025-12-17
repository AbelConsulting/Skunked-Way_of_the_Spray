#!/usr/bin/env python3
"""Simple static file server that injects a per-request CSP nonce into index.html
and sets a header-based CSP allowing scripts from 'self' and the nonce.
"""
import http.server
import socketserver
import base64
import os
import logging
import traceback
from urllib.parse import unquote, urlparse

PORT = 8001
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

# Enable basic logging
logging.basicConfig(level=logging.INFO, format='[CSP SERVER] %(message)s')

class CSPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Serve files relative to project root
        path = urlparse(path).path
        path = unquote(path)
        if path == '/' or path == '/index.html':
            return os.path.join(ROOT, 'index.html')
        return os.path.join(ROOT, path.lstrip('/'))

    def end_headers(self):
        # If serving index, generate nonce and set CSP header
        if self.path == '/' or self.path == '/index.html':
            nonce = base64.b64encode(os.urandom(16)).decode('ascii')
            # Separate rules: inline scripts via nonce; external script elements allowed from Cloudflare
            csp = (
                "script-src 'self' 'nonce-" + nonce + "'; "
                "script-src-elem 'self' https://static.cloudflareinsights.com; "
                "object-src 'none'; base-uri 'self';"
            )
            self.send_header('Content-Security-Policy', csp)
            # Also expose nonce to downstream (not required, we inject into body)
            self.server.current_nonce = nonce
            logging.info(f"Set CSP header on {self.path}: {csp}")
        super().end_headers()

    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            for index in ("index.html",):
                index_path = os.path.join(path, index)
                if os.path.exists(index_path):
                    path = index_path
                    break
        if path.endswith('index.html') and os.path.exists(path):
            # Read and inject nonce placeholder
            try:
                with open(path, 'rb') as f:
                    data = f.read().decode('utf-8')
            except Exception:
                return http.server.SimpleHTTPRequestHandler.send_head(self)
            # Ensure nonce is generated (end_headers sets it)
            nonce = base64.b64encode(os.urandom(16)).decode('ascii')
            # Include script-src-elem to explicitly allow external <script> elements
            csp = (
                "script-src 'self' 'nonce-" + nonce + "' https://static.cloudflareinsights.com; "
                "script-src-elem 'self' 'nonce-" + nonce + "' https://static.cloudflareinsights.com; "
                "object-src 'none'; base-uri 'self';"
            )
            self.send_response(200)
            self.send_header('Content-type', 'text/html; charset=utf-8')
            self.send_header('Content-Security-Policy', csp)
            logging.info(f"Injected nonce into index and set CSP: {csp}")
            self.end_headers()
            body = data.replace('%CSP_NONCE%', nonce)
            return io.BytesIO(body.encode('utf-8'))
        return http.server.SimpleHTTPRequestHandler.send_head(self)

if __name__ == '__main__':
    import io
    Handler = CSPRequestHandler
    # Allow quick restarts on the same port
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        logging.info(f"Serving on port {PORT} with header-based CSP and per-request nonce")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            logging.info('Shutting down (KeyboardInterrupt)')
            httpd.server_close()
        except Exception as e:
            logging.info('Server crashed with exception:')
            traceback.print_exc()
            httpd.server_close()
