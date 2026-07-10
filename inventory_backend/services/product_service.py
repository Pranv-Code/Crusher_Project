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

    qty = unit_convertor(
        data["unit"],
        data["quantity_tons"]
    )

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO Product
        (product_name, quantity_tons)
        VALUES(%s,%s)
    """, (
        data["product_name"],
        qty
    ))

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({
        "message": "Product Added"
    }), 201


def update_product(id):

    data = request.json

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE Product
        SET status=%s,
            product_name=%s
        WHERE product_id=%s
    """, (
        data["status"],data["product_name"],
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