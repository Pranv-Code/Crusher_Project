from flask import Blueprint
from middleware.auth_middleware import require_auth, require_role
from services.activity_log_service import get_audit_logs

audit_bp = Blueprint("audit", __name__)

@audit_bp.route("/api/audit-logs", methods=["GET"])
@require_auth
@require_role("Manager")
def list_audit_logs():
    return get_audit_logs()
