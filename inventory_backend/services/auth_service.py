import re
from flask import request, jsonify
from db import get_connection
from utils.password_utils import hash_password, check_password
from utils.jwt_utils import generate_token
from datetime import datetime

def register_user():
    data = request.json
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    role = data.get("role", "Clerk")  # Default to Clerk

    if not all([name, email, password]):
        return jsonify({"message": "Name, email and password are required"}), 400

    if role not in ("Manager", "Clerk"):
        return jsonify({"message": "Invalid role"}), 400

    # Auto-generate unique username
    # E.g. "Pranav Sawant" -> "pranav.sawant"
    base_username = name.lower()
    base_username = re.sub(r'\s+', '.', base_username)  # spaces -> dots
    base_username = re.sub(r'[^a-z0-9.]', '', base_username)  # strip non-alphanumeric except dots
    
    if not base_username:
        base_username = "user"
        
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Check if email is already registered
        cursor.execute("SELECT user_id FROM Users WHERE email = %s", (email,))
        if cursor.fetchone():
            return jsonify({"message": "Email is already registered"}), 400

        username = base_username
        counter = 1
        while True:
            cursor.execute("SELECT user_id FROM Users WHERE username = %s", (username,))
            if not cursor.fetchone():
                break
            counter += 1
            username = f"{base_username}{counter}"

        # Hash password
        pwd_hash = hash_password(password)

        # By default, we set status to 'Pending' to require manager approval
        cursor.execute("""
            INSERT INTO Users (name, email, username, password_hash, role, status)
            VALUES (%s, %s, %s, %s, %s, 'Pending')
        """, (name, email, username, pwd_hash, role))
        
        new_user_id = cursor.lastrowid

        # Insert user registration request into Approval_Requests
        cursor.execute("""
            INSERT INTO Approval_Requests (requester_id, request_type, reference_id, reference_data, status)
            VALUES (%s, 'user_registration', %s, NULL, 'pending')
        """, (new_user_id, str(new_user_id)))
        
        conn.commit()
        return jsonify({
            "message": "User registered successfully. Registration is pending approval from the Manager.",
            "username": username,
            "role": role
        }), 201

    except Exception as e:
        conn.rollback()
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


def login_user():
    data = request.json
    username_or_email = data.get("username", "").strip()
    password = data.get("password", "")

    if not username_or_email or not password:
        return jsonify({"message": "Username/email and password are required"}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Search by username or email
        cursor.execute("SELECT * FROM Users WHERE username = %s OR email = %s", (username_or_email, username_or_email))
        user = cursor.fetchone()

        if not user:
            return jsonify({"message": "Invalid username or password"}), 401

        if user["status"] != "Active":
            return jsonify({"message": f"User account is {user['status'].lower()}"}), 403

        # Verify password
        if not check_password(password, user["password_hash"]):
            return jsonify({"message": "Invalid username or password"}), 401

        # Generate token
        token = generate_token(user["user_id"], user["role"], user["username"])

        # Update last login
        cursor.execute("UPDATE Users SET last_login = %s WHERE user_id = %s", (datetime.utcnow(), user["user_id"]))
        conn.commit()

        return jsonify({
            "token": token,
            "user": {
                "user_id": user["user_id"],
                "name": user["name"],
                "username": user["username"],
                "email": user["email"],
                "role": user["role"]
            }
        }), 200

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


def get_me(user_id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT user_id, name, username, email, role, status FROM Users WHERE user_id = %s", (user_id,))
        user = cursor.fetchone()
        if not user:
            return jsonify({"message": "User not found"}), 404
        return jsonify(user), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
