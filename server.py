import http.server
import socketserver
import json
import os
import base64

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class RSAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_POST(self):
        if self.path == '/api/save-products':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length)
                payload = json.loads(post_data.decode('utf-8'))
                products = payload.get('products', [])

                if not products:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(b'{"error": "No products provided"}')
                    return

                # Format products.js code
                code_lines = [
                    "// RSA Products Data",
                    "const RSA_CONFIG = {",
                    "  whatsapp: '918789281276',",
                    "  ytApiKey: '' // Handled by GitHub Actions.",
                    "};",
                    "",
                    "const RSA_PRODUCTS = ["
                ]

                for p in products:
                    code_lines.append("  {")
                    code_lines.append(f"    id: {p.get('id')},")
                    code_lines.append(f"    title: {json.dumps(p.get('title'))},")
                    code_lines.append(f"    img: {json.dumps(p.get('img'))},")
                    if p.get('img2'):
                        code_lines.append(f"    img2: {json.dumps(p.get('img2'))},")
                    code_lines.append(f"    price: {p.get('price')},")
                    if p.get('original_price'):
                        code_lines.append(f"    original_price: {p.get('original_price')},")
                    code_lines.append(f"    category: {json.dumps(p.get('category'))},")
                    code_lines.append(f"    type: {json.dumps(p.get('type') or 'neon')},")
                    if p.get('size'):
                        code_lines.append(f"    size: {json.dumps(p.get('size'))},")
                    if p.get('description'):
                        code_lines.append(f"    description: {json.dumps(p.get('description'))},")
                    yt_id = json.dumps(p.get('yt_id', '') or '')
                    views = p.get('views', 0) or 0
                    likes = p.get('likes', 0) or 0
                    code_lines.append(f"    yt_id: {yt_id}, views: {views}, likes: {likes}")
                    code_lines.append("  },")

                code_lines.append("];")
                code_lines.append("")

                full_code = "\n".join(code_lines)

                # Save to products.js in DIRECTORY and ../rsa-store if exists
                target_dirs = [DIRECTORY]
                alt_dir = os.path.abspath(os.path.join(DIRECTORY, '..', 'rsa-store'))
                if os.path.isdir(alt_dir) and alt_dir != DIRECTORY:
                    target_dirs.append(alt_dir)

                for d in target_dirs:
                    target_file = os.path.join(d, 'products.js')
                    with open(target_file, 'w', encoding='utf-8') as f:
                        f.write(full_code)

                # If stats exist, update stats.json too
                stats_map = {}
                for p in products:
                    vid = p.get('yt_id')
                    if vid and (p.get('views') or p.get('likes')):
                        stats_map[vid] = {
                            'views': p.get('views', 0),
                            'likes': p.get('likes', 0)
                        }
                if stats_map:
                    for d in target_dirs:
                        stats_file = os.path.join(d, 'stats.json')
                        with open(stats_file, 'w', encoding='utf-8') as sf:
                            json.dump(stats_map, sf, indent=2)

                print(f"Successfully saved {len(products)} products to products.js!")

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(b'{"status": "ok", "message": "Successfully saved to products.js"}')
                return
            except Exception as e:
                print(f"Error saving products: {e}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                err_msg = json.dumps({"error": str(e)}).encode('utf-8')
                self.wfile.write(err_msg)
                return

        elif self.path == '/api/upload-image':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length)
                payload = json.loads(post_data.decode('utf-8'))
                filename = payload.get('filename')
                data_str = payload.get('data', '')

                if not filename or not data_str:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(b'{"error": "Missing filename or data"}')
                    return

                if ',' in data_str:
                    data_str = data_str.split(',', 1)[1]

                img_bytes = base64.b64decode(data_str)
                safe_name = os.path.basename(filename)

                target_dirs = [DIRECTORY]
                alt_dir = os.path.abspath(os.path.join(DIRECTORY, '..', 'rsa-store'))
                if os.path.isdir(alt_dir) and alt_dir != DIRECTORY:
                    target_dirs.append(alt_dir)

                for d in target_dirs:
                    img_dir = os.path.join(d, 'images')
                    os.makedirs(img_dir, exist_ok=True)
                    target_path = os.path.join(img_dir, safe_name)
                    with open(target_path, 'wb') as f:
                        f.write(img_bytes)

                rel_path = f"images/{safe_name}"
                print(f"Successfully uploaded image: {rel_path} ({len(img_bytes)} bytes)")

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "ok", "path": rel_path}).encode('utf-8'))
                return
            except Exception as e:
                print(f"Error uploading image: {e}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                err_msg = json.dumps({"error": str(e)}).encode('utf-8')
                self.wfile.write(err_msg)
                return

        super().do_POST()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), RSAHandler) as httpd:
        print(f"RSA Store Server running at http://localhost:{PORT}/")
        print(f"Private Admin Dashboard: http://localhost:{PORT}/admin.html")
        httpd.serve_forever()
