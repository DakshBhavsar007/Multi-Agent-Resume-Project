import os
import subprocess
import threading
import http.server
import socketserver

def start_web_server():
    port = int(os.getenv("PORT", "8000"))
    class HealthCheckHandler(http.server.SimpleHTTPRequestHandler):
        def do_GET(self):
            if self.path == "/healthz" or self.path == "/":
                self.send_response(200)
                self.send_header("Content-type", "text/plain")
                self.end_headers()
                self.wfile.write(b"OK")
            else:
                self.send_response(404)
                self.end_headers()
                
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", port), HealthCheckHandler) as httpd:
        print(f"Serving health check on port {port}")
        httpd.serve_forever()

if __name__ == "__main__":
    # Start the dummy web server in a separate thread for Render health check
    web_thread = threading.Thread(target=start_web_server, daemon=True)
    web_thread.start()
    
    # Run Celery worker in solo pool mode to minimize memory usage
    print("Starting Celery worker in solo mode...")
    cmd = [
        "celery", "-A", "workers.celery_worker", "worker",
        "--loglevel=info", "--pool=solo"
    ]
    subprocess.run(cmd)
