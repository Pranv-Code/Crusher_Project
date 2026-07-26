from flask import jsonify, request
from db import get_connection
from services.activity_log_service import log_activity

def capitalize_words(s):
    if not s:
        return ""
    return " ".join(word.capitalize() for word in s.strip().split())


def add_vehicle_activity():
    data = request.json

    try:
        total_w = float(data.get("total_weight", 0))
        vehicle_w = float(data.get("vehicle_weight", 0))
    except (ValueError, TypeError):
        return jsonify({"message": "Weights must be valid numbers"}), 400

    if total_w <= 0 or vehicle_w <= 0:
        return jsonify({"message": "Total Weight and Vehicle Weight must be greater than zero"}), 400

    if total_w < vehicle_w:
        return jsonify({"message": "Total Weight cannot be less than Vehicle Weight"}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Check Vehicle Exists
        cursor.execute("""
            SELECT vehicle_number
            FROM Vehicle
            WHERE vehicle_number=%s
        """, (data["vehicle_number"],))

        vehicle = cursor.fetchone()
        if not vehicle:
            return jsonify({"message": "Vehicle not found"}), 404

        cursor.execute("""
            SELECT activity_id FROM Vehicle_Activity
            WHERE activity_date = %s AND vehicle_number = %s AND ABS(total_weight - %s) < 0.001 AND ABS(vehicle_weight - %s) < 0.001
        """, (data["activity_date"], data["vehicle_number"], float(data["total_weight"]), float(data["vehicle_weight"])))
        if cursor.fetchone():
            return jsonify({"message": "Duplicate Entry Detected: A raw material record with the exact same date, vehicle, and weights already exists."}), 400

        cursor.execute("""
            INSERT INTO Vehicle_Activity
            (
                activity_date,
                vehicle_number,
                arrival_time,
                loading_start_time,
                unloading_end_time,
                turnaround_time,
                total_weight,
                vehicle_weight,
                net_weight,
                site
            )
            VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            data["activity_date"],
            data["vehicle_number"],
            data["arrival_time"],
            data["loading_start_time"],
            data["unloading_end_time"],
            data["turnaround_time"],
            data["total_weight"],
            data["vehicle_weight"],
            data["net_weight"],
            capitalize_words(data.get("site", ""))
        ))

        act_id = cursor.lastrowid
        from services.activity_log_service import log_activity
        u = getattr(request, "user", {}) or {}
        log_activity(
            u.get("user_id"),
            u.get("username", "System"),
            u.get("role", "User"),
            "CREATE",
            "RawMaterial",
            f"Created Raw Material entry #{act_id} for Vehicle '{data['vehicle_number']}' (Net: {data.get('net_weight')} MT)"
        )

        conn.commit()
        return jsonify({
            "message": "Vehicle Activity Added Successfully"
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({
            "error": str(e)
        }), 500
    finally:
        cursor.close()
        conn.close()

def get_vehicle_activity():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT *
            FROM Vehicle_Activity
            ORDER BY activity_date DESC
        """)

        activities = cursor.fetchall()

        for activity in activities:
            if activity["activity_date"]:
                activity["activity_date"] = activity["activity_date"].strftime("%Y-%m-%d")
            activity["arrival_time"] = str(activity["arrival_time"])
            activity["loading_start_time"] = str(activity["loading_start_time"])
            activity["unloading_end_time"] = str(activity["unloading_end_time"])
            activity["turnaround_time"] = str(activity["turnaround_time"])
            activity["total_weight"] = float(activity["total_weight"])
            activity["vehicle_weight"] = float(activity["vehicle_weight"])
            activity["net_weight"] = float(activity["net_weight"])

        return jsonify(activities)
    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500
    finally:
        cursor.close()
        conn.close()

def update_vehicle_activity(id):
    data = request.json

    try:
        total_w = float(data.get("total_weight", 0))
        vehicle_w = float(data.get("vehicle_weight", 0))
    except (ValueError, TypeError):
        return jsonify({"message": "Weights must be valid numbers"}), 400

    if total_w <= 0 or vehicle_w <= 0:
        return jsonify({"message": "Total Weight and Vehicle Weight must be greater than zero"}), 400

    if total_w < vehicle_w:
        return jsonify({"message": "Total Weight cannot be less than Vehicle Weight"}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Check Vehicle Exists
        cursor.execute("""
            SELECT vehicle_number
            FROM Vehicle
            WHERE vehicle_number=%s
        """, (data["vehicle_number"],))

        vehicle = cursor.fetchone()
        if not vehicle:
            return jsonify({
                "message": "Vehicle not found"
            }), 404

        cursor.execute("""
            UPDATE Vehicle_Activity
            SET
                activity_date=%s,
                vehicle_number=%s,
                arrival_time=%s,
                loading_start_time=%s,
                unloading_end_time=%s,
                turnaround_time=%s,
                total_weight=%s,
                vehicle_weight=%s,
                net_weight=%s,
                site=%s
            WHERE activity_id=%s
        """, (
            data["activity_date"],
            data["vehicle_number"],
            data["arrival_time"],
            data["loading_start_time"],
            data["unloading_end_time"],
            data["turnaround_time"],
            data["total_weight"],
            data["vehicle_weight"],
            data["net_weight"],
            capitalize_words(data.get("site", "")),
            id
        ))

        from services.activity_log_service import log_activity
        u = getattr(request, "user", {}) or {}
        log_activity(
            u.get("user_id"),
            u.get("username", "System"),
            u.get("role", "User"),
            "EDIT",
            "RawMaterial",
            f"Updated Raw Material entry #{id} for Vehicle '{data.get('vehicle_number')}'"
        )
        conn.commit()
        return jsonify({
            "message": "Vehicle Activity Updated Successfully"
        })

    except Exception as e:
        conn.rollback()
        return jsonify({
            "error": str(e)
        }), 500
    finally:
        cursor.close()
        conn.close()

def delete_vehicle_activity(id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            DELETE FROM Vehicle_Activity
            WHERE activity_id=%s
        """, (id,))

        conn.commit()
        return jsonify({
            "message": "Vehicle Activity Deleted Successfully"
        })

    except Exception as e:
        conn.rollback()
        return jsonify({
            "error": str(e)
        }), 500
    finally:
        cursor.close()
        conn.close()