from flask import Blueprint
from services.product_service import (
    get_products,
    get_product,
    add_product,
    update_product,
    delete_product,
    get_active_products
)

product_bp = Blueprint("products", __name__)

product_bp.route("/api/products", methods=["GET"])(get_products)
product_bp.route("/api/products/<int:id>", methods=["GET"])(get_product)
product_bp.route("/api/products/active", methods=["GET"])(get_active_products)

product_bp.route("/api/products", methods=["POST"])(add_product)
product_bp.route("/api/products/<int:id>", methods=["PUT"])(update_product)
product_bp.route("/api/products/<int:id>", methods=["DELETE"])(delete_product)

product_bp.route("/api/products", methods=["POST"])(add_product)
product_bp.route("/api/products/<int:id>", methods=["PUT"])(update_product)
product_bp.route("/api/products/<int:id>", methods=["DELETE"])(delete_product)
