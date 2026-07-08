from flask import Blueprint
from services.party_service import (
    get_parties,
    get_active_parties,
    get_party,
    add_party,
    update_party,
    delete_party
)

party_bp = Blueprint("party", __name__)

party_bp.route("/api/parties", methods=["GET"])(get_parties)
party_bp.route("/api/parties/active", methods=["GET"])(get_active_parties)
party_bp.route("/api/parties/<int:id>", methods=["GET"])(get_party)
party_bp.route("/api/parties", methods=["POST"])(add_party)
party_bp.route("/api/parties/<int:id>", methods=["PUT"])(update_party)
party_bp.route("/api/parties/<int:id>", methods=["DELETE"])(delete_party)