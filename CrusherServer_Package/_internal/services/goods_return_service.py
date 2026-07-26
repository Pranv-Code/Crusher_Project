from flask import request, jsonify
from db import get_connection, get_system_setting, set_system_setting
from utils.unit_converter import unit_convertor, ton_to_brass
from datetime import datetime
from services.activity_log_service import log_activity


def _format_return(ret, cursor=None):
    """Format single goods return dictionary."""
    if ret.get("return_date"):
        ret["return_date"] = ret["return_date"].strftime("%Y-%m-%d")
    if ret.get("created_at"):
        ret["created_at"] = ret["created_at"].strftime("%Y-%m-%d %H:%M:%S")

    qty_tons = float(ret.get("returned_quantity_tons") or 0.0)
    qty_brass = ton_to_brass(qty_tons, cursor=cursor)

    if (ret.get("unit") or "tons").lower() == "brass":
        ret["display_quantity"] = qty_brass
        ret["converted_quantity"] = qty_tons
        ret["converted_unit"] = "tons"
    else:
        ret["display_quantity"] = qty_tons
        ret["converted_quantity"] = qty_brass
        ret["converted_unit"] = "brass"

    ret["returned_quantity_tons"] = qty_tons
    ret["returned_quantity_brass"] = qty_brass
    if ret.get("original_quantity_tons") is not None:
        ret["original_quantity_tons"] = float(ret["original_quantity_tons"])
        ret["original_quantity_brass"] = ton_to_brass(ret["original_quantity_tons"], cursor=cursor)

    return ret


