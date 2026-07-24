import json
from flask import request, jsonify, has_request_context
from db import get_connection

def log_activity(user_id, username, role, action_type, module, description, ip_address=None):
    """Helper function to log user activity into Activity_Logs table."""
    try:
        if not ip_address and has_request_context():
            try:
                ip_address = request.headers.get("X-Forwarded-For", request.remote_addr)
                if ip_address and "," in ip_address:
                    ip_address = ip_address.split(",")[0].strip()
            except Exception:
                pass

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO Activity_Logs (user_id, username, role, user_role, action, action_type, module, entity_type, description, ip_address)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            username or "System",
            role or "User",
            role or "User",
            action_type or "INFO",
            action_type or "INFO",
            module or "General",
            module or "General",
            description or "",
            ip_address or "127.0.0.1"
        ))
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error logging activity ({action_type} - {module}): {e}")


def get_audit_logs():
    """Fetch activity audit logs with search, filter, and date criteria."""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        user_id = request.args.get("user_id")
        action_type = request.args.get("action_type")
        module = request.args.get("module")
        date_from = request.args.get("dateFrom")
        date_to = request.args.get("dateTo")
        search = request.args.get("search")

        query = "SELECT * FROM Activity_Logs WHERE 1=1"
        params = []

        if user_id:
            query += " AND user_id = %s"
            params.append(user_id)
        if action_type:
            query += " AND (action_type = %s OR action = %s)"
            params.extend([action_type, action_type])
        if module:
            query += " AND (module = %s OR entity_type = %s)"
            params.extend([module, module])
        if date_from:
            query += " AND DATE(created_at) >= %s"
            params.append(date_from)
        if date_to:
            query += " AND DATE(created_at) <= %s"
            params.append(date_to)
        if search:
            query += " AND (username LIKE %s OR description LIKE %s OR ip_address LIKE %s OR details LIKE %s)"
            s_param = f"%{search.strip()}%"
            params.extend([s_param, s_param, s_param, s_param])

        query += " ORDER BY created_at DESC LIMIT 500"
        cursor.execute(query, tuple(params))
        logs = cursor.fetchall()

        for l in logs:
            if l.get("created_at"):
                l["created_at"] = l["created_at"].strftime("%Y-%m-%d %H:%M:%S")
            if not l.get("username"):
                l["username"] = f"User #{l.get('user_id')}" if l.get("user_id") else "System"
            if not l.get("role"):
                l["role"] = l.get("user_role") or "User"
            if not l.get("action_type"):
                l["action_type"] = l.get("action") or "INFO"
            if not l.get("module"):
                l["module"] = l.get("entity_type") or "General"
            if not l.get("description"):
                l["description"] = str(l.get("details") or "No details")

        return jsonify(logs), 200
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
