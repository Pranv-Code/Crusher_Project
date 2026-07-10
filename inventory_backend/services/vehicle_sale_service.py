from flask import jsonify
from db import get_connection
from utils.unit_converter import ton_to_brass


def get_vehicle_sales():
    """
    Returns all VehicleSale entries joined with Sales, Vehicle, Product and Party
    for a full view of every vehicle-linked sale transaction.
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                vs.vehicle_sale_id,
                vs.sales_id,
                vs.vehicle_number,
                vs.created_at,
                v.owner             AS vehicle_owner,
                s.sales_date,
                pt.party_name,
                pr.product_name,
                s.quantity_tons,
                s.unit,
                s.site,
                s.price,
                s.loading_time,
                s.unloading_time,
                s.remarks
            FROM VehicleSale vs
            JOIN Sales s
                ON vs.sales_id = s.sales_id
            JOIN Party pt
                ON s.party_id = pt.party_id
            JOIN Product pr
                ON s.product_id = pr.product_id
            LEFT JOIN Vehicle v
                ON vs.vehicle_number = v.vehicle_number
            ORDER BY s.sales_date DESC, vs.vehicle_sale_id DESC
        """)

        rows = cursor.fetchall()

        for row in rows:
            # Format date
            if row["sales_date"]:
                row["sales_date"] = row["sales_date"].strftime("%Y-%m-%d")

            # Format created_at
            if row["created_at"]:
                row["created_at"] = row["created_at"].strftime("%Y-%m-%d %H:%M")

            # Format TIME fields
            for time_field in ("loading_time", "unloading_time"):
                val = row.get(time_field)
                if val is not None:
                    total_seconds = int(val.total_seconds())
                    h, rem = divmod(total_seconds, 3600)
                    m = rem // 60
                    row[time_field] = f"{h:02d}:{m:02d}"
                else:
                    row[time_field] = ""

            # Dual-unit quantity
            qty_tons = float(row["quantity_tons"])
            qty_brass = ton_to_brass(qty_tons)
            if row["unit"].lower() == "brass":
                row["display_quantity"] = qty_brass
                row["converted_quantity"] = qty_tons
                row["converted_unit"] = "tons"
            else:
                row["display_quantity"] = qty_tons
                row["converted_quantity"] = qty_brass
                row["converted_unit"] = "brass"

            row["quantity_tons"] = qty_tons

        return jsonify(rows)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()