def get_goods_returns():
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 30))
    search = request.args.get("search", "").strip()
    party_id = request.args.get("party_id", "").strip()
    product_id = request.args.get("product_id", "").strip()
    condition = request.args.get("condition", "").strip().upper()
    start_date = request.args.get("start_date", "").strip()
    end_date = request.args.get("end_date", "").strip()

    offset = (page - 1) * limit

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        query_conditions = ["1=1"]
        params = []

        if search:
            query_conditions.append(
                "(pt.party_name LIKE %s OR p.product_name LIKE %s OR gr.vehicle_number LIKE %s OR gr.reason LIKE %s OR CAST(gr.sale_id AS CHAR) LIKE %s)"
            )
            term = f"%{search}%"
            params.extend([term, term, term, term, term])

        if party_id:
            query_conditions.append("gr.party_id = %s")
            params.append(party_id)

        if product_id:
            query_conditions.append("gr.product_id = %s")
            params.append(product_id)

        if condition in ("GOOD", "DAMAGED"):
            query_conditions.append("gr.condition_type = %s")
            params.append(condition)

        if start_date:
            query_conditions.append("gr.return_date >= %s")
            params.append(start_date)

        if end_date:
            query_conditions.append("gr.return_date <= %s")
            params.append(end_date)

        where_clause = " AND ".join(query_conditions)

        # Count total
        count_sql = f"""
            SELECT COUNT(*) AS total
            FROM Goods_Returns gr
            JOIN Party pt ON gr.party_id = pt.party_id
            LEFT JOIN Product p ON gr.product_id = p.product_id
            WHERE {where_clause}
        """
        cursor.execute(count_sql, params)
        total_records = cursor.fetchone()["total"]

        # Fetch records
        sql = f"""
            SELECT
                gr.return_id,
                gr.return_date,
                gr.sale_id,
                gr.party_id,
                gr.product_id,
                gr.vehicle_number,
                gr.original_quantity_tons,
                gr.returned_quantity_tons,
                gr.unit,
                gr.condition_type,
                gr.reason,
                gr.created_by,
                gr.created_at,
                pt.party_name,
                COALESCE(p.product_name, 'Quarry Material') AS product_name,
                u.name AS created_by_name
            FROM Goods_Returns gr
            JOIN Party pt ON gr.party_id = pt.party_id
            LEFT JOIN Product p ON gr.product_id = p.product_id
            LEFT JOIN Users u ON gr.created_by = u.user_id
            WHERE {where_clause}
            ORDER BY gr.return_date DESC, gr.return_id DESC
            LIMIT %s OFFSET %s
        """
        cursor.execute(sql, params + [limit, offset])
        rows = cursor.fetchall()
        formatted_rows = [_format_return(r, cursor=cursor) for r in rows]

        return jsonify({
            "goods_returns": formatted_rows,
            "total": total_records,
            "page": page,
            "limit": limit,
            "total_pages": (total_records + limit - 1) // limit if limit > 0 else 1
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


def add_goods_return():
    data = request.json or {}

    return_date = data.get("return_date", "").strip()
    party_id = data.get("party_id")
    product_id = data.get("product_id") or None
    sale_id = data.get("sale_id") or None
    vehicle_number = (data.get("vehicle_number") or "").strip() or None
    unit = (data.get("unit") or "tons").strip().lower()
    condition_type = (data.get("condition_type") or "GOOD").strip().upper()
    reason = (data.get("reason") or "").strip() or None

    try:
        qty_input = float(data.get("quantity", 0))
    except (ValueError, TypeError):
        return jsonify({"message": "Returned quantity must be a valid positive number"}), 400

    if qty_input <= 0:
        return jsonify({"message": "Returned quantity must be greater than zero"}), 400

    if not return_date:
        return jsonify({"message": "Return date is required"}), 400

    if condition_type not in ("GOOD", "DAMAGED"):
        return jsonify({"message": "Invalid condition type. Must be 'GOOD' or 'DAMAGED'"}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Convert quantity input to MT
        returned_tons = float(unit_convertor(unit, qty_input))
        orig_tons = None

        # Check sale details if sale_id provided
        if sale_id:
            cursor.execute("SELECT * FROM Sales WHERE sales_id = %s", (sale_id,))
            sale_row = cursor.fetchone()
            if not sale_row:
                return jsonify({"message": f"Sale #{sale_id} not found"}), 404

            orig_tons = float(sale_row["quantity_tons"])
            if not party_id:
                party_id = sale_row["party_id"]
            if product_id is None:
                product_id = sale_row["product_id"]
            if not vehicle_number:
                vehicle_number = sale_row["vehicle_number"]

            # Calculate total returns recorded so far for this sale
            cursor.execute("""
                SELECT COALESCE(SUM(returned_quantity_tons), 0) AS already_returned
                FROM Goods_Returns
                WHERE sale_id = %s
            """, (sale_id,))
            already_ret = float(cursor.fetchone()["already_returned"])

            if (already_ret + returned_tons) > (orig_tons + 0.001):
                return jsonify({
                    "message": f"Cannot return {returned_tons:.2f} MT. Original sale was {orig_tons:.2f} MT and {already_ret:.2f} MT has already been returned."
                }), 400

        if not party_id:
            return jsonify({"message": "Party is required"}), 400

        # Check Party existence
        cursor.execute("SELECT party_name FROM Party WHERE party_id = %s", (party_id,))
        party_row = cursor.fetchone()
        if not party_row:
            return jsonify({"message": "Party not found"}), 404

        # Read system inventory mode
        inv_mode = get_system_setting("inventory_mode", "COMMON_POOL", cursor)

        # Check Product requirement if PRODUCT_SPECIFIC mode and GOOD condition
        if inv_mode != "COMMON_POOL" and condition_type == "GOOD" and not product_id:
            return jsonify({"message": "Product selection is required when inventory mode is Product-Wise"}), 400

        if product_id:
            cursor.execute("SELECT product_name FROM Product WHERE product_id = %s", (product_id,))
            if not cursor.fetchone():
                return jsonify({"message": "Product not found"}), 404

        user_info = getattr(request, "user", {}) or {}
        user_id = user_info.get("user_id")

        # Insert record into Goods_Returns
        cursor.execute("""
            INSERT INTO Goods_Returns (
                return_date, sale_id, party_id, product_id, vehicle_number,
                original_quantity_tons, returned_quantity_tons, unit,
                condition_type, reason, created_by
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            return_date, sale_id, party_id, product_id, vehicle_number,
            orig_tons, returned_tons, unit,
            condition_type, reason, user_id
        ))

        return_id = cursor.lastrowid

        # Update Inventory Stock if GOOD condition
        if condition_type == "GOOD":
            if inv_mode == "COMMON_POOL":
                current_pool = float(get_system_setting("common_pool_stock", "0.0", cursor))
                new_pool = current_pool + returned_tons
                set_system_setting("common_pool_stock", str(new_pool), user_id=user_id, cursor=cursor)
            else:
                cursor.execute("""
                    UPDATE Product
                    SET quantity_tons = quantity_tons + %s
                    WHERE product_id = %s
                """, (returned_tons, product_id))

        conn.commit()

        condition_label = "Good to use (Restocked)" if condition_type == "GOOD" else "Damaged (Wastage / Discarded)"
        log_activity(
            user_id,
            user_info.get("username", "System"),
            user_info.get("role", "User"),
            "CREATE",
            "Goods_Returns",
            f"Created Goods Return #{return_id} ({returned_tons:.2f} MT, Condition: {condition_label})"
        )

        return jsonify({
            "message": f"Goods return recorded successfully ({condition_label}).",
            "return_id": return_id,
            "condition_type": condition_type,
            "returned_quantity_tons": returned_tons
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


def delete_goods_return(return_id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM Goods_Returns WHERE return_id = %s", (return_id,))
        ret = cursor.fetchone()

        if not ret:
            return jsonify({"message": "Goods return record not found"}), 404

        returned_tons = float(ret["returned_quantity_tons"])
        condition_type = ret["condition_type"]
        product_id = ret["product_id"]

        user_info = getattr(request, "user", {}) or {}
        user_id = user_info.get("user_id")

        # If GOOD condition, revert inventory addition
        if condition_type == "GOOD":
            inv_mode = get_system_setting("inventory_mode", "COMMON_POOL", cursor)
            if inv_mode == "COMMON_POOL":
                current_pool = float(get_system_setting("common_pool_stock", "0.0", cursor))
                new_pool = max(0.0, current_pool - returned_tons)
                set_system_setting("common_pool_stock", str(new_pool), user_id=user_id, cursor=cursor)
            elif product_id:
                cursor.execute("""
                    UPDATE Product
                    SET quantity_tons = GREATEST(0.0, quantity_tons - %s)
                    WHERE product_id = %s
                """, (returned_tons, product_id))

        # Delete record
        cursor.execute("DELETE FROM Goods_Returns WHERE return_id = %s", (return_id,))
        conn.commit()

        log_activity(
            user_id,
            user_info.get("username", "System"),
            user_info.get("role", "User"),
            "DELETE",
            "Goods_Returns",
            f"Deleted Goods Return #{return_id} ({returned_tons:.2f} MT)"
        )

        return jsonify({"message": "Goods return record deleted successfully."}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


def get_goods_return_stats():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                COUNT(*) AS total_count,
                COALESCE(SUM(returned_quantity_tons), 0) AS total_returned_tons,
                COALESCE(SUM(CASE WHEN condition_type = 'GOOD' THEN returned_quantity_tons ELSE 0 END), 0) AS restocked_tons,
                COALESCE(SUM(CASE WHEN condition_type = 'DAMAGED' THEN returned_quantity_tons ELSE 0 END), 0) AS damaged_tons
            FROM Goods_Returns
        """)
        row = cursor.fetchone()

        total_returned_tons = float(row["total_returned_tons"])
        restocked_tons = float(row["restocked_tons"])
        damaged_tons = float(row["damaged_tons"])

        return jsonify({
            "total_count": row["total_count"],
            "total_returned_tons": total_returned_tons,
            "total_returned_brass": ton_to_brass(total_returned_tons),
            "restocked_tons": restocked_tons,
            "restocked_brass": ton_to_brass(restocked_tons),
            "damaged_tons": damaged_tons,
            "damaged_brass": ton_to_brass(damaged_tons)
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
