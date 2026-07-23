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

    try:
        qty_val = float(data.get("quantity_tons", 0))
    except (ValueError, TypeError):
        return jsonify({"message": "Invalid quantity value"}), 400

    if qty_val < 0:
        return jsonify({"message": "Quantity cannot be negative"}), 400

    qty = unit_convertor(
        data["unit"],
        data["quantity_tons"]
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
    cursor = conn.cursor()

    cursor.execute(
        "DELETE FROM Product WHERE product_id=%s",
        (id,)
    )

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({
        "message": "Product Deleted"
    })
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