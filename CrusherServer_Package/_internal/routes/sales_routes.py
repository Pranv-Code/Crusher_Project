from flask import Blueprint
from services.sales_service import (
    add_sale,
    get_sales,
    update_sale,
    delete_sale,
    get_pending_sales,
    complete_unloading,
    add_sales_bulk
)
from middleware.auth_middleware import require_auth, require_role

sales_bp = Blueprint("sales", __name__)
sales_bp.route("/api/sales", methods=["GET"])(require_auth(get_sales))
sales_bp.route("/api/sales/pending", methods=["GET"])(require_auth(get_pending_sales))
sales_bp.route("/api/sales", methods=["POST"])(require_auth(add_sale))
sales_bp.route("/api/sales/bulk", methods=["POST"])(require_auth(add_sales_bulk))
sales_bp.route("/api/sales/<int:id>", methods=["PUT"])(require_auth(update_sale))
sales_bp.route("/api/sales/<int:id>", methods=["DELETE"])(require_auth(delete_sale))
sales_bp.route("/api/sales/<int:id>/unload", methods=["PUT"])(require_auth(complete_unloading))