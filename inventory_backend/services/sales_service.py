from flask import request, jsonify
from db import get_connection
from utils.unit_converter import unit_convertor, ton_to_brass


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
                price,
                loading_time,
                unloading_time,
                remarks
            )
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            data["sales_date"],
            data["party_id"],
            data["product_id"],
            data["vehicle_number"],
            qty,
            data["unit"],
            data["site"],
            data["price"],
            data.get("loading_time") or None,
            data.get("unloading_time") or None,
            data.get("remarks") or None,
        ))

        sales_id = cursor.lastrowid

        # ----------------------------
        # *Insert into VehicleSale
        # ----------------------------
        cursor.execute("""
            INSERT INTO VehicleSale (sales_id, vehicle_number)
            VALUES (%s, %s)
        """, (sales_id, data["vehicle_number"]))

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
            v.owner          AS vehicle_owner,
            s.quantity_tons,
            s.unit,
            s.site,
            s.price,
            s.loading_time,
            s.unloading_time,
            s.remarks
        FROM Sales s
        JOIN Product p
            ON s.product_id = p.product_id
        JOIN Party pt
            ON s.party_id = pt.party_id
        LEFT JOIN Vehicle v
            ON s.vehicle_number = v.vehicle_number
        ORDER BY s.sales_date DESC, s.sales_id DESC
    """)

    sales = cursor.fetchall()

    for sale in sales:
        # Format date
        if sale["sales_date"]:
            sale["sales_date"] = sale["sales_date"].strftime("%Y-%m-%d")

        # Format time fields as HH:MM strings
        if sale["loading_time"] is not None:
            total_seconds = int(sale["loading_time"].total_seconds())
            hours, remainder = divmod(total_seconds, 3600)
            minutes = remainder // 60
            sale["loading_time"] = f"{hours:02d}:{minutes:02d}"
        else:
            sale["loading_time"] = ""

        if sale["unloading_time"] is not None:
            total_seconds = int(sale["unloading_time"].total_seconds())
            hours, remainder = divmod(total_seconds, 3600)
            minutes = remainder // 60
            sale["unloading_time"] = f"{hours:02d}:{minutes:02d}"
        else:
            sale["unloading_time"] = ""

        qty_tons = float(sale["quantity_tons"])
        qty_brass = ton_to_brass(qty_tons)

        if sale["unit"].lower() == "brass":
            # Entry was made in brass — display_quantity is in brass
            sale["display_quantity"] = qty_brass
            sale["converted_quantity"] = qty_tons
            sale["converted_unit"] = "tons"
        else:
            # Entry was made in tons
            sale["display_quantity"] = qty_tons
            sale["converted_quantity"] = qty_brass
            sale["converted_unit"] = "brass"

        sale["quantity_tons"] = qty_tons

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
        # Delete VehicleSale entry first
        # ----------------------------
        cursor.execute("""
            DELETE FROM VehicleSale
            WHERE sales_id=%s
        """, (id,))

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
                price=%s,
                loading_time=%s,
                unloading_time=%s,
                remarks=%s
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
            data.get("loading_time") or None,
            data.get("unloading_time") or None,
            data.get("remarks") or None,
            id
        ))

        # ----------------------------
        # Sync VehicleSale
        # ----------------------------
        cursor.execute("""
            DELETE FROM VehicleSale WHERE sales_id=%s
        """, (id,))

        cursor.execute("""
            INSERT INTO VehicleSale (sales_id, vehicle_number)
            VALUES (%s, %s)
        """, (id, data["vehicle_number"]))

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