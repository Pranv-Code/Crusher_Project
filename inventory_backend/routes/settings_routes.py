from flask import Blueprint
from middleware.auth_middleware import require_auth, require_role
from services.settings_service import get_settings, update_settings, get_settings_logs

settings_bp = Blueprint("settings", __name__, url_prefix="/api/settings")

@settings_bp.route("", methods=["GET"])
@require_auth
def get_settings_route():
    return get_settings()

@settings_bp.route("", methods=["POST"])
@require_auth
@require_role("Manager")
def update_settings_route():
    return update_settings()

@settings_bp.route("/logs", methods=["GET"])
@require_auth
@require_role("Manager")
def get_settings_logs_route():
    return get_settings_logs()
