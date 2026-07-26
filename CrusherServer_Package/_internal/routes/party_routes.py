from flask import Blueprint
from services.party_service import (
    get_parties,
    get_active_parties,
    get_party,
    add_party,
    update_party,
    delete_party
)
from middleware.auth_middleware import require_auth, require_role

party_bp = Blueprint("party", __name__)

party_bp.route("/api/parties", methods=["GET"])(require_auth(get_parties))
party_bp.route("/api/parties/active", methods=["GET"])(require_auth(get_active_parties))
party_bp.route("/api/parties/<int:id>", methods=["GET"])(require_auth(get_party))
party_bp.route("/api/parties", methods=["POST"])(require_auth(add_party))

@party_bp.route("/api/parties/<int:id>", methods=["PUT"])
@require_auth
@require_role("Manager")
def update(id):
    return update_party(id)

@party_bp.route("/api/parties/<int:id>", methods=["DELETE"])
@require_auth
@require_role("Manager")
def delete(id):
    return delete_party(id)