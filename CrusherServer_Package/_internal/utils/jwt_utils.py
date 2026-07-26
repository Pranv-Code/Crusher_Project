import jwt
import datetime
from config import Config

def generate_token(user_id: int, role: str, username: str, expiry_hours: int = 24) -> str:
    """Generate a JWT token for the user."""
    payload = {
        "user_id": user_id,
        "role": role,
        "username": username,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=expiry_hours),
        "iat": datetime.datetime.utcnow()
    }
    return jwt.encode(payload, Config.SECRET_KEY, algorithm="HS256")

def decode_token(token: str) -> dict:
    """Decode a JWT token and return payload, or None if invalid/expired."""
    try:
        return jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None
