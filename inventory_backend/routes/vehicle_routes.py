from flask import Blueprint
from services.vehicle_service import (
    add_vehicle,
    get_vehicles
)

vehicle_bp = Blueprint("vehicle", __name__)

vehicle_bp.route("/vehicles", methods=["POST"])(add_vehicle)
vehicle_bp.route("/api/vehicles", methods=["GET"])(get_vehicles)