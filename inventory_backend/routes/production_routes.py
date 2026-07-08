from flask import Blueprint
from services.production_service import (
    view_production,
    add_production,
    update_production,
    delete_production
)

production_bp = Blueprint("production", __name__)

production_bp.route("/api/production", methods=["GET"])(view_production)
production_bp.route("/api/production", methods=["POST"])(add_production)

production_bp.route("/api/production/<int:id>", methods=["PUT"])(update_production)
production_bp.route("/api/production/<int:id>", methods=["DELETE"])(delete_production)