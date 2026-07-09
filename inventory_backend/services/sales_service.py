from flask import request, jsonify
from db import get_connection
from utils.unit_converter import unit_convertor,ton_to_brass

def add_sale():

    data = request.json
    print(data)
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
        qty = unit_convertor(
            data['unit'],
            data['quantity']
        )
        # ----------------------------
        # *Check Stock
        # ----------------------------
        if float(product["quantity_tons"]) < float(qty):
            return jsonify({
                "message": "Insufficient Stock"
            }), 400
        
        # ----------------------------
        # *Check Party
        # ----------------------------
        cursor.execute("""
            SELECT party_name
            FROM Party
            WHERE party_id=%s
        """, (data["party_id"],))

        if cursor.fetchone() is None:
            return jsonify({"message": "Party not found"}), 404

        # ----------------------------
        # *Insert Sale
        # ----------------------------
        cursor.execute("""
            INSERT INTO Sales
            (
                sales_date,
                party_id,
                product_id,
                vehicle_number,
                quantity_tons,
                unit,
                site,
                price
            )
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            data["sales_date"],
            data["party_id"],
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
            qty,
            data["product_id"]
        ))

        conn.commit()

        return jsonify({
            "message": "Sale Added Successfully"
        }), 201

    except Exception as e:
        import traceback
        conn.rollback()
        traceback.print_exc()
        return jsonify({
            "error": str(e)
        }), 500

    finally:

        cursor.close()
        conn.close()


from utils.unit_converter import ton_to_brass

def get_sales():

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            s.sales_id,
            s.sales_date,
            s.party_id,
            s.product_id,
            pt.party_name,
            p.product_name,
            s.vehicle_number,
            s.quantity_tons,
            s.unit,
            s.site,
            s.price
        FROM Sales s
        JOIN Product p
            ON s.product_id = p.product_id
        JOIN Party pt
            ON s.party_id = pt.party_id
        ORDER BY s.sales_date DESC
    """)

    sales = cursor.fetchall()

    for sale in sales:
        if sale["sales_date"]:
            sale["sales_date"] = sale["sales_date"].strftime("%Y-%m-%d")
        if sale["unit"].lower() == "brass":

            sale["display_quantity"] = ton_to_brass(
                sale["quantity_tons"]
            )

        else:

            sale["display_quantity"] = float(
                sale["quantity_tons"]
            )

    cursor.close()
    conn.close()

    return jsonify(sales)

def delete_sale(id):

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:

        # ----------------------------
        # Get Sale
        # ----------------------------
        cursor.execute("""
            SELECT *
            FROM Sales
            WHERE sales_id=%s
        """, (id,))

        sale = cursor.fetchone()

        if sale is None:
            return jsonify({
                "message": "Sale not found"
            }), 404

        # ----------------------------
        # Return Product Stock
        # ----------------------------
        cursor.execute("""
            UPDATE Product
            SET quantity_tons = quantity_tons + %s
            WHERE product_id=%s
        """, (
            sale["quantity_tons"],
            sale["product_id"]
        ))

        # ----------------------------
        # Delete Sale
        # ----------------------------
        cursor.execute("""
            DELETE FROM Sales
            WHERE sales_id=%s
        """, (id,))

        conn.commit()

        return jsonify({
            "message": "Sale Deleted Successfully"
        })

    except Exception as e:

        conn.rollback()

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        cursor.close()
        conn.close()

def update_sale(id):
    print(request.json)
    data = request.json

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:

        # ----------------------------
        # Get Existing Sale
        # ----------------------------
        cursor.execute("""
            SELECT *
            FROM Sales
            WHERE sales_id=%s
        """, (id,))

        old_sale = cursor.fetchone()

        if old_sale is None:
            return jsonify({
                "message": "Sale not found"
            }), 404

        # ----------------------------
        # Return Old Stock
        # ----------------------------
        cursor.execute("""
            UPDATE Product
            SET quantity_tons = quantity_tons + %s
            WHERE product_id=%s
        """, (
            old_sale["quantity_tons"],
            old_sale["product_id"]
        ))

        # ----------------------------
        # Convert New Quantity
        # ----------------------------
        new_qty = unit_convertor(
            data["unit"],
            data["quantity"]
        )

        # ----------------------------
        # Check Product
        # ----------------------------
        cursor.execute("""
            SELECT quantity_tons,status
            FROM Product
            WHERE product_id=%s
        """, (data["product_id"],))

        product = cursor.fetchone()

        if product is None:
            conn.rollback()
            return jsonify({
                "message": "Product not found"
            }), 404

        if product["status"].lower() != "active":
            conn.rollback()
            return jsonify({
                "message": "Product is Inactive"
            }), 400

        if float(product["quantity_tons"]) < float(new_qty):
            conn.rollback()
            return jsonify({
                "message": "Insufficient Stock"
            }), 400

        # ----------------------------
        # Deduct New Stock
        # ----------------------------
        cursor.execute("""
            UPDATE Product
            SET quantity_tons = quantity_tons - %s
            WHERE product_id=%s
        """, (
            new_qty,
            data["product_id"]
        ))

        # ----------------------------
        # Update Sale
        # ----------------------------
        cursor.execute("""
            UPDATE Sales
            SET
                sales_date=%s,
                party_id=%s,
                product_id=%s,
                vehicle_number=%s,
                quantity_tons=%s,
                unit=%s,
                site=%s,
                price=%s
            WHERE sales_id=%s
        """, (
            data["sales_date"],
            data["party_id"],
            data["product_id"],
            data["vehicle_number"],
            new_qty,
            data["unit"],
            data["site"],
            data["price"],
            id
        ))

        conn.commit()

        return jsonify({
            "message": "Sale Updated Successfully"
        })

    except Exception as e:
        import traceback
        conn.rollback()
        traceback.print_exc()
        return jsonify({
            "error": str(e)
        }), 500

    finally:

        cursor.close()
        conn.close()