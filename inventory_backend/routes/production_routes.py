from flask import Blueprint
from services.production_service import (
    view_production,
    add_production
)

production_bp = Blueprint("production", __name__)

production_bp.route("/api/production", methods=["GET"])(view_production)
production_bp.route("/production", methods=["POST"])(add_production)