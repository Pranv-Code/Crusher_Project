from flask import Blueprint
from services.vehicle_activity_service import (
    add_vehicle_activity,
    get_vehicle_activity,
    update_vehicle_activity,
    delete_vehicle_activity
)
from middleware.auth_middleware import require_auth, require_role

vehicle_activity_bp = Blueprint("vehicle_activity", __name__)

vehicle_activity_bp.route("/api/vehicle-activity", methods=["GET"])(require_auth(get_vehicle_activity))
vehicle_activity_bp.route("/api/vehicle-activity", methods=["POST"])(require_auth(add_vehicle_activity))

@vehicle_activity_bp.route("/api/vehicle-activity/<int:id>", methods=["PUT"])
@require_auth
@require_role("Manager")
def update(id):
    return update_vehicle_activity(id)

@vehicle_activity_bp.route("/api/vehicle-activity/<int:id>", methods=["DELETE"])
@require_auth
@require_role("Manager")
def delete(id):
    return delete_vehicle_activity(id)