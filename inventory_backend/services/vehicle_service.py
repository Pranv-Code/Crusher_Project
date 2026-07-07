from flask import jsonify, request
from db import get_connection


def add_vehicle():

    data = request.json

    conn = get_connection()
    cursor = conn.cursor()

    try:

        cursor.execute("""
            INSERT INTO Vehicle(vehicle_number,owner)
            VALUES(%s,%s)
        """, (data["vehicle_number"],data["owner"],))

        conn.commit()

        return jsonify({
            "message": "Vehicle Added Successfully"
        }), 201

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

    cursor.execute("SELECT * FROM Vehicle")

    vehicles = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(vehicles)