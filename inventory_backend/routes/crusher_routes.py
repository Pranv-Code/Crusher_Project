from flask import Blueprint
from services.crusher_service import (
    get_crushers,
    add_crusher,
    update_crusher,
    delete_crusher
)
from middleware.auth_middleware import require_auth

crusher_bp = Blueprint("crusher", __name__)

@crusher_bp.route("/api/crushers", methods=["GET"])
@require_auth
def list_crushers():
    return get_crushers()

@crusher_bp.route("/api/crushers", methods=["POST"])
@require_auth
def create_crusher():
    return add_crusher()

@crusher_bp.route("/api/crushers/<int:id>", methods=["PUT"])
@require_auth
def edit_crusher(id):
    return update_crusher(id)

@crusher_bp.route("/api/crushers/<int:id>", methods=["DELETE"])
@require_auth
def remove_crusher(id):
    return delete_crusher(id)
