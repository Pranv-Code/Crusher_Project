import json
from flask import request, jsonify
from db import get_connection
from datetime import datetime
from utils.unit_converter import unit_convertor

def clean_time_str(val):
    if val is None or val == "" or str(val).strip() in ("—", "None", "00:00", "00:00:00"):
        return ""
    s = str(val).strip()
    if "day" in s:
        s = s.split(",")[-1].strip()
    parts = s.split(":")
    if len(parts) >= 2:
        try:
            h = int(parts[0])
            m = int(parts[1])
            return f"{h:02d}:{m:02d}"
        except Exception:
            pass
    return s[:5]

def build_change_details(cursor, req):
    req_type = req.get("request_type")
    ref_id = req.get("reference_id")
    ref_data = req.get("reference_data") if isinstance(req.get("reference_data"), dict) else {}
    
    change_details = {
        "type": req_type,
        "title": "",
        "action_badge": "INFO",
        "short_summary": "",
        "fields": []
    }

    try:
        if req_type == "sales_edit":
            cursor.execute("""
                SELECT s.sales_id, s.sales_date, pt.party_name, pt.party_id, p.product_name, p.product_id,
                       s.vehicle_number, s.quantity_tons, s.unit, s.price, s.site, s.remarks, s.loading_time, s.unloading_time
                FROM Sales s
                JOIN Product p ON s.product_id = p.product_id
                JOIN Party pt ON s.party_id = pt.party_id
                WHERE s.sales_id = %s
            """, (ref_id,))
            sale = cursor.fetchone()
            if sale:
                new_party = sale["party_name"]
                if ref_data.get("party_id") and str(ref_data["party_id"]) != str(sale["party_id"]):
                    cursor.execute("SELECT party_name FROM Party WHERE party_id = %s", (ref_data["party_id"],))
                    pt = cursor.fetchone()
                    if pt: new_party = pt["party_name"]

                new_prod = sale["product_name"]
                if ref_data.get("product_id") and str(ref_data["product_id"]) != str(sale["product_id"]):
                    cursor.execute("SELECT product_name FROM Product WHERE product_id = %s", (ref_data["product_id"],))
                    pd = cursor.fetchone()
                    if pd: new_prod = pd["product_name"]

                fields = []

                # Date
                curr_date = str(sale["sales_date"])[:10]
                prop_date = str(ref_data.get("sales_date") or curr_date)[:10]
                fields.append({ "field": "Date", "current": curr_date, "proposed": prop_date, "changed": curr_date != prop_date })

                # Party
                fields.append({ "field": "Party Name", "current": sale["party_name"], "proposed": new_party, "changed": sale["party_name"] != new_party })

                # Product
                fields.append({ "field": "Product", "current": sale["product_name"], "proposed": new_prod, "changed": sale["product_name"] != new_prod })

                # Quantity
                curr_qty_num = float(sale["quantity_tons"])
                prop_qty_val = ref_data.get("quantity_tons") if ref_data.get("quantity_tons") is not None else ref_data.get("quantity")
                prop_qty_num = float(prop_qty_val) if prop_qty_val is not None else curr_qty_num
                curr_unit = sale["unit"]
                prop_unit = ref_data.get("unit", curr_unit)
                qty_changed = (abs(curr_qty_num - prop_qty_num) > 0.001) or (curr_unit != prop_unit)
                fields.append({
                    "field": "Quantity",
                    "current": f"{curr_qty_num:.2f} {curr_unit}",
                    "proposed": f"{prop_qty_num:.2f} {prop_unit}",
                    "changed": qty_changed
                })

                # Price
                curr_price_val = float(sale["price"]) if sale.get("price") is not None else None
                prop_price_val = float(ref_data["price"]) if ref_data.get("price") is not None else curr_price_val
                price_changed = False
                if curr_price_val is not None and prop_price_val is not None:
                    price_changed = abs(curr_price_val - prop_price_val) > 0.01
                elif curr_price_val != prop_price_val:
                    price_changed = True
                curr_price_str = f"₹{curr_price_val:,.2f}" if curr_price_val is not None else "—"
                prop_price_str = f"₹{prop_price_val:,.2f}" if prop_price_val is not None else "—"
                fields.append({ "field": "Price", "current": curr_price_str, "proposed": prop_price_str, "changed": price_changed })

                # Vehicle
                curr_veh = (sale.get("vehicle_number") or "").strip()
                prop_veh = (ref_data.get("vehicle_number") if ref_data.get("vehicle_number") is not None else curr_veh).strip()
                fields.append({ "field": "Vehicle", "current": curr_veh or "—", "proposed": prop_veh or "—", "changed": curr_veh.replace("-", "").replace(" ", "").upper() != prop_veh.replace("-", "").replace(" ", "").upper() })

                # Site
                curr_site = (sale.get("site") or "").strip()
                prop_site = (ref_data.get("site") if ref_data.get("site") is not None else curr_site).strip()
                fields.append({ "field": "Site", "current": curr_site or "—", "proposed": prop_site or "—", "changed": curr_site.lower() != prop_site.lower() })

                # Remarks
                curr_rem = (sale.get("remarks") or sale.get("remark") or "").strip()
                prop_rem = (ref_data.get("remarks") if ref_data.get("remarks") is not None else (ref_data.get("remark") if ref_data.get("remark") is not None else curr_rem)).strip()
                fields.append({ "field": "Remarks", "current": curr_rem or "—", "proposed": prop_rem or "—", "changed": curr_rem != prop_rem })

                # Loading Time (Normalized HH:MM comparison)
                curr_lt = clean_time_str(sale.get("loading_time"))
                prop_lt = clean_time_str(ref_data.get("loading_time")) if ref_data.get("loading_time") is not None else curr_lt
                lt_changed = (curr_lt != prop_lt)
                if curr_lt or prop_lt:
                    fields.append({ "field": "Loading Time", "current": curr_lt or "—", "proposed": prop_lt or "—", "changed": lt_changed })

                # Unloading Time (Normalized HH:MM comparison)
                curr_ut = clean_time_str(sale.get("unloading_time"))
                prop_ut = clean_time_str(ref_data.get("unloading_time")) if ref_data.get("unloading_time") is not None else curr_ut
                ut_changed = (curr_ut != prop_ut)
                if curr_ut or prop_ut:
                    fields.append({ "field": "Unloading Time", "current": curr_ut or "—", "proposed": prop_ut or "—", "changed": ut_changed })

                changed_names = [f["field"] for f in fields if f["changed"]]
                
                change_details["title"] = f"Edit Sale #{ref_id}"
                change_details["action_badge"] = "EDIT"
                change_details["short_summary"] = f"Modify {', '.join(changed_names) if changed_names else 'Sale'} on #{ref_id}"
                change_details["fields"] = fields
            else:
                change_details["title"] = f"Edit Sale #{ref_id}"
                change_details["short_summary"] = f"Edit request for Sale #{ref_id}"

        elif req_type == "production_edit":
            cursor.execute("""
                SELECT p.production_id, p.production_date, pr.product_name, pr.product_id,
                       p.quantity_tons, p.unit, p.production_cost
                FROM Production p
                JOIN Product pr ON p.product_id = pr.product_id
                WHERE p.production_id = %s
            """, (ref_id,))
            prod = cursor.fetchone()
            if prod:
                new_prod = prod["product_name"]
                if ref_data.get("product_id") and str(ref_data["product_id"]) != str(prod["product_id"]):
                    cursor.execute("SELECT product_name FROM Product WHERE product_id = %s", (ref_data["product_id"],))
                    pd = cursor.fetchone()
                    if pd: new_prod = pd["product_name"]

                fields = []
                curr_date = str(prod["production_date"])
                prop_date = str(ref_data.get("production_date") or curr_date)
                fields.append({ "field": "Production Date", "current": curr_date, "proposed": prop_date, "changed": curr_date != prop_date })

                fields.append({ "field": "Product Name", "current": prod["product_name"], "proposed": new_prod, "changed": prod["product_name"] != new_prod })

                curr_qty = f"{float(prod['quantity_tons']):.2f} {prod['unit']}"
                prop_qty_val = ref_data.get("quantity_tons") if ref_data.get("quantity_tons") is not None else ref_data.get("quantity")
                if prop_qty_val is not None:
                    prop_qty = f"{float(prop_qty_val):.2f} {ref_data.get('unit', prod['unit'])}"
                else:
                    prop_qty = curr_qty
                fields.append({ "field": "Quantity", "current": curr_qty, "proposed": prop_qty, "changed": curr_qty != prop_qty })

                curr_cost = f"₹{float(prod['production_cost']):,.2f}" if prod.get("production_cost") is not None else "—"
                prop_cost = f"₹{float(ref_data['production_cost']):,.2f}" if ref_data.get("production_cost") is not None else curr_cost
                fields.append({ "field": "Production Cost", "current": curr_cost, "proposed": prop_cost, "changed": curr_cost != prop_cost })

                changed_names = [f["field"] for f in fields if f["changed"]]
                change_details["title"] = f"Edit Production #{ref_id}"
                change_details["action_badge"] = "EDIT"
                change_details["short_summary"] = f"Modify {', '.join(changed_names) if changed_names else 'Production'} on #{ref_id}"
                change_details["fields"] = fields

        elif req_type == "sales_delete":
            cursor.execute("""
                SELECT s.sales_date, pt.party_name, p.product_name, s.quantity_tons, s.unit, s.price
                FROM Sales s
                JOIN Product p ON s.product_id = p.product_id
                JOIN Party pt ON s.party_id = pt.party_id
                WHERE s.sales_id = %s
            """, (ref_id,))
            sale = cursor.fetchone()
            if sale:
                change_details["title"] = f"Delete Sale #{ref_id}"
                change_details["action_badge"] = "DELETE"
                change_details["short_summary"] = f"Delete Sale #{ref_id} ({sale['party_name']} - {float(sale['quantity_tons']):.2f} {sale['unit']})"
                change_details["fields"] = [
                    { "field": "Party Name", "current": sale["party_name"], "proposed": "DELETED", "changed": True },
                    { "field": "Product", "current": sale["product_name"], "proposed": "DELETED", "changed": True },
                    { "field": "Quantity", "current": f"{float(sale['quantity_tons']):.2f} {sale['unit']}", "proposed": "DELETED", "changed": True },
                    { "field": "Price", "current": f"₹{float(sale['price']):,.2f}" if sale.get("price") else "—", "proposed": "DELETED", "changed": True }
                ]

        elif req_type == "production_delete":
            cursor.execute("""
                SELECT p.production_date, pr.product_name, p.quantity_tons, p.unit
                FROM Production p
                JOIN Product pr ON p.product_id = pr.product_id
                WHERE p.production_id = %s
            """, (ref_id,))
            prod = cursor.fetchone()
            if prod:
                change_details["title"] = f"Delete Production #{ref_id}"
                change_details["action_badge"] = "DELETE"
                change_details["short_summary"] = f"Delete Production #{ref_id} ({prod['product_name']} - {float(prod['quantity_tons']):.2f} {prod['unit']})"
                change_details["fields"] = [
                    { "field": "Product Name", "current": prod["product_name"], "proposed": "DELETED", "changed": True },
                    { "field": "Quantity", "current": f"{float(prod['quantity_tons']):.2f} {prod['unit']}", "proposed": "DELETED", "changed": True }
                ]

        elif req_type == "sales_unloading":
            cursor.execute("""
                SELECT s.sales_date, s.vehicle_number, s.quantity_tons, s.unit, p.product_name, pt.party_name, s.loading_time
                FROM Sales s
                JOIN Product p ON s.product_id = p.product_id
                JOIN Party pt ON s.party_id = pt.party_id
                WHERE s.sales_id = %s
            """, (ref_id,))
            sale = cursor.fetchone()
            if sale:
                loading_str = ""
                if sale["loading_time"] is not None:
                    tot = int(sale["loading_time"].total_seconds())
                    h, r = divmod(tot, 3600)
                    m = r // 60
                    loading_str = f"{h:02d}:{m:02d}"
                prop_date = ref_data.get("unloading_date", "—")
                prop_time = ref_data.get("unloading_time", "—")
                change_details["title"] = f"Unloading Delay - Sale #{ref_id}"
                change_details["action_badge"] = "DELAY"
                change_details["short_summary"] = f"Unloading Delay on Sale #{ref_id} ({sale['vehicle_number']})"
                change_details["fields"] = [
                    { "field": "Party & Product", "current": f"{sale['party_name']} - {sale['product_name']}", "proposed": f"{sale['party_name']} - {sale['product_name']}", "changed": False },
                    { "field": "Vehicle & Qty", "current": f"{sale['vehicle_number']} ({float(sale['quantity_tons']):.2f} {sale['unit']})", "proposed": f"{sale['vehicle_number']} ({float(sale['quantity_tons']):.2f} {sale['unit']})", "changed": False },
                    { "field": "Loaded Time", "current": f"{sale['sales_date']} {loading_str}", "proposed": f"{sale['sales_date']} {loading_str}", "changed": False },
                    { "field": "Unloading Time Request", "current": "Not Recorded", "proposed": f"{prop_date} {prop_time}", "changed": True }
                ]

        elif req_type == "vehicle":
            cursor.execute("SELECT owner, status FROM Vehicle WHERE vehicle_number = %s", (ref_id,))
            veh = cursor.fetchone()
            owner = veh["owner"] if veh else ref_data.get("owner", "—")
            change_details["title"] = f"Add New Vehicle"
            change_details["action_badge"] = "NEW"
            change_details["short_summary"] = f"Add Vehicle: {ref_id} (Owner: {owner})"
            change_details["fields"] = [
                { "field": "Vehicle Number", "current": "New Entity", "proposed": ref_id, "changed": True },
                { "field": "Owner", "current": "New Entity", "proposed": owner, "changed": True }
            ]

        elif req_type == "party":
            cursor.execute("SELECT party_name, gst_no, pan_no, address FROM Party WHERE party_id = %s", (int(ref_id),))
            party = cursor.fetchone()
            pname = party["party_name"] if party else ref_data.get("party_name", "—")
            gst = party["gst_no"] if party else ref_data.get("gst_no", "—")
            change_details["title"] = f"Add New Party"
            change_details["action_badge"] = "NEW"
            change_details["short_summary"] = f"Add Party: {pname}"
            change_details["fields"] = [
                { "field": "Party Name", "current": "New Entity", "proposed": pname, "changed": True },
                { "field": "GSTIN", "current": "New Entity", "proposed": gst or "—", "changed": True }
            ]

        elif req_type == "user_registration":
            cursor.execute("SELECT name, username, email, role FROM Users WHERE user_id = %s", (int(ref_id),))
            usr = cursor.fetchone()
            uname = usr["name"] if usr else ref_data.get("name", "—")
            urole = usr["role"] if usr else ref_data.get("role", "—")
            change_details["title"] = f"New User Registration"
            change_details["action_badge"] = "USER"
            change_details["short_summary"] = f"Register User: {uname} ({urole})"
            change_details["fields"] = [
                { "field": "Name", "current": "New User", "proposed": uname, "changed": True },
                { "field": "Role", "current": "New User", "proposed": urole, "changed": True }
            ]

        elif req_type == "report_print":
            rtype = ref_data.get("report_type", "report").capitalize()
            rfmt = ref_data.get("format", "EXCEL").upper()
            runit = ref_data.get("pdf_unit", "tons").upper()
            rlabel = ref_data.get("label", "")
            change_details["title"] = f"Export {rtype} Report"
            change_details["action_badge"] = "REPORT"
            change_details["short_summary"] = f"Export {rtype} Report ({rfmt}, {runit})"
            change_details["fields"] = [
                { "field": "Report Type", "current": "—", "proposed": f"{rtype} Report", "changed": True },
                { "field": "Export Format", "current": "—", "proposed": rfmt, "changed": True },
                { "field": "Selected Unit", "current": "—", "proposed": runit, "changed": True },
                { "field": "Filter Criteria", "current": "—", "proposed": rlabel, "changed": True }
            ]
    except Exception as e:
        print(f"Error building change details: {e}")

    return change_details

def get_all_approvals():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Fetch all pending approval requests
        cursor.execute("""
            SELECT 
                ar.request_id,
                ar.requester_id,
                u.name AS requester_name,
                ar.request_type,
                ar.reference_id,
                ar.reference_data,
                ar.status,
                ar.created_at
            FROM Approval_Requests ar
            JOIN Users u ON ar.requester_id = u.user_id
            WHERE ar.status = 'pending'
            ORDER BY ar.created_at DESC
        """)
        requests_list = cursor.fetchall()

        # Parse reference_data JSON and join with vehicle/sale info
        for req in requests_list:
            if req.get("created_at"):
                req["created_at"] = str(req["created_at"])
            if req.get("reference_data"):
                if isinstance(req["reference_data"], str):
                    try:
                        req["reference_data"] = json.loads(req["reference_data"])
                    except Exception:
                        pass

            req["change_details"] = build_change_details(cursor, req)
            if req["change_details"].get("short_summary"):
                req["details"] = req["change_details"]["short_summary"]

        return jsonify(requests_list), 200

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


def action_approval(request_id, manager_id):
    data = request.json
    status = data.get("status")  # 'approved' or 'rejected'
    remark = data.get("remark", "").strip()

    if status not in ("approved", "rejected"):
        return jsonify({"message": "Invalid status. Must be approved or rejected"}), 400

    if status == "rejected" and not remark:
        return jsonify({"message": "Remark is compulsory for rejections"}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Fetch the approval request
        cursor.execute("SELECT * FROM Approval_Requests WHERE request_id = %s", (request_id,))
        req = cursor.fetchone()

        if not req:
            return jsonify({"message": "Approval request not found"}), 404

        if req["status"] != "pending":
            return jsonify({"message": "Request already processed"}), 400

        # Update base request
        cursor.execute("""
            UPDATE Approval_Requests
            SET status = %s, remark = %s, reviewed_by = %s, reviewed_at = %s
            WHERE request_id = %s
        """, (status, remark if status == 'rejected' else None, manager_id, datetime.utcnow(), request_id))

        # Perform logic depending on approval type
        if req["request_type"] == "vehicle":
            v_num = req["reference_id"]
            if status == "approved":
                cursor.execute("""
                    UPDATE Vehicle 
                    SET status = 'Active', approved_by = %s, approved_at = %s 
                    WHERE vehicle_number = %s
                """, (manager_id, datetime.utcnow(), v_num))
            else:
                cursor.execute("""
                    DELETE FROM Vehicle 
                    WHERE vehicle_number = %s
                """, (v_num,))
                
        elif req["request_type"] == "party":
            party_id = int(req["reference_id"])
            if status == "approved":
                cursor.execute("""
                    UPDATE Party 
                    SET status = 'Active', approved_by = %s, approved_at = %s 
                    WHERE party_id = %s
                """, (manager_id, datetime.utcnow(), party_id))
            else:
                cursor.execute("""
                    DELETE FROM Party 
                    WHERE party_id = %s
                """, (party_id,))
                
        elif req["request_type"] == "sales_unloading":
            sale_id = req["reference_id"]
            if status == "approved":
                # Extract unloading date & time from reference_data
                ref_data = json.loads(req["reference_data"])
                u_date = ref_data.get("unloading_date")
                u_time = ref_data.get("unloading_time")
                
                cursor.execute("""
                    UPDATE Sales 
                    SET unloading_date = %s, unloading_time = %s, unloading_status = 'completed'
                    WHERE sales_id = %s
                """, (u_date, u_time, sale_id))
            else:
                # If rejected, set unloading_status back to 'pending' so Clerk can retry
                cursor.execute("""
                    UPDATE Sales 
                    SET unloading_status = 'pending', unloading_date = NULL, unloading_time = NULL
                    WHERE sales_id = %s
                """, (sale_id,))

        elif req["request_type"] == "user_registration":
            target_user_id = int(req["reference_id"])
            if status == "approved":
                cursor.execute("""
                    UPDATE Users 
                    SET status = 'Active' 
                    WHERE user_id = %s
                """, (target_user_id,))
            else:
                cursor.execute("""
                    UPDATE Users 
                    SET status = 'Inactive' 
                    WHERE user_id = %s
                """, (target_user_id,))

        elif req["request_type"] == "sales_edit":
            sale_id = int(req["reference_id"])
            if status == "approved":
                ref_data = json.loads(req["reference_data"])
                cursor.execute("SELECT * FROM Sales WHERE sales_id=%s", (sale_id,))
                old_sale = cursor.fetchone()
                if old_sale:
                    # Return old stock
                    from db import get_system_setting, set_system_setting
                    inv_mode = get_system_setting("inventory_mode", "COMMON_POOL", cursor)
                    new_qty = unit_convertor(ref_data["unit"], ref_data["quantity"])
                    if inv_mode == "COMMON_POOL":
                        pool_stock = float(get_system_setting("common_pool_stock", "0.0", cursor))
                        pool_stock = pool_stock + float(old_sale["quantity_tons"]) - float(new_qty)
                        set_system_setting("common_pool_stock", str(pool_stock), user_id=manager_id, cursor=cursor)
                    else:
                        cursor.execute("UPDATE Product SET quantity_tons = quantity_tons + %s WHERE product_id=%s", (old_sale["quantity_tons"], old_sale["product_id"]))
                        # Deduct new stock
                        cursor.execute("UPDATE Product SET quantity_tons = quantity_tons - %s WHERE product_id=%s", (new_qty, ref_data["product_id"]))
                    cursor.execute("""
                        UPDATE Sales SET
                            sales_date=%s, party_id=%s, product_id=%s, vehicle_number=%s,
                            quantity_tons=%s, unit=%s, site=%s, price=%s,
                            loading_time=%s, unloading_time=%s, remarks=%s
                        WHERE sales_id=%s
                    """, (
                        ref_data["sales_date"], ref_data["party_id"], ref_data["product_id"], ref_data["vehicle_number"],
                        new_qty, ref_data["unit"], ref_data["site"], float(ref_data.get("price", 0.0) or 0.0),
                        ref_data.get("loading_time") or None,
                        ref_data.get("unloading_time") or None,
                        ref_data.get("remarks") or None,
                        sale_id,
                    ))
                    cursor.execute("DELETE FROM VehicleSale WHERE sales_id=%s", (sale_id,))
                    cursor.execute("INSERT INTO VehicleSale (sales_id, vehicle_number) VALUES (%s,%s)", (sale_id, ref_data["vehicle_number"]))

        elif req["request_type"] == "sales_delete":
            sale_id = int(req["reference_id"])
            if status == "approved":
                cursor.execute("SELECT * FROM Sales WHERE sales_id=%s", (sale_id,))
                sale = cursor.fetchone()
                if sale:
                    from db import get_system_setting, set_system_setting
                    inv_mode = get_system_setting("inventory_mode", "COMMON_POOL", cursor)
                    if inv_mode == "COMMON_POOL":
                        pool_stock = float(get_system_setting("common_pool_stock", "0.0", cursor))
                        set_system_setting("common_pool_stock", str(pool_stock + float(sale["quantity_tons"])), user_id=manager_id, cursor=cursor)
                    else:
                        cursor.execute("UPDATE Product SET quantity_tons = quantity_tons + %s WHERE product_id=%s", (sale["quantity_tons"], sale["product_id"]))
                    cursor.execute("DELETE FROM VehicleSale WHERE sales_id=%s", (sale_id,))
                    cursor.execute("DELETE FROM Sales WHERE sales_id=%s", (sale_id,))

        elif req["request_type"] == "production_edit":
            prod_id = int(req["reference_id"])
            if status == "approved":
                ref_data = json.loads(req["reference_data"])
                cursor.execute("SELECT * FROM Production WHERE production_id=%s", (prod_id,))
                old = cursor.fetchone()
                if old:
                    from db import get_system_setting, set_system_setting
                    inv_mode = get_system_setting("inventory_mode", "COMMON_POOL", cursor)
                    new_qty = unit_convertor(ref_data["unit"], ref_data["quantity_tons"])
                    if inv_mode == "COMMON_POOL":
                        pool_stock = float(get_system_setting("common_pool_stock", "0.0", cursor))
                        pool_stock = pool_stock - float(old["quantity_tons"]) + float(new_qty)
                        set_system_setting("common_pool_stock", str(pool_stock), user_id=manager_id, cursor=cursor)
                    else:
                        cursor.execute("UPDATE Product SET quantity_tons = quantity_tons - %s WHERE product_id=%s", (old["quantity_tons"], old["product_id"]))
                        cursor.execute("UPDATE Product SET quantity_tons = quantity_tons + %s WHERE product_id=%s", (new_qty, ref_data["product_id"]))
                    cursor.execute("""
                        UPDATE Production
                        SET
                            production_date=%s,
                            product_id=%s,
                            unit=%s,
                            quantity_tons=%s,
                            production_cost=%s
                        WHERE production_id=%s
                    """, (
                        ref_data["production_date"],
                        ref_data["product_id"],
                        ref_data["unit"],
                        new_qty,
                        ref_data["production_cost"],
                        prod_id
                    ))

        elif req["request_type"] == "production_delete":
            prod_id = int(req["reference_id"])
            if status == "approved":
                cursor.execute("SELECT * FROM Production WHERE production_id=%s", (prod_id,))
                prod = cursor.fetchone()
                if prod:
                    from db import get_system_setting, set_system_setting
                    inv_mode = get_system_setting("inventory_mode", "COMMON_POOL", cursor)
                    if inv_mode == "COMMON_POOL":
                        pool_stock = float(get_system_setting("common_pool_stock", "0.0", cursor))
                        set_system_setting("common_pool_stock", str(pool_stock - float(prod["quantity_tons"])), user_id=manager_id, cursor=cursor)
                    else:
                        cursor.execute("UPDATE Product SET quantity_tons = quantity_tons - %s WHERE product_id=%s", (prod["quantity_tons"], prod["product_id"]))
                    cursor.execute("DELETE FROM Production WHERE production_id=%s", (prod_id,))
        elif req["request_type"] == "report_print":
            pass

        conn.commit()
        return jsonify({"message": f"Request has been {status} successfully."}), 200

    except Exception as e:
        conn.rollback()
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


def get_my_pending_approvals(clerk_id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Fetch requests created by this clerk
        cursor.execute("""
            SELECT 
                ar.request_id,
                ar.request_type,
                ar.reference_id,
                ar.reference_data,
                ar.status,
                ar.remark,
                ar.created_at,
                ar.reviewed_at,
                m.name AS manager_name
            FROM Approval_Requests ar
            LEFT JOIN Users m ON ar.reviewed_by = m.user_id
            WHERE ar.requester_id = %s
            ORDER BY ar.created_at DESC
        """, (clerk_id,))
        
        requests_list = cursor.fetchall()
        
        for req in requests_list:
            if req["reference_data"]:
                try:
                    req["reference_data"] = json.loads(req["reference_data"])
                except Exception:
                    pass

            req["change_details"] = build_change_details(cursor, req)
            if req["change_details"].get("short_summary"):
                req["details"] = req["change_details"]["short_summary"]

            # Format date fields
            if req["created_at"]:
                req["created_at"] = req["created_at"].strftime("%Y-%m-%d %H:%M")
            if req["reviewed_at"]:
                req["reviewed_at"] = req["reviewed_at"].strftime("%Y-%m-%d %H:%M")
                
        return jsonify(requests_list), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


def request_report_print(clerk_id):
    data = request.json
    report_type = data.get("report_type")
    fmt = data.get("format")
    filters = data.get("filters", {})
    pdf_unit = data.get("pdf_unit")
    label = data.get("label", f"{report_type.capitalize()} Report ({fmt.upper()})")
    
    reference_data_dict = {
        "report_type": report_type,
        "format": fmt,
        "filters": filters,
        "pdf_unit": pdf_unit,
        "label": label
    }
    
    conn = get_connection()
    cursor = conn.cursor()
    try:
        ref_id = f"{report_type}_{fmt}"
        cursor.execute("""
            INSERT INTO Approval_Requests (requester_id, request_type, reference_id, reference_data, status)
            VALUES (%s, 'report_print', %s, %s, 'pending')
        """, (clerk_id, ref_id, json.dumps(reference_data_dict)))
        conn.commit()
        return jsonify({"message": "Report print request submitted for manager approval."}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
