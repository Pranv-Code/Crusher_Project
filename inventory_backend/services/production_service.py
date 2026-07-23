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
        p.product_id,
        pr.product_name,
        p.production_date,
        p.unit,
        p.quantity_tons,
        p.production_cost
         FROM Production p 
        JOIN Product pr
            ON p.product_id = pr.product_id
        ORDER BY p.production_date DESC         
        """)
    
    production = cursor.fetchall()
    for prd in production:
        if prd["production_date"]:
                prd["production_date"] = prd["production_date"].strftime("%Y-%m-%d")
    cursor.close()
    conn.close()

    return jsonify(production)


def add_production():

    data = request.json

    try:
        qty_val = float(data.get("quantity_tons", 0))
        cost_val = float(data.get("production_cost", 0))
    except (ValueError, TypeError):
        return jsonify({"message": "Quantity and Production Cost must be valid numbers"}), 400

    if qty_val <= 0 or cost_val <= 0:
        return jsonify({"message": "Quantity and Production Cost must be greater than zero"}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        from db import get_system_setting, set_system_setting
        inv_mode = get_system_setting("inventory_mode", "COMMON_POOL", cursor)

        product_id = data.get("product_id")
        if inv_mode == "COMMON_POOL":
            # If in COMMON_POOL, find or create the "Common Pool" product in Product table
            cursor.execute("SELECT product_id, status FROM Product WHERE LOWER(product_name) = 'common pool'")
            pool_product = cursor.fetchone()
            if pool_product:
                product_id = pool_product["product_id"]
                if pool_product["status"].lower() != "active":
                    cursor.execute("UPDATE Product SET status = 'Active' WHERE product_id = %s", (product_id,))
            else:
                cursor.execute("INSERT INTO Product (product_name, quantity_tons, status) VALUES ('Common Pool', 0.0, 'Active')")
                product_id = cursor.lastrowid
        elif not product_id:
            return jsonify({"message": "Product selection is required"}), 400

        # Check Product
        cursor.execute("""
            SELECT product_id, quantity_tons, status
            FROM Product
            WHERE product_id=%s
        """, (product_id,))

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
            product_id,
            data["unit"],
            qty,
            data["production_cost"]
        ))

        # Check Inventory Mode
        from db import get_system_setting, set_system_setting
        inv_mode = get_system_setting("inventory_mode", "COMMON_POOL", cursor)

        if inv_mode == "COMMON_POOL":
            user_id = request.user.get("user_id") if hasattr(request, "user") and request.user else None
            pool_stock = float(get_system_setting("common_pool_stock", "0.0", cursor))
            set_system_setting("common_pool_stock", str(pool_stock + qty), user_id=user_id, cursor=cursor)
        else:
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

def update_production(id):
    import json
    data = request.json
    print("Update Request:", data)
    print("Production ID:", id)

    try:
        qty_val = float(data.get("quantity_tons", 0))
        cost_val = float(data.get("production_cost", 0))
    except (ValueError, TypeError):
        return jsonify({"message": "Quantity and Production Cost must be valid numbers"}), 400

    if qty_val <= 0 or cost_val <= 0:
        return jsonify({"message": "Quantity and Production Cost must be greater than zero"}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:

        # Get old production
        cursor.execute("""
            SELECT *
            FROM Production
            WHERE production_id=%s
        """, (id,))

        old = cursor.fetchone()
        print("Old Record:", old)
        if not old:
            return jsonify({
                "message": "Production not found"
            }), 404

        user_role = request.user.get("role")
        user_id   = request.user.get("user_id")

        if user_role == "Clerk":
            cursor.execute("""
                INSERT INTO Approval_Requests (requester_id, request_type, reference_id, reference_data, status)
                VALUES (%s, 'production_edit', %s, %s, 'pending')
            """, (user_id, str(id), json.dumps(data)))
            conn.commit()
            return jsonify({
                "message": "Edit request submitted for Manager approval",
                "status": "pending_approval"
            }), 202

        # Convert new quantity
        new_qty = unit_convertor(
            data["unit"],
            data["quantity_tons"]
        )
        print("Converted Quantity:", new_qty)

        from db import get_system_setting, set_system_setting
        inv_mode = get_system_setting("inventory_mode", "COMMON_POOL", cursor)

        product_id = data.get("product_id")
        if inv_mode == "COMMON_POOL":
            cursor.execute("SELECT product_id, status FROM Product WHERE LOWER(product_name) = 'common pool'")
            pool_product = cursor.fetchone()
            if pool_product:
                product_id = pool_product["product_id"]
                if pool_product["status"].lower() != "active":
                    cursor.execute("UPDATE Product SET status = 'Active' WHERE product_id = %s", (product_id,))
            else:
                cursor.execute("INSERT INTO Product (product_name, quantity_tons, status) VALUES ('Common Pool', 0.0, 'Active')")
                product_id = cursor.lastrowid
        elif not product_id:
            return jsonify({"message": "Product selection is required"}), 400

        if inv_mode == "COMMON_POOL":
            pool_stock = float(get_system_setting("common_pool_stock", "0.0", cursor))
            set_system_setting("common_pool_stock", str(pool_stock - old["quantity_tons"] + new_qty), user_id=user_id, cursor=cursor)
        else:
            # Remove old quantity from old product
            cursor.execute("""
                UPDATE Product
                SET quantity_tons = quantity_tons - %s
                WHERE product_id=%s
            """, (
                old["quantity_tons"],
                old["product_id"]
            ))

            # Add new quantity to selected product
            cursor.execute("""
                UPDATE Product
                SET quantity_tons = quantity_tons + %s
                WHERE product_id=%s
            """, (
                new_qty,
                product_id
            ))

        # Update production
        cursor.execute("""
            UPDATE Production
            SET
                production_date=%s,
                product_id=%s,
                unit=%s,
                quantity_tons=%s,
                production_cost=%s
            WHERE production_id=%s
        """, (
            data["production_date"],
            product_id,
            data["unit"],
            new_qty,
            data["production_cost"],
            id
        ))

        conn.commit()

        return jsonify({
            "message": "Production Updated Successfully"
        })

    except Exception as e:

        conn.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({
            "error": str(e)
        }),500

    finally:

        cursor.close()
        conn.close()


def delete_production(id):

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:

        cursor.execute("""
            SELECT *
            FROM Production
            WHERE production_id=%s
        """,(id,))

        production = cursor.fetchone()

        if not production:

            return jsonify({
                "message":"Production not found"
            }),404

        user_role = request.user.get("role")
        user_id   = request.user.get("user_id")

        if user_role == "Clerk":
            cursor.execute("""
                INSERT INTO Approval_Requests (requester_id, request_type, reference_id, reference_data, status)
                VALUES (%s, 'production_delete', %s, NULL, 'pending')
            """, (user_id, str(id)))
            conn.commit()
            return jsonify({
                "message": "Delete request submitted for Manager approval",
                "status": "pending_approval"
            }), 202

        from db import get_system_setting, set_system_setting
        inv_mode = get_system_setting("inventory_mode", "COMMON_POOL", cursor)

        if inv_mode == "COMMON_POOL":
            pool_stock = float(get_system_setting("common_pool_stock", "0.0", cursor))
            set_system_setting("common_pool_stock", str(pool_stock - production["quantity_tons"]), user_id=user_id, cursor=cursor)
        else:
            # Reverse stock
            cursor.execute("""
                UPDATE Product
                SET quantity_tons = quantity_tons - %s
                WHERE product_id=%s
            """,(
                production["quantity_tons"],
                production["product_id"]
            ))

        # Delete record
        cursor.execute("""
            DELETE FROM Production
            WHERE production_id=%s
        """,(id,))

        conn.commit()

        return jsonify({
            "message":"Production Deleted Successfully"
        })

    except Exception as e:

        conn.rollback()

        return jsonify({
            "error":str(e)
        }),500

    finally:

        cursor.close()
        conn.close()

        # vnhmE0nGQfsw4M -infinityfree password
        # kafka-33603052 - aiven serviece name 
        # 