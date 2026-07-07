from flask import Flask, jsonify, request
from db import get_connection

def unit_convertor(units,qty):
    units = units.lower()
    if units == 'brass' : 
        return qty * 4.2
    else:
        return qty

app = Flask(__name__)


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

        return jsonify({
            "status": "Connected",
            "database": db[0]
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -------------------------
# Get All Products
# -------------------------
@app.route("/products", methods=["GET"])
def get_products():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM product")
    products = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(products)


# -------------------------
# Get Product by ID
# -------------------------
@app.route("/products/<int:id>", methods=["GET"])
def get_product(id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        "SELECT * FROM Product WHERE product_id=%s",
        (id,)
    )

    product = cursor.fetchone()

    cursor.close()
    conn.close()

    if product:
        return jsonify(product)

    return jsonify({"message": "Product not found"}), 404


# -------------------------
# Add Product
# -------------------------
@app.route("/products", methods=["POST"])
def add_product():
    data = request.json
    qty = unit_convertor(data['unit'],data['quantity_tons'])
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO Product
        (product_name, quantity_tons)
        VALUES (%s,%s)
    """, (
        data["product_name"],
        qty
    ))

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"message": "Product Added"}), 201


# -------------------------
# Update Product
# -------------------------
@app.route("/products/<int:id>", methods=["PUT"])
def update_product(id):
    data = request.json

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE Product
        SET status=%s
        WHERE product_id=%s
    """, (
        data['status'],
        id
    ))

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"message": "Product Updated"})


# -------------------------
# Delete Product
# -------------------------
@app.route("/products/<int:id>", methods=["DELETE"])
def delete_product(id):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "DELETE FROM Product WHERE product_id=%s",
        (id,)
    )

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"message": "Product Deleted"})
# -------------------------
# Show All Production 
# -------------------------
@app.route("/production", methods=["GET"])
def view_production():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM production")
    production = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(production)

# -------------------------
# Add Prodcution
# -------------------------
@app.route("/production", methods=["POST"])
def add_production():

    data = request.json

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:

        # Check Product
        cursor.execute("""
            SELECT product_id, quantity_tons, status
            FROM Product
            WHERE product_id = %s
        """, (data["product_id"],))

        product = cursor.fetchone()

        if not product:
            return jsonify({"message": "Product not found"}), 404

        if product["status"].lower() != "active":
            return jsonify({
                "message": "Cannot add production. Product is Inactive."
            }), 400
        qty = unit_convertor(data["unit"],data["quantity_tons"])
        # Insert Production
        cursor.execute("""
            INSERT INTO Production
            (
                production_date,
                product_id,
                unit,
                quantity_tons,
                production_cost
            )
            VALUES (%s,%s,%s,%s,%s)
        """, (
            data["production_date"],
            data["product_id"],
            data["unit"],
            qty,
            data["production_cost"]
        ))

        # Update Product Quantity
        cursor.execute("""
            UPDATE Product
            SET quantity_tons = quantity_tons + %s
            WHERE product_id = %s
        """, (
            qty,
            data["product_id"]
        ))

        conn.commit()

        return jsonify({
            "message": "Production Added Successfully"
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()

# -------------------------
# Add Vehicle 
# -------------------------
@app.route("/vehicles", methods=["POST"])
def add_vehicle():

    data = request.json

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            INSERT INTO Vehicle(vehicle_number)
            VALUES(%s)
        """, (data["vehicle_number"],))

        conn.commit()

        return jsonify({
            "message": "Vehicle Added Successfully"
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()

# -------------------------
# Show All Vehicle
# -------------------------
@app.route("/vehicles", methods=["GET"])
def get_vehicles():

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM Vehicle")

    vehicles = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(vehicles)

# -------------------------
# Add Vehicle Activity
# -------------------------
@app.route("/vehicle-activity", methods=["POST"])
def add_vehicle_activity():

    data = request.json

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:

        # Check Vehicle Exists
        cursor.execute("""
            SELECT vehicle_number
            FROM Vehicle
            WHERE vehicle_number=%s
        """, (data["vehicle_number"],))

        vehicle = cursor.fetchone()

        if not vehicle:
            return jsonify({
                "message": "Vehicle not found"
            }), 404

        cursor.execute("""
            INSERT INTO Vehicle_Activity
            (
                activity_date,
                vehicle_number,
                arrival_time,
                loading_unloading_time,
                net_weight,
                site
            )
            VALUES(%s,%s,%s,%s,%s,%s)
        """, (
            data["activity_date"],
            data["vehicle_number"],
            data["arrival_time"],
            data["loading_unloading_time"],
            data["net_weight"],
            data["site"]
        ))

        conn.commit()

        return jsonify({
            "message": "Vehicle Activity Added Successfully"
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()

# -------------------------
# Show All Vehicle Activity
# -------------------------   
@app.route("/vehicle-activity", methods=["GET"])
def get_vehicle_activity():

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT *
        FROM Vehicle_Activity
        ORDER BY activity_date DESC
    """)

    activities = cursor.fetchall()

    for activity in activities:
        activity["arrival_time"] = str(activity["arrival_time"])
        activity["loading_unloading_time"] = str(activity["loading_unloading_time"])

    cursor.close()
    conn.close()

    return jsonify(activities)
if __name__ == "__main__":
    app.run(debug=True)