from flask import Blueprint
from services.vehicle_activity_service import (
    add_vehicle_activity,
    get_vehicle_activity,
    update_vehicle_activity,
    delete_vehicle_activity
)

vehicle_activity_bp = Blueprint("vehicle_activity", __name__)

vehicle_activity_bp.route("/api/vehicle-activity", methods=["GET"])(get_vehicle_activity)
vehicle_activity_bp.route("/api/vehicle-activity", methods=["POST"])(add_vehicle_activity)
vehicle_activity_bp.route("/api/vehicle-activity/<int:id>", methods=["PUT"])(update_vehicle_activity)
vehicle_activity_bp.route("/api/vehicle-activity/<int:id>", methods=["DELETE"])(delete_vehicle_activity)