from flask import Blueprint
from services.vehicle_sale_service import get_vehicle_sales

vehicle_sale_bp = Blueprint("vehicle_sale", __name__)

vehicle_sale_bp.route("/api/vehicle-sales", methods=["GET"])(get_vehicle_sales)
