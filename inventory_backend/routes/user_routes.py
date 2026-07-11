from flask import Blueprint
from services.user_service import list_users, change_user_status, admin_reset_password
from middleware.auth_middleware import require_auth, require_role

user_bp = Blueprint("user", __name__)

@user_bp.route("/api/users", methods=["GET"])
@require_auth
@require_role("Manager")
def get_users():
    return list_users()

@user_bp.route("/api/users/<int:user_id>/status", methods=["PUT"])
@require_auth
@require_role("Manager")
def update_status(user_id):
    return change_user_status(user_id)

@user_bp.route("/api/users/<int:user_id>/reset-password", methods=["PUT"])
@require_auth
@require_role("Manager")
def reset_password(user_id):
    return admin_reset_password(user_id)
