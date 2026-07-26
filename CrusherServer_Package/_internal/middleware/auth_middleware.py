from functools import wraps
from flask import request, jsonify
from utils.jwt_utils import decode_token

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"message": "Missing Authorization Header"}), 401
            
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return jsonify({"message": "Invalid Authorization Header Format. Expected 'Bearer <token>'"}), 401
            
        token = parts[1]
        payload = decode_token(token)
        if not payload:
            return jsonify({"message": "Invalid or Expired Token"}), 401
            
        # Attach user info to request
        request.user = payload
        return f(*args, **kwargs)
        
    return decorated

def require_role(*roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not hasattr(request, "user") or not request.user:
                return jsonify({"message": "Authentication Required"}), 401
            if request.user.get("role") not in roles:
                return jsonify({"message": f"Unauthorized. Requires role(s): {', '.join(roles)}"}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator
