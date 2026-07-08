from flask import Blueprint
from services.vehicle_service import (
    add_vehicle,
    get_vehicles,
    update_vehicle,
    delete_vehicle
)

vehicle_bp = Blueprint("vehicle", __name__)

vehicle_bp.route("/api/vehicles", methods=["POST"])(add_vehicle)
vehicle_bp.route("/api/vehicles", methods=["GET"])(get_vehicles)
@vehicle_bp.route("/api/vehicles/<string:vehicle_number>", methods=["PUT"])
def update(vehicle_number):
    return update_vehicle(vehicle_number)


@vehicle_bp.route("/api/vehicles/<string:vehicle_number>", methods=["DELETE"])
def delete(vehicle_number):
    return delete_vehicle(vehicle_number)