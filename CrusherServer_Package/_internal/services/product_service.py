from flask import jsonify, request
from db import get_connection
from utils.unit_converter import unit_convertor, ton_to_brass


def get_products():

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM Product")
    products = cursor.fetchall()

    cursor.close()
    conn.close()

    # Enrich each product with its brass-equivalent quantity
    for product in products:
        if product.get("quantity_tons") is not None:
            product["quantity_brass"] = ton_to_brass(product["quantity_tons"])

    return jsonify(products)


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


def add_product():

    data = request.json

    unit = data.get("unit") or "Tons"
    raw_qty = data.get("quantity_tons")
    if raw_qty is None or raw_qty == "":
        raw_qty = 0

    try:
        qty_val = float(raw_qty)
    except (ValueError, TypeError):
        return jsonify({"message": "Invalid quantity value"}), 400

    if qty_val < 0:
        return jsonify({"message": "Quantity cannot be negative"}), 400

    qty = unit_convertor(
        unit,
        qty_val
    )

    product_name = data.get("product_name", "").strip()
    if not product_name:
        return jsonify({"message": "Product name is required"}), 400

    conn = get_connection()
    cursor = conn.cursor(buffered=True)

    cursor.execute("SELECT product_id FROM Product WHERE LOWER(product_name) = LOWER(%s)", (product_name,))
    if cursor.fetchone():
        cursor.close()
        conn.close()
        return jsonify({"message": f"Product with name '{product_name}' already exists"}), 400

    cursor.execute("""
        INSERT INTO Product
        (product_name, quantity_tons)
        VALUES(%s,%s)
    """, (
        data["product_name"],
        qty
    ))

    # If in COMMON_POOL mode, also add the initial quantity to the consolidated pool stock setting
    from db import get_system_setting, set_system_setting
    inv_mode = get_system_setting("inventory_mode", "COMMON_POOL", cursor)
    if inv_mode == "COMMON_POOL":
        pool_stock = float(get_system_setting("common_pool_stock", "0.0", cursor))
        set_system_setting("common_pool_stock", str(pool_stock + qty), user_id=None, cursor=cursor)

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({
        "message": "Product Added"
    }), 201


def update_product(id):

    data = request.json
    product_name = data.get("product_name", "").strip()
    if not product_name:
        return jsonify({"message": "Product name is required"}), 400

    conn = get_connection()
    cursor = conn.cursor(buffered=True)

    cursor.execute("SELECT product_id FROM Product WHERE LOWER(product_name) = LOWER(%s) AND product_id != %s", (product_name, id))
    if cursor.fetchone():
        cursor.close()
        conn.close()
        return jsonify({"message": f"Product with name '{product_name}' already exists"}), 400

    cursor.execute("""
        UPDATE Product
        SET status=%s,
            product_name=%s
        WHERE product_id=%s
    """, (
        data["status"], product_name,
        id
    ))

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({
        "message": "Product Updated"
    })


def delete_product(id):

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Check if product exists
        cursor.execute("SELECT product_name FROM Product WHERE product_id=%s", (id,))
        product = cursor.fetchone()
        if not product:
            return jsonify({"message": "Product not found"}), 404

        prod_name = product["product_name"]

        # Check references in Sales
        cursor.execute("SELECT COUNT(*) AS cnt FROM Sales WHERE product_id=%s", (id,))
        sales_cnt = cursor.fetchone()["cnt"]

        # Check references in Production
        cursor.execute("SELECT COUNT(*) AS cnt FROM Production WHERE product_id=%s", (id,))
        prod_cnt = cursor.fetchone()["cnt"]

        if sales_cnt > 0 or prod_cnt > 0:
            reasons = []
            if sales_cnt > 0:
                reasons.append(f"{sales_cnt} sales record(s)")
            if prod_cnt > 0:
                reasons.append(f"{prod_cnt} production record(s)")
            reason_str = " and ".join(reasons)

            return jsonify({
                "message": f"Cannot delete product '{prod_name}'. It is associated with {reason_str}. Please set its status to 'Inactive' instead."
            }), 400

        # Safe to delete if not referenced in any records
        cursor.execute("DELETE FROM Product WHERE product_id=%s", (id,))
        conn.commit()

        return jsonify({
            "message": f"Product '{prod_name}' deleted successfully"
        })

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()
def get_active_products():

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            product_id,
            product_name
        FROM Product
        WHERE status = 'Active'
        ORDER BY product_name
    """)

    products = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(products)