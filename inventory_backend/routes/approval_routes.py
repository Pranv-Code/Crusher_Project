from flask import Blueprint, request
from services.approval_service import get_all_approvals, action_approval, get_my_pending_approvals, request_report_print
from middleware.auth_middleware import require_auth, require_role

approval_bp = Blueprint("approval", __name__)

@approval_bp.route("/api/approvals", methods=["GET"])
@require_auth
@require_role("Manager")
def list_approvals():
    return get_all_approvals()

@approval_bp.route("/api/approvals/<int:request_id>", methods=["PUT"])
@require_auth
@require_role("Manager")
def process_approval(request_id):
    return action_approval(request_id, request.user["user_id"])

@approval_bp.route("/api/approvals/my-pending", methods=["GET"])
@require_auth
@require_role("Clerk")
def my_pending_approvals():
    return get_my_pending_approvals(request.user["user_id"])

@approval_bp.route("/api/approvals/request-report", methods=["POST"])
@require_auth
@require_role("Clerk")
def request_report():
    return request_report_print(request.user["user_id"])
