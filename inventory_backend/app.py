from flask import Flask
from flask_cors import CORS
from db import get_connection

from routes.product_routes import product_bp
from routes.production_routes import production_bp
from routes.vehicle_routes import vehicle_bp
from routes.vehicle_activity_routes import vehicle_activity_bp
from routes.party_routes import party_bp
from routes.sales_routes import sales_bp
from routes.vehicle_sale_routes import vehicle_sale_bp

import os

app = Flask(__name__)

CORS(app, resources={r"/api/*": {"origins": "*"}})
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


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)