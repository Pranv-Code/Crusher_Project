from flask import jsonify, request
from db import get_connection
from services.activity_log_service import log_activity


def get_crushers():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT crusher_id, crusher_name, status, created_at
        FROM Crusher
        ORDER BY crusher_id ASC
    """)
    crushers = cursor.fetchall()
    for c in crushers:
        if c.get("created_at"):
            c["created_at"] = str(c["created_at"])

    cursor.close()
    conn.close()
    return jsonify(crushers)


def add_crusher():
    data = request.json or {}
    name = (data.get("crusher_name") or "").strip()
    status = (data.get("status") or "Active").strip()

    if not name:
        return jsonify({"message": "Crusher Name is required"}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("SELECT crusher_id FROM Crusher WHERE LOWER(crusher_name) = LOWER(%s)", (name,))
        if cursor.fetchone():
            return jsonify({"message": f"Crusher '{name}' already exists"}), 400

        cursor.execute("""
            INSERT INTO Crusher (crusher_name, status)
            VALUES (%s, %s)
        """, (name, status))

        cid = cursor.lastrowid
        user = getattr(request, "user", {}) or {}
        log_activity(
            user.get("user_id"),
            user.get("username", "System"),
            user.get("role", "User"),
            "CREATE",
            "Crusher",
            f"Added new Crusher #{cid}: '{name}'"
        )
        conn.commit()
        return jsonify({"message": "Crusher added successfully", "crusher_id": cid}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


def update_crusher(id):
    data = request.json or {}
    name = (data.get("crusher_name") or "").strip()
    status = (data.get("status") or "Active").strip()

    if not name:
        return jsonify({"message": "Crusher Name is required"}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM Crusher WHERE crusher_id = %s", (id,))
        c = cursor.fetchone()
        if not c:
            return jsonify({"message": "Crusher not found"}), 404

        cursor.execute("SELECT crusher_id FROM Crusher WHERE LOWER(crusher_name) = LOWER(%s) AND crusher_id != %s", (name, id))
        if cursor.fetchone():
            return jsonify({"message": f"Another crusher with name '{name}' already exists"}), 400

        cursor.execute("""
            UPDATE Crusher
            SET crusher_name = %s, status = %s
            WHERE crusher_id = %s
        """, (name, status, id))

        user = getattr(request, "user", {}) or {}
        log_activity(
            user.get("user_id"),
            user.get("username", "System"),
            user.get("role", "User"),
            "UPDATE",
            "Crusher",
            f"Updated Crusher #{id}: '{name}' ({status})"
        )
        conn.commit()
        return jsonify({"message": "Crusher updated successfully"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


def delete_crusher(id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM Crusher WHERE crusher_id = %s", (id,))
        c = cursor.fetchone()
        if not c:
            return jsonify({"message": "Crusher not found"}), 404

        # Check if crusher is referenced in Production
        cursor.execute("SELECT COUNT(*) AS cnt FROM Production WHERE crusher_name = %s", (c["crusher_name"],))
        res = cursor.fetchone()
        cnt = res["cnt"] if res else 0

        if cnt > 0:
            # Soft delete by marking Inactive
            cursor.execute("UPDATE Crusher SET status = 'Inactive' WHERE crusher_id = %s", (id,))
            msg = f"Crusher '{c['crusher_name']}' has {cnt} production entries. Marked as Inactive."
        else:
            cursor.execute("DELETE FROM Crusher WHERE crusher_id = %s", (id,))
            msg = f"Crusher '{c['crusher_name']}' deleted successfully."

        user = getattr(request, "user", {}) or {}
        log_activity(
            user.get("user_id"),
            user.get("username", "System"),
            user.get("role", "User"),
            "DELETE",
            "Crusher",
            f"Deleted/Deactivated Crusher #{id}: '{c['crusher_name']}'"
        )
        conn.commit()
        return jsonify({"message": msg})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
