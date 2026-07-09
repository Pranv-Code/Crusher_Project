from flask import Blueprint
from services.sales_service import (
    add_sale,
    get_sales,
    update_sale,
    delete_sale,
)

sales_bp = Blueprint("sales", __name__)
sales_bp.route("/api/sales", methods=["GET"])(get_sales)
sales_bp.route("/api/sales", methods=["POST"])(add_sale)
sales_bp.route("/api/sales/<int:id>", methods=["PUT"])(update_sale)
sales_bp.route("/api/sales/<int:id>", methods=["DELETE"])(delete_sale)