from flask import Blueprint
from services.vehicle_service import (
    add_vehicle,
    get_vehicles,
    update_vehicle,
    delete_vehicle,
    get_active_vehicles
)
from middleware.auth_middleware import require_auth, require_role

vehicle_bp = Blueprint("vehicle", __name__)

vehicle_bp.route("/api/vehicles", methods=["POST"])(require_auth(add_vehicle))
vehicle_bp.route("/api/vehicles", methods=["GET"])(require_auth(get_vehicles))
vehicle_bp.route("/api/vehicles/active", methods=["GET"])(require_auth(get_active_vehicles))

@vehicle_bp.route("/api/vehicles/<string:vehicle_number>", methods=["PUT"])
@require_auth
@require_role("Manager")
def update(vehicle_number):
    return update_vehicle(vehicle_number)

@vehicle_bp.route("/api/vehicles/<string:vehicle_number>", methods=["DELETE"])
@require_auth
@require_role("Manager")
def delete(vehicle_number):
    return delete_vehicle(vehicle_number)