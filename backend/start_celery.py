import os
import sys
import subprocess
import threading
import http.server
import socketserver

def start_web_server():
    port = int(os.getenv("PORT", "10000"))
    class HealthCheckHandler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            self.send_response(200)
            self.send_header("Content-type", "text/plain")
            self.end_headers()
            self.wfile.write(b"OK")

        def do_HEAD(self):
            self.send_response(200)
            self.send_header("Content-type", "text/plain")
            self.end_headers()

        def log_message(self, format, *args):
            return

    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("0.0.0.0", port), HealthCheckHandler) as httpd:
            print(f"Health check server listening on 0.0.0.0:{port}")
            httpd.serve_forever()
    except Exception as e:
        print(f"Health check server error: {e}")

if __name__ == "__main__":
    # Start dummy health check server for Render port scan requirement
    web_thread = threading.Thread(target=start_web_server, daemon=True)
    web_thread.start()

    print("Starting Celery worker...")
    cmd = [
        sys.executable, "-m", "celery", "-A", "workers.celery_worker", "worker",
        "--loglevel=info", "--pool=solo"
    ]
    subprocess.run(cmd)
