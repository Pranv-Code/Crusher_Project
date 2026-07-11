from flask import request, jsonify
from db import get_connection
from utils.password_utils import hash_password

def list_users():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT user_id, name, email, username, role, status, created_at, last_login FROM Users ORDER BY user_id DESC")
        users = cursor.fetchall()
        for u in users:
            if u["created_at"]:
                u["created_at"] = u["created_at"].strftime("%Y-%m-%d %H:%M")
            if u["last_login"]:
                u["last_login"] = u["last_login"].strftime("%Y-%m-%d %H:%M")
        return jsonify(users), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

def change_user_status(user_id):
    data = request.json
    status = data.get("status")
    
    if status not in ("Active", "Inactive", "Pending"):
        return jsonify({"message": "Invalid status value"}), 400
        
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE Users SET status = %s WHERE user_id = %s", (status, user_id))
        conn.commit()
        return jsonify({"message": "User status updated successfully"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

def admin_reset_password(user_id):
    data = request.json
    new_password = data.get("password")
    
    if not new_password:
        return jsonify({"message": "Password is required"}), 400
        
    hashed = hash_password(new_password)
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE Users SET password_hash = %s WHERE user_id = %s", (hashed, user_id))
        conn.commit()
        return jsonify({"message": "User password reset successfully"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
