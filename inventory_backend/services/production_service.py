from flask import jsonify, request
from db import get_connection
from utils.unit_converter import unit_convertor, ton_to_brass
from services.activity_log_service import log_activity


def view_production():

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT 
        p.production_id,
        p.product_id,
        COALESCE(pr.product_name, 'Quarry Material') AS product_name,
        p.production_date,
        p.unit,
        p.quantity_tons,
        p.cost_per_unit,
        p.production_cost
         FROM Production p 
        LEFT JOIN Product pr
            ON p.product_id = pr.product_id
        ORDER BY p.production_date DESC         
        """)
    
    production = cursor.fetchall()
    for prd in production:
        if prd["production_date"]:
            prd["production_date"] = prd["production_date"].strftime("%Y-%m-%d")
        qty_tons = float(prd.get("quantity_tons") or 0)
        total_cost = float(prd.get("production_cost") or 0)
        unit = (prd.get("unit") or "tons").lower()

        if unit == "brass":
            qty_brass = ton_to_brass(qty_tons, cursor=cursor)
            prd["display_quantity"] = qty_brass
            prd["entered_quantity"] = qty_brass
            prd["converted_quantity"] = qty_tons
            prd["converted_unit"] = "tons"
        else:
            qty_brass = ton_to_brass(qty_tons, cursor=cursor)
            prd["display_quantity"] = qty_tons
            prd["entered_quantity"] = qty_tons
            prd["converted_quantity"] = qty_brass
            prd["converted_unit"] = "brass"

        if (prd.get("cost_per_unit") is None or float(prd.get("cost_per_unit") or 0) == 0) and qty_tons > 0:
            prd["cost_per_unit"] = round(total_cost / qty_tons, 2)
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

        raw_product_id = data.get("product_id")
        product_id = raw_product_id if raw_product_id != "" else None

        product = None
        if product_id:
            cursor.execute("SELECT product_id, quantity_tons, status FROM Product WHERE product_id=%s", (product_id,))
            product = cursor.fetchone()

        if inv_mode == "COMMON_POOL":
            if product and product["status"].lower() != "active":
                return jsonify({"message": "Cannot add production. Product is Inactive."}), 400
            product_id = product["product_id"] if product else None
        else:
            if not product:
                return jsonify({"message": "Product selection is required in Product-Wise mode"}), 400
            if product["status"].lower() != "active":
                return jsonify({"message": "Cannot add production. Product is Inactive."}), 400
            product_id = product["product_id"]
        qty = unit_convertor(
            data["unit"],
            data["quantity_tons"]
        )

        cost_per_unit = float(data.get("cost_per_unit", 0) or 0)
        total_cost = float(data.get("production_cost", 0) or 0)
        if not cost_per_unit and float(qty) > 0 and total_cost > 0:
            cost_per_unit = round(total_cost / float(qty), 2)


        # Insert Production
        cursor.execute("""
            INSERT INTO Production
            (
                production_date,
                product_id,
                unit,
                quantity_tons,
                cost_per_unit,
                production_cost
            )
            VALUES(%s,%s,%s,%s,%s,%s)
        """, (
            data["production_date"],
            product_id,
            data["unit"],
            qty,
            cost_per_unit,
            total_cost
        ))

        # Check Inventory Mode
        from db import get_system_setting, set_system_setting
        inv_mode = get_system_setting("inventory_mode", "COMMON_POOL", cursor)

        if inv_mode == "COMMON_POOL":
            user_id = request.user.get("user_id") if hasattr(request, "user") and request.user else None
            pool_stock = float(get_system_setting("common_pool_stock", "0.0", cursor))
            set_system_setting("common_pool_stock", str(pool_stock + float(qty)), user_id=user_id, cursor=cursor)
        else:
            # Update Product Quantity
            cursor.execute("""
                UPDATE Product
                SET quantity_tons = quantity_tons + %s
                WHERE product_id=%s
            """, (
                qty,
                product_id
            ))

        prod_id = cursor.lastrowid
        from services.activity_log_service import log_activity
        u = getattr(request, "user", {}) or {}
        log_activity(
            u.get("user_id"),
            u.get("username", "System"),
            u.get("role", "User"),
            "CREATE",
            "Production",
            f"Created Production entry #{prod_id} ({qty} Tons)"
        )

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
            log_activity(
                user_id,
                request.user.get("username", "Clerk"),
                user_role,
                "EDIT",
                "Production",
                f"Submitted Edit Request for Production #{id}"
            )
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

        from db import get_system_setting, set_system_setting
        inv_mode = get_system_setting("inventory_mode", "COMMON_POOL", cursor)

        raw_product_id = data.get("product_id")
        product_id = raw_product_id if raw_product_id != "" else None

        if inv_mode == "COMMON_POOL":
            product_id = product_id if product_id else None
            pool_stock = float(get_system_setting("common_pool_stock", "0.0", cursor))
            set_system_setting("common_pool_stock", str(pool_stock - float(old["quantity_tons"]) + float(new_qty)), user_id=user_id, cursor=cursor)
        else:
            if not product_id:
                return jsonify({"message": "Product selection is required in Product-Wise mode"}), 400
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

        cost_per_unit = float(data.get("cost_per_unit", 0) or 0)
        total_cost = float(data.get("production_cost", 0) or 0)
        if not cost_per_unit and float(new_qty) > 0 and total_cost > 0:
            cost_per_unit = round(total_cost / float(new_qty), 2)

        # Update production
        cursor.execute("""
            UPDATE Production
            SET
                production_date=%s,
                product_id=%s,
                unit=%s,
                quantity_tons=%s,
                cost_per_unit=%s,
                production_cost=%s
            WHERE production_id=%s
        """, (
            data["production_date"],
            product_id,
            data["unit"],
            new_qty,
            cost_per_unit,
            total_cost,
            id
        ))

        log_activity(
            user_id,
            request.user.get("username", "Manager"),
            user_role,
            "EDIT",
            "Production",
            f"Manager updated Production record #{id} directly"
        )
        conn.commit()

        return jsonify({
            "message": "Production Updated Successfully"
        })

    except Exception as e:

        conn.rollback()
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
            log_activity(
                user_id,
                request.user.get("username", "Clerk"),
                user_role,
                "DELETE",
                "Production",
                f"Submitted Delete Request for Production #{id}"
            )
            conn.commit()
            return jsonify({
                "message": "Delete request submitted for Manager approval",
                "status": "pending_approval"
            }), 202

        from db import get_system_setting, set_system_setting
        inv_mode = get_system_setting("inventory_mode", "COMMON_POOL", cursor)

        if inv_mode == "COMMON_POOL":
            pool_stock = float(get_system_setting("common_pool_stock", "0.0", cursor))
            set_system_setting("common_pool_stock", str(pool_stock - float(production["quantity_tons"])), user_id=user_id, cursor=cursor)
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

        log_activity(
            user_id,
            request.user.get("username", "Manager"),
            user_role,
            "DELETE",
            "Production",
            f"Manager deleted Production record #{id} directly"
        )
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