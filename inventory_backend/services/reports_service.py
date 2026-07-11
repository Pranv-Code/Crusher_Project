from flask import jsonify, request
from db import get_connection
from utils.unit_converter import ton_to_brass


def get_party_report(party_id):
    """
    Returns full party details + all sales transactions for that party.
    Used by the Party Report drilldown in the Reports page.
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Party details
        cursor.execute("""
            SELECT party_id, party_name, gst_no, pan_no, address
            FROM Party
            WHERE party_id = %s
        """, (party_id,))

        party = cursor.fetchone()

        if not party:
            return jsonify({"message": "Party not found"}), 404

        # All sales for this party
        cursor.execute("""
            SELECT
                s.sales_id,
                s.sales_date,
                p.product_name,
                s.vehicle_number,
                v.owner          AS vehicle_owner,
                s.quantity_tons,
                s.unit,
                s.site,
                s.price,
                s.loading_time,
                s.unloading_time,
                s.remarks
            FROM Sales s
            JOIN Product p  ON s.product_id  = p.product_id
            LEFT JOIN Vehicle v ON s.vehicle_number = v.vehicle_number
            WHERE s.party_id = %s
            ORDER BY s.sales_date DESC, s.sales_id DESC
        """, (party_id,))

        sales = cursor.fetchall()

        total_tons = 0.0

        for sale in sales:
            if sale["sales_date"]:
                sale["sales_date"] = sale["sales_date"].strftime("%Y-%m-%d")

            for tf in ("loading_time", "unloading_time"):
                val = sale.get(tf)
                if val is not None:
                    total_seconds = int(val.total_seconds())
                    h, rem = divmod(total_seconds, 3600)
                    m = rem // 60
                    sale[tf] = f"{h:02d}:{m:02d}"
                else:
                    sale[tf] = ""

            qty_tons = float(sale["quantity_tons"])
            qty_brass = ton_to_brass(qty_tons)
            total_tons += qty_tons

            if sale["unit"].lower() == "brass":
                sale["display_quantity"] = qty_brass
                sale["converted_quantity"] = qty_tons
                sale["converted_unit"] = "tons"
            else:
                sale["display_quantity"] = qty_tons
                sale["converted_quantity"] = qty_brass
                sale["converted_unit"] = "brass"

            sale["quantity_tons"] = qty_tons

        return jsonify({
            "party": party,
            "sales": sales,
            "summary": {
                "total_entries": len(sales),
                "total_tons": round(total_tons, 3),
            }
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()
