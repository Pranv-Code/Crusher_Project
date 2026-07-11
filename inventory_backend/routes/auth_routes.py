from flask import Blueprint, request
from services.auth_service import register_user, login_user, get_me
from middleware.auth_middleware import require_auth

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/api/auth/register", methods=["POST"])
def register():
    return register_user()

@auth_bp.route("/api/auth/login", methods=["POST"])
def login():
    return login_user()

@auth_bp.route("/api/auth/me", methods=["GET"])
@require_auth
def me():
    return get_me(request.user["user_id"])
