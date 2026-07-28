from flask import jsonify, request
from db import get_connection
from datetime import datetime
import re
from services.activity_log_service import log_activity

def validate_vehicle_number(v_num):
    # Pattern: 1-2 letters, 2 digits, 1-2 letters, 4 digits
    pattern = r"^[A-Z]{1,2}\d{2}[A-Z]{1,2}\d{4}$"
    return bool(re.match(pattern, v_num))

def add_vehicle():
    data = request.json
    v_num = data.get("vehicle_number", "").replace(" ", "").replace("-", "").upper()
    if not validate_vehicle_number(v_num):
        return jsonify({
            "message": "Invalid vehicle number format. Expected format: 2 letters, 2 digits, 2 letters, 4 digits (e.g., MH12AB1234 or JR09B9987)"
        }), 400

    conn = get_connection()
    cursor = conn.cursor()

    try:
        user = request.user
        role = user.get("role", "Clerk")
        
        status = "Active" if role == "Manager" else "Pending"

        cursor.execute("SELECT vehicle_number FROM Vehicle WHERE UPPER(vehicle_number) = %s", (v_num,))
        if cursor.fetchone():
            return jsonify({"message": f"Duplicate Entry Detected: Vehicle with number '{v_num}' already exists."}), 400

        cursor.execute("""
            INSERT INTO Vehicle (vehicle_number, owner, status, requested_by, requested_at)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            v_num,
            data["owner"],
            status,
            user["user_id"] if role == "Clerk" else None,
            datetime.utcnow() if role == "Clerk" else None
        ))

        if role == "Clerk":
            cursor.execute("""
                INSERT INTO Approval_Requests (requester_id, request_type, reference_id, status)
                VALUES (%s, 'vehicle', %s, 'pending')
            """, (user["user_id"], v_num))

        from services.activity_log_service import log_activity
        log_activity(
            user.get("user_id"),
            user.get("username", "System"),
            role,
            "CREATE",
            "Vehicle",
            f"Added Vehicle '{v_num}' (Owner: {data.get('owner')}, Status: {status})"
        )

        conn.commit()

        msg = "Vehicle Added Successfully" if role == "Manager" else "Vehicle Request Submitted (Pending Manager Approval)"
        return jsonify({"message": msg}), 201

    except Exception as e:

        conn.rollback()

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        cursor.close()
        conn.close()


def get_vehicles():

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT * FROM Vehicle 
        ORDER BY COALESCE(requested_at, approved_at, '1970-01-01 00:00:00') DESC, vehicle_number DESC
    """)

    vehicles = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(vehicles)

def update_vehicle(vehicle_number):

    data = request.json
    new_v_num = data.get("vehicle_number", "").replace(" ", "").replace("-", "").upper()
    if not validate_vehicle_number(new_v_num):
        return jsonify({
            "message": "Invalid vehicle number format. Expected format: 2 letters, 2 digits, 2 letters, 4 digits (e.g., MH12AB1234 or JR09B9987)"
        }), 400

    conn = get_connection()
    cursor = conn.cursor()

    try:
        if new_v_num != vehicle_number:
            cursor.execute("SELECT vehicle_number FROM Vehicle WHERE UPPER(vehicle_number) = %s", (new_v_num,))
            if cursor.fetchone():
                return jsonify({"message": f"Duplicate Entry Detected: Vehicle with number '{new_v_num}' already exists."}), 400

        cursor.execute("""
            UPDATE Vehicle
            SET
                vehicle_number=%s,
                owner=%s,
                status=%s
            WHERE vehicle_number=%s
        """, (
            new_v_num,
            data["owner"],
            data.get("status", "Active"),
            vehicle_number
        ))

        conn.commit()

        return jsonify({
            "message": "Vehicle Updated Successfully"
        })

    except Exception as e:

        conn.rollback()

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        cursor.close()
        conn.close()
    

def delete_vehicle(vehicle_number):

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Check if vehicle exists
        cursor.execute("SELECT vehicle_number FROM Vehicle WHERE vehicle_number=%s", (vehicle_number,))
        v = cursor.fetchone()
        if not v:
            return jsonify({"message": "Vehicle not found"}), 404

        # Check references in Sales
        cursor.execute("SELECT COUNT(*) AS cnt FROM Sales WHERE vehicle_number=%s", (vehicle_number,))
        sales_cnt = cursor.fetchone()["cnt"]

        # Check references in Vehicle_Activity (Raw Material)
        cursor.execute("SELECT COUNT(*) AS cnt FROM Vehicle_Activity WHERE vehicle_number=%s", (vehicle_number,))
        act_cnt = cursor.fetchone()["cnt"]

        if sales_cnt > 0 or act_cnt > 0:
            reasons = []
            if sales_cnt > 0:
                reasons.append(f"{sales_cnt} sales record(s)")
            if act_cnt > 0:
                reasons.append(f"{act_cnt} raw material trip(s)")
            reason_str = " and ".join(reasons)

            return jsonify({
                "message": f"Cannot delete vehicle '{vehicle_number}'. It is associated with {reason_str}. Please set its status to 'Inactive' instead."
            }), 400

        cursor.execute("DELETE FROM Vehicle WHERE vehicle_number=%s", (vehicle_number,))
        conn.commit()

        return jsonify({
            "message": f"Vehicle '{vehicle_number}' Deleted Successfully"
        })

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


def get_active_vehicles():

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            vehicle_number,
            owner
        FROM Vehicle
        WHERE status = 'Active'
        ORDER BY vehicle_number
    """)

    vehicles = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(vehicles)