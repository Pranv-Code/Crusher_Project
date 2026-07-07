from flask import request, jsonify
from db import get_connection
from utils.unit_converter import unit_convertor


def add_sale():

    data = request.json

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:

        # ----------------------------
        # *Check Product
        # ----------------------------
        cursor.execute("""
            SELECT product_id, quantity_tons, status
            FROM Product
            WHERE product_id=%s
        """, (data["product_id"],))

        product = cursor.fetchone()

        if product is None:
            return jsonify({"message": "Product not found"}), 404

        if product["status"].lower() != "active":
            return jsonify({"message": "Product is Inactive"}), 400

        # ----------------------------
        # *Check Vehicle
        # ----------------------------
        cursor.execute("""
            SELECT vehicle_number
            FROM Vehicle
            WHERE vehicle_number=%s
        """, (data["vehicle_number"],))

        if cursor.fetchone() is None:
            return jsonify({"message": "Vehicle not found"}), 404

        # ----------------------------
        # *Check Stock
        # ----------------------------
        if float(product["quantity_tons"]) < float(data["quantity"]):
            return jsonify({
                "message": "Insufficient Stock"
            }), 400
        qty = unit_convertor(
            data['unit'],
            data['quantity']
        )
        # ----------------------------
        # *Insert Sale
        # ----------------------------
        cursor.execute("""
            INSERT INTO Sales
            (
                sales_date,
                party_name,
                product_id,
                vehicle_number,
                quantity_tons,
                unit,
                site,
                price
            )
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            data["sale_date"],
            data["party_name"],
            data["product_id"],
            data["vehicle_number"],
            qty,
            data["unit"],
            data["site"],
            data["price"]
        ))

        # ----------------------------
        # Update Product Stock
        # ----------------------------
        cursor.execute("""
            UPDATE Product
            SET quantity_tons = quantity_tons - %s
            WHERE product_id=%s
        """, (
            data["quantity"],
            data["product_id"]
        ))

        conn.commit()

        return jsonify({
            "message": "Sale Added Successfully"
        }), 201

    except Exception as e:

        conn.rollback()

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        cursor.close()
        conn.close()


def get_sales():

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            s.sales_id,
            s.sales_date,
            s.party_name,
            p.product_name,
            s.vehicle_number,
            s.quantity_tons,
            s.unit,
            s.site,
            s.price
        FROM Sales s
        JOIN Product p
            ON s.product_id = p.product_id
        ORDER BY s.sales_date DESC
    """)

    sales = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(sales)