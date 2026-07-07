from flask import jsonify, request
from db import get_connection
from utils.unit_converter import unit_convertor


def view_production():

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    # cursor.execute("SELECT * FROM Production")

    # production = cursor.fetchall()
    cursor.execute("""
        SELECT 
        p.production_id,
        pr.product_name,
        p.production_date,
        p.unit,
        p.quantity_tons,
        p.production_cost
         FROM production p 
        JOIN Product pr
            ON p.product_id = pr.product_id
        ORDER BY p.production_date DESC         
        """)
    
    production = cursor.fetchall()
    print(production)
    cursor.close()
    conn.close()

    return jsonify(production)


def add_production():

    data = request.json

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:

        # Check Product
        cursor.execute("""
            SELECT product_id, quantity_tons, status
            FROM Product
            WHERE product_id=%s
        """, (data["product_id"],))

        product = cursor.fetchone()

        if not product:
            return jsonify({
                "message": "Product not found"
            }), 404

        if product["status"].lower() != "active":
            return jsonify({
                "message": "Cannot add production. Product is Inactive."
            }), 400
        print(data)
        print("Unit received:", data["unit"])
        qty = unit_convertor(
            data["unit"],
            data["quantity_tons"]
        )

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
            VALUES(%s,%s,%s,%s,%s)
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
            WHERE product_id=%s
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

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        cursor.close()
        conn.close()