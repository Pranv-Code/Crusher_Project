from flask import jsonify, request
from db import get_connection


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


def add_party():

    data = request.json

    conn = get_connection()
    cursor = conn.cursor()

    try:

        cursor.execute("""
            INSERT INTO Party
            (
                party_name,
                gst_no,
                address,
                pan_no
            )
            VALUES (%s,%s,%s,%s)
        """, (
            data["party_name"],
            data["gst_no"],
            data["address"],
            data["pan_no"]
        ))

        conn.commit()

        return jsonify({
            "message": "Party Added Successfully"
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

        cursor.execute("""
            UPDATE Party
            SET
                party_name=%s,
                gst_no=%s,
                address=%s,
                pan_no=%s
            WHERE party_id=%s
        """, (
            data["party_name"],
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
    cursor = conn.cursor()

    try:

        cursor.execute("""
            DELETE FROM Party
            WHERE party_id=%s
        """, (id,))

        conn.commit()

        return jsonify({
            "message": "Party Deleted Successfully"
        })

    except Exception as e:

        conn.rollback()

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        cursor.close()
        conn.close()