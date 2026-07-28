from flask import Blueprint
from services.production_service import (
    view_production,
    add_production,
    update_production,
    delete_production
)
from middleware.auth_middleware import require_auth

production_bp = Blueprint("production", __name__)

@production_bp.route("/api/production", methods=["GET"])
@require_auth
def list_production():
    return view_production()

@production_bp.route("/api/production", methods=["POST"])
@require_auth
def create_production():
    return add_production()

@production_bp.route("/api/production/<int:id>", methods=["PUT"])
@require_auth
def edit_production(id):
    return update_production(id)

@production_bp.route("/api/production/<int:id>", methods=["DELETE"])
@require_auth
def remove_production(id):
    return delete_production(id)