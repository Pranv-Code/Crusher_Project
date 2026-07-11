from flask import Blueprint
from services.production_service import (
    view_production,
    add_production,
    update_production,
    delete_production
)
from middleware.auth_middleware import require_auth

production_bp = Blueprint("production", __name__)

production_bp.route("/api/production", methods=["GET"])(require_auth(view_production))
production_bp.route("/api/production", methods=["POST"])(require_auth(add_production))

production_bp.route("/api/production/<int:id>", methods=["PUT"])(require_auth(update_production))
production_bp.route("/api/production/<int:id>", methods=["DELETE"])(require_auth(delete_production))