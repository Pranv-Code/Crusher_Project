from flask import Blueprint
from services.reports_service import get_party_report

reports_bp = Blueprint("reports", __name__)

@reports_bp.route("/api/reports/party/<int:party_id>", methods=["GET"])
def party_report(party_id):
    return get_party_report(party_id)
