from flask import Blueprint
from services.goods_return_service import (
    get_goods_returns,
    add_goods_return,
    delete_goods_return,
    get_goods_return_stats
)
from middleware.auth_middleware import require_auth, require_role

goods_return_bp = Blueprint("goods_returns", __name__)

goods_return_bp.route("/api/goods-returns", methods=["GET"])(require_auth(get_goods_returns))
goods_return_bp.route("/api/goods-returns/stats", methods=["GET"])(require_auth(get_goods_return_stats))
goods_return_bp.route("/api/goods-returns", methods=["POST"])(require_auth(add_goods_return))
goods_return_bp.route("/api/goods-returns/<int:return_id>", methods=["DELETE"])(require_auth(require_role("Manager")(delete_goods_return)))
