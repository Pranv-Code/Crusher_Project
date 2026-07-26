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

import os
import sys
import socket
import webbrowser

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

    # Handle all other uncaught python exceptions
    print("Unhandled exception occurred:", str(e))
    import traceback
    traceback.print_exc()

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

def print_banner(port):
    lan_ips = []
    try:
        hostname = socket.gethostname()
        for ip in socket.gethostbyname_ex(hostname)[2]:
            if not ip.startswith("127."):
                lan_ips.append(ip)
    except Exception:
        pass

    print("\n" + "=" * 62)
    print("      CRUSHER INVENTORY SYSTEM - SERVER IS ONLINE")
    print("=" * 62)
    print(f"  Local Access (This PC):    http://localhost:{port}")
    for ip in lan_ips:
        print(f"  Network Access (Other PCs): http://{ip}:{port}")
    print("=" * 62)
    print("  Keep this window open to maintain server operation.")
    print("=" * 62 + "\n")

if __name__ == "__main__":
    try:
        from run_migration import ensure_database_schema
        print("Checking database schema...")
        ensure_database_schema()
    except Exception as e:
        print(f"Startup schema check notice: {e}")

    port = int(os.environ.get("PORT", 5000))
    print_banner(port)
    app.run(host="0.0.0.0", port=port)