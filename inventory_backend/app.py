from flask import Flask, jsonify, json
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

import os

app = Flask(__name__)

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
# Test Database Connection
# -------------------------
@app.route("/")
def home():
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



if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)