from flask import jsonify, request
from db import get_connection
from datetime import datetime
from services.activity_log_service import log_activity


def get_parties():

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT *
        FROM Party
        ORDER BY party_name
    """)

    parties = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(parties)


def get_active_parties():

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            party_id,
            party_name
        FROM Party
        WHERE status = 'Active'
        ORDER BY party_name
    """)

    parties = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(parties)


def get_party(id):

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT *
        FROM Party
        WHERE party_id=%s
    """, (id,))

    party = cursor.fetchone()

    cursor.close()
    conn.close()

    if party:
        return jsonify(party)

    return jsonify({"message": "Party not found"}), 404


def format_party_name(s):
    if not s or not isinstance(s, str):
        return ""
    s_clean = s.strip()
    if not s_clean:
        return ""
    return s_clean[0].upper() + s_clean[1:]

capitalize_words = format_party_name


def add_party():

    data = request.json

    conn = get_connection()
    cursor = conn.cursor()

    try:
        user = request.user
        role = user.get("role", "Clerk")
        status = "Active" if role == "Manager" else "Pending"

        party_name_clean = capitalize_words(data["party_name"])
        cursor.execute("SELECT party_id FROM Party WHERE LOWER(party_name) = LOWER(%s)", (party_name_clean,))
        if cursor.fetchone():
            return jsonify({"message": f"Duplicate Entry Detected: Party with name '{party_name_clean}' already exists."}), 400

        cursor.execute("""
            INSERT INTO Party
            (
                party_name,
                gst_no,
                address,
                pan_no,
                status,
                requested_by,
                requested_at
            )
            VALUES (%s,%s,%s,%s,%s,%s,%s)
        """, (
            party_name_clean,
            data["gst_no"],
            data["address"],
            data["pan_no"],
            status,
            user["user_id"] if role == "Clerk" else None,
            datetime.utcnow() if role == "Clerk" else None
        ))

        party_id = cursor.lastrowid

        if role == "Clerk":
            cursor.execute("""
                INSERT INTO Approval_Requests (requester_id, request_type, reference_id, status)
                VALUES (%s, 'party', %s, 'pending')
            """, (user["user_id"], str(party_id)))

        from services.activity_log_service import log_activity
        log_activity(
            user.get("user_id"),
            user.get("username", "System"),
            role,
            "CREATE",
            "Party",
            f"Added Party '{party_name_clean}' (Status: {status})"
        )

        conn.commit()

        msg = "Party Added Successfully" if role == "Manager" else "Party Request Submitted (Pending Manager Approval)"
        return jsonify({
            "message": msg
        }), 201

    except Exception as e:

        conn.rollback()

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        cursor.close()
        conn.close()


def update_party(id):

    data = request.json

    conn = get_connection()
    cursor = conn.cursor()

    try:
        party_name_clean = capitalize_words(data["party_name"])
        cursor.execute("SELECT party_id FROM Party WHERE LOWER(party_name) = LOWER(%s) AND party_id != %s", (party_name_clean, id))
        if cursor.fetchone():
            return jsonify({"message": f"Duplicate Entry Detected: Party with name '{party_name_clean}' already exists."}), 400

        cursor.execute("""
            UPDATE Party
            SET
                party_name=%s,
                gst_no=%s,
                address=%s,
                pan_no=%s
            WHERE party_id=%s
        """, (
            party_name_clean,
            data["gst_no"],
            data["address"],
            data["pan_no"],
            id
        ))

        conn.commit()

        return jsonify({
            "message": "Party Updated Successfully"
        })

    except Exception as e:

        conn.rollback()

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        cursor.close()
        conn.close()


def delete_party(id):

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Check if party exists
        cursor.execute("SELECT party_name FROM Party WHERE party_id=%s", (id,))
        party = cursor.fetchone()
        if not party:
            return jsonify({"message": "Party not found"}), 404

        party_name = party["party_name"]

        # Check references in Sales
        cursor.execute("SELECT COUNT(*) AS cnt FROM Sales WHERE party_id=%s", (id,))
        sales_cnt = cursor.fetchone()["cnt"]

        if sales_cnt > 0:
            return jsonify({
                "message": f"Cannot delete party '{party_name}'. It is associated with {sales_cnt} sales transaction(s). Please set its status to 'Inactive' instead."
            }), 400

        cursor.execute("DELETE FROM Party WHERE party_id=%s", (id,))
        conn.commit()

        return jsonify({
            "message": f"Party '{party_name}' Deleted Successfully"
        })

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()