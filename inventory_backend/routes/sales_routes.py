from flask import Blueprint
from services.sales_service import add_sale, get_sales

sales_bp = Blueprint("sales", __name__)

sales_bp.route("/sales", methods=["POST"])(add_sale)
sales_bp.route("/api/sales", methods=["GET"])(get_sales)