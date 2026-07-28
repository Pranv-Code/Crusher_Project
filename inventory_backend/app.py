# ---------------------------------------------------------
# Crusher Inventory System - Backend Application
# Modified to run as a Windows System Tray App using pystray
# ---------------------------------------------------------

from flask import Flask, jsonify, json, send_from_directory
from flask_cors import CORS
from db import get_connection
from werkzeug.exceptions import HTTPException

from routes.product_routes import product_bp
from routes.production_routes import production_bp
from routes.vehicle_routes import vehicle_bp
from routes.vehicle_activity_routes import vehicle_activity_bp
from routes.party_routes import party_bp
from routes.sales_routes import sales_bp
from routes.vehicle_sale_routes import vehicle_sale_bp
from routes.reports_routes import reports_bp
from routes.auth_routes import auth_bp
from routes.user_routes import user_bp
from routes.approval_routes import approval_bp
from routes.settings_routes import settings_bp
from routes.audit_routes import audit_bp
from routes.goods_return_routes import goods_return_bp
from routes.crusher_routes import crusher_bp

import os
import sys
import socket
import logging
import threading
import webbrowser
import ctypes
from PIL import Image, ImageDraw
import pystray
from waitress.server import create_server

# ---------------------------------------------------------
# Logging Configuration (Requirement 3)
# Save all server logs to logs/server.log instead of console
# ---------------------------------------------------------
def get_log_dir():
    """Get absolute path to logs directory for dev and PyInstaller env."""
    if hasattr(sys, '_MEIPASS'):
        base_dir = os.path.dirname(sys.executable)
    else:
        base_dir = os.path.dirname(os.path.abspath(__file__))
    log_dir = os.path.join(base_dir, "logs")
    os.makedirs(log_dir, exist_ok=True)
    return log_dir

log_directory = get_log_dir()
log_file_path = os.path.join(log_directory, "server.log")

logging.basicConfig(
    filename=log_file_path,
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("CrusherServer")


def get_resource_path(relative_path):
    """ Get absolute path to resource, works for dev and for PyInstaller """
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, relative_path)
    base_dir = os.path.dirname(os.path.abspath(__file__))
    path1 = os.path.abspath(os.path.join(base_dir, "..", relative_path))
    if os.path.exists(path1):
        return path1
    path2 = os.path.abspath(os.path.join(base_dir, relative_path))
    return path2

dist_folder = get_resource_path("inventory_frontend/dist")
if not os.path.exists(dist_folder):
    dist_folder = get_resource_path("dist")

app = Flask(__name__, static_folder=None)
app.static_folder = dist_folder

CORS(app, resources={r"/api/*": {"origins": "*"}})

# -------------------------
# Global Error Handling
# -------------------------
@app.errorhandler(Exception)
def handle_exception(e):
    # Pass through HTTP exceptions (404, 405, etc.)
    if isinstance(e, HTTPException):
        response = e.get_response()
        response.data = json.dumps({
            "error": e.name,
            "message": e.description
        })
        response.content_type = "application/json"
        return response

    # Handle all other uncaught python exceptions with logging
    logger.error(f"Unhandled exception occurred: {str(e)}", exc_info=True)

    return jsonify({
        "error": "Internal Server Error",
        "message": str(e)
    }), 500

# -------------------------
# Test Database Connection API
# -------------------------
@app.route("/api/db-status")
def db_status():
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT DATABASE();")
        db = cursor.fetchone()

        cursor.close()
        conn.close()

        return {
            "status": "Connected",
            "database": db[0]
        }

    except Exception as e:
        return {"error": str(e)}, 500

# Register Blueprints
app.register_blueprint(product_bp)
app.register_blueprint(production_bp)
app.register_blueprint(vehicle_bp)
app.register_blueprint(vehicle_activity_bp)
app.register_blueprint(party_bp)
app.register_blueprint(sales_bp)
app.register_blueprint(vehicle_sale_bp)
app.register_blueprint(reports_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(user_bp)
app.register_blueprint(approval_bp)
app.register_blueprint(settings_bp)
app.register_blueprint(audit_bp)
app.register_blueprint(goods_return_bp)
app.register_blueprint(crusher_bp)

# -------------------------
# React SPA Catch-All Route
# -------------------------
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_spa(path):
    if app.static_folder and os.path.exists(app.static_folder):
        if path.startswith("api/"):
            return jsonify({
                "error": "Not Found",
                "message": f"The requested API URL '/{path}' was not found on the server."
            }), 404
        target_file = os.path.join(app.static_folder, path)
        if path != "" and os.path.exists(target_file) and os.path.isfile(target_file):
            return send_from_directory(app.static_folder, path)
        index_file = os.path.join(app.static_folder, 'index.html')
        if os.path.exists(index_file):
            return send_from_directory(app.static_folder, 'index.html')
    return jsonify({"error": "Not Found", "message": "Frontend build (dist) not found."}), 404


def get_lan_ip():
    """Retrieve primary LAN IP address of host machine."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        if ip and not ip.startswith("127."):
            return ip
    except Exception:
        pass
    try:
        hostname = socket.gethostname()
        for ip in socket.gethostbyname_ex(hostname)[2]:
            if not ip.startswith("127."):
                return ip
    except Exception:
        pass
    return "127.0.0.1"


def log_banner(port):
    """Write server operational banner details into server.log."""
    lan_ips = []
    try:
        hostname = socket.gethostname()
        for ip in socket.gethostbyname_ex(hostname)[2]:
            if not ip.startswith("127."):
                lan_ips.append(ip)
    except Exception:
        pass

    logger.info("==================================================")
    logger.info("   CRUSHER INVENTORY SYSTEM - SERVER IS ONLINE    ")
    logger.info("==================================================")
    logger.info(f"Local Access:    http://localhost:{port}")
    for ip in lan_ips:
        logger.info(f"Network Access:  http://{ip}:{port}")
    logger.info("==================================================")

# ---------------------------------------------------------
# Waitress Background Server Controller (Requirement 2 & 6)
# Runs WSGI server in a thread and allows clean start/stop/restart
# ---------------------------------------------------------
class ServerController:
    def __init__(self, flask_app, host="0.0.0.0", port=5000):
        self.flask_app = flask_app
        self.host = host
        self.port = port
        self.server = None
        self.thread = None
        self.is_running_flag = False
        self._lock = threading.Lock()

    def start(self):
        with self._lock:
            if self.is_running_flag:
                logger.info("Server is already running.")
                return
            try:
                self.server = create_server(self.flask_app, host=self.host, port=self.port)
                self.thread = threading.Thread(target=self._run_server, daemon=True)
                self.is_running_flag = True
                self.thread.start()
                logger.info(f"Waitress server thread launched on port {self.port}")
            except Exception as e:
                logger.error(f"Failed to start Waitress server: {e}", exc_info=True)
                self.is_running_flag = False

    def _run_server(self):
        try:
            if self.server:
                self.server.run()
        except Exception as e:
            logger.error(f"Server execution encountered error: {e}", exc_info=True)
        finally:
            self.is_running_flag = False

    def stop(self):
        with self._lock:
            if self.server:
                try:
                    self.server.close()
                    logger.info("Waitress server closed.")
                except Exception as e:
                    logger.error(f"Error stopping Waitress server: {e}", exc_info=True)
            self.is_running_flag = False
            self.server = None

    def restart(self):
        logger.info("Restarting backend server...")
        self.stop()
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=2.0)
        self.start()
        logger.info("Server restart completed.")

    def is_running(self):
        return self.is_running_flag and self.thread is not None and self.thread.is_alive()

# ---------------------------------------------------------
# Dynamic System Tray Icon Generation (Requirement 1 & 4)
# ---------------------------------------------------------
def create_tray_icon_image():
    """Dynamically generate a 64x64 RGBA icon image for system tray."""
    width = 64
    height = 64
    image = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    # Draw outer blue circle
    draw.ellipse((4, 4, width - 4, height - 4), fill=(30, 144, 255))
    # Draw inner dark circle
    draw.ellipse((12, 12, width - 12, height - 12), fill=(15, 23, 42))
    # Draw inner white 'C' arc
    draw.arc((18, 18, 46, 46), start=45, end=315, fill=(255, 255, 255), width=6)
    return image

# ---------------------------------------------------------
# System Tray Menu Option Handlers (Requirement 4 & 6)
# ---------------------------------------------------------
server_controller = None

def on_open_dashboard(icon, item):
    """Open the configured frontend URL in default web browser using the host's LAN IP address."""
    host_ip = get_lan_ip()
    port = server_controller.port if server_controller else 5000
    url = f"http://{host_ip}:{port}"
    logger.info(f"Open Dashboard requested. Opening {url}")
    webbrowser.open(url)

def on_server_status(icon, item):
    """Show whether the server is running."""
    status_str = "Running" if server_controller and server_controller.is_running() else "Stopped"
    host_ip = get_lan_ip()
    port = server_controller.port if server_controller else 5000
    url = f"http://{host_ip}:{port}"
    message = f"Crusher Inventory Server\n\nStatus: {status_str}\nAccess URL: {url}\nLog File: {log_file_path}"
    logger.info(f"Server Status requested. Status: {status_str}")
    try:
        ctypes.windll.user32.MessageBoxW(0, message, "Server Status", 0x40 | 0x0)
    except Exception as e:
        logger.error(f"Error displaying status dialog: {e}")

def on_view_logs(icon, item):
    """Open logs/server.log."""
    try:
        if os.path.exists(log_file_path):
            os.startfile(log_file_path)
            logger.info("View Logs requested. Opened log file.")
        else:
            logger.warning("View Logs requested but log file does not exist yet.")
    except Exception as e:
        logger.error(f"Failed to open log file: {e}")

def on_restart_server(icon, item):
    """Restart the backend server without closing the tray application."""
    if server_controller:
        logger.info("Restart Server requested from tray menu.")
        threading.Thread(target=server_controller.restart, daemon=True).start()

def on_exit(icon, item):
    """Stop the server, remove the tray icon, and exit cleanly."""
    logger.info("Exit requested. Shutting down server and system tray icon...")
    if server_controller:
        server_controller.stop()
    icon.stop()
    logger.info("System Tray Application terminated cleanly.")
    sys.exit(0)

# ---------------------------------------------------------
# Application Entry Point (Requirement 1, 2, 5, 6)
# ---------------------------------------------------------
if __name__ == "__main__":
    try:
        from run_migration import ensure_database_schema
        logger.info("Checking database schema...")
        ensure_database_schema()
    except Exception as e:
        logger.warning(f"Startup schema check notice: {e}")

    port = int(os.environ.get("PORT", 5000))
    log_banner(port)

    lan_ip = get_lan_ip()
    print("\n==================================================")
    print("   CRUSHER INVENTORY SYSTEM - SERVER IS ONLINE    ")
    print("==================================================")
    print(f"  Local Access:    http://localhost:{port}")
    print(f"  Network Access:  http://{lan_ip}:{port}")
    print(f"  System Tray:     Icon running in Windows Taskbar")
    print(f"  Logs Saved To:   logs/server.log")
    print("==================================================\n")

    # Instantiate server controller and start Waitress server in background thread
    server_controller = ServerController(app, host="0.0.0.0", port=port)
    server_controller.start()

    # Construct System Tray Menu
    tray_menu = pystray.Menu(
        pystray.MenuItem("Open Dashboard", on_open_dashboard, default=True),
        pystray.MenuItem("Server Status", on_server_status),
        pystray.MenuItem("View Logs", on_view_logs),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("Restart Server", on_restart_server),
        pystray.MenuItem("Exit", on_exit)
    )

    # Initialize and run System Tray Icon loop on main thread
    tray_icon = pystray.Icon(
        "CrusherServer",
        create_tray_icon_image(),
        "Crusher Inventory Server",
        tray_menu
    )

    try:
        tray_icon.run()
    except KeyboardInterrupt:
        on_exit(tray_icon, None)