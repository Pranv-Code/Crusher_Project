from flask import Flask
from flask_cors import CORS
from db import get_connection

from routes.product_routes import product_bp
from routes.production_routes import production_bp
from routes.vehicle_routes import vehicle_bp
from routes.vehicle_activity_routes import vehicle_activity_bp
from routes.sales_routes import sales_bp


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
app.register_blueprint(sales_bp)


if __name__ == "__main__":
    app.run(debug=True)