import json
from flask import request, jsonify
from db import get_connection
from datetime import datetime
from utils.unit_converter import unit_convertor

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
            if req["reference_data"]:
                try:
                    req["reference_data"] = json.loads(req["reference_data"])
                except Exception:
                    pass
            
            # Fetch additional context depending on type
            if req["request_type"] == "vehicle":
                cursor.execute("SELECT owner, status FROM Vehicle WHERE vehicle_number = %s", (req["reference_id"],))
                vehicle = cursor.fetchone()
                if vehicle:
                    req["details"] = f"Vehicle Number: {req['reference_id']}, Owner: {vehicle['owner']}"
            elif req["request_type"] == "user_registration":
                cursor.execute("SELECT name, username, email, role FROM Users WHERE user_id = %s", (int(req["reference_id"]),))
                usr = cursor.fetchone()
                if usr:
                    req["details"] = f"Name: {usr['name']} | Username: {usr['username']} | Email: {usr['email']} | Role: {usr['role']}"
                else:
                    req["details"] = f"New user registration request (ID: {req['reference_id']})"
            elif req["request_type"] == "sales_edit":
                cursor.execute("""
                    SELECT s.sales_date, pt.party_name, p.product_name, s.vehicle_number, s.quantity_tons, s.unit
                    FROM Sales s
                    JOIN Product p ON s.product_id = p.product_id
                    JOIN Party pt ON s.party_id = pt.party_id
                    WHERE s.sales_id = %s
                """, (req["reference_id"],))
                sale = cursor.fetchone()
                if sale:
                    ref_data = req["reference_data"] if isinstance(req["reference_data"], dict) else {}
                    new_party = ""
                    if ref_data.get("party_id"):
                        cursor.execute("SELECT party_name FROM Party WHERE party_id = %s", (ref_data["party_id"],))
                        pt = cursor.fetchone()
                        if pt: new_party = pt["party_name"]
                    new_prod = ""
                    if ref_data.get("product_id"):
                        cursor.execute("SELECT product_name FROM Product WHERE product_id = %s", (ref_data["product_id"],))
                        pd = cursor.fetchone()
                        if pd: new_prod = pd["product_name"]
                    
                    req["details"] = (
                        f"Edit Sale ID: {req['reference_id']} | "
                        f"Current: {sale['party_name']}, {sale['product_name']}, {float(sale['quantity_tons']):.2f} {sale['unit']} | "
                        f"Proposed: {new_party or 'Same'}, {new_prod or 'Same'}, {ref_data.get('quantity', 'Same')} {ref_data.get('unit', '')}"
                    )
                else:
                    req["details"] = f"Proposed edits on Sale ID: {req['reference_id']}"
            elif req["request_type"] == "sales_delete":
                cursor.execute("""
                    SELECT s.sales_date, pt.party_name, p.product_name, s.quantity_tons, s.unit
                    FROM Sales s
                    JOIN Product p ON s.product_id = p.product_id
                    JOIN Party pt ON s.party_id = pt.party_id
                    WHERE s.sales_id = %s
                """, (req["reference_id"],))
                sale = cursor.fetchone()
                if sale:
                    req["details"] = f"Delete Sale ID: {req['reference_id']} | Party: {sale['party_name']} | Product: {sale['product_name']} | Qty: {float(sale['quantity_tons']):.2f} {sale['unit']}"
                else:
                    req["details"] = f"Delete Sale ID: {req['reference_id']} (Already deleted)"
            elif req["request_type"] == "production_edit":
                cursor.execute("""
                    SELECT p.production_date, pr.product_name, p.quantity_tons, p.unit, p.production_cost
                    FROM Production p
                    JOIN Product pr ON p.product_id = pr.product_id
                    WHERE p.production_id = %s
                """, (req["reference_id"],))
                prod = cursor.fetchone()
                if prod:
                    ref_data = req["reference_data"] if isinstance(req["reference_data"], dict) else {}
                    new_prod = ""
                    if ref_data.get("product_id"):
                        cursor.execute("SELECT product_name FROM Product WHERE product_id = %s", (ref_data["product_id"],))
                        pd = cursor.fetchone()
                        if pd: new_prod = pd["product_name"]
                    
                    req["details"] = (
                        f"Edit Production ID: {req['reference_id']} | "
                        f"Current: {prod['product_name']}, {float(prod['quantity_tons']):.2f} {prod['unit']}, Cost: {prod['production_cost']} | "
                        f"Proposed: {new_prod or 'Same'}, {ref_data.get('quantity_tons', 'Same')} {ref_data.get('unit', '')}, Cost: {ref_data.get('production_cost', 'Same')}"
                    )
                else:
                    req["details"] = f"Proposed edits on Production ID: {req['reference_id']}"
            elif req["request_type"] == "production_delete":
                cursor.execute("""
                    SELECT p.production_date, pr.product_name, p.quantity_tons, p.unit
                    FROM Production p
                    JOIN Product pr ON p.product_id = pr.product_id
                    WHERE p.production_id = %s
                """, (req["reference_id"],))
                prod = cursor.fetchone()
                if prod:
                    req["details"] = f"Delete Production ID: {req['reference_id']} | Product: {prod['product_name']} | Qty: {float(prod['quantity_tons']):.2f} {prod['unit']}"
                else:
                    req["details"] = f"Delete Production ID: {req['reference_id']} (Already deleted)"
            elif req["request_type"] == "sales_unloading":
                cursor.execute("""
                    SELECT 
                        s.sales_date, s.vehicle_number, s.quantity_tons, s.unit,
                        p.product_name, pt.party_name, s.loading_time
                    FROM Sales s
                    JOIN Product p ON s.product_id = p.product_id
                    JOIN Party pt ON s.party_id = pt.party_id
                    WHERE s.sales_id = %s
                """, (req["reference_id"],))
                sale = cursor.fetchone()
                if sale:
                    # format loading time
                    loading_str = ""
                    if sale["loading_time"] is not None:
                        tot = int(sale["loading_time"].total_seconds())
                        h, r = divmod(tot, 3600)
                        m = r // 60
                        loading_str = f"{h:02d}:{m:02d}"
                        
                    prop_date = req["reference_data"].get("unloading_date", "") if isinstance(req["reference_data"], dict) else ""
                    prop_time = req["reference_data"].get("unloading_time", "") if isinstance(req["reference_data"], dict) else ""
                    
                    req["details"] = (
                        f"Sale ID: {req['reference_id']} | Party: {sale['party_name']} | "
                        f"Product: {sale['product_name']} | Vehicle: {sale['vehicle_number']} | "
                        f"Qty: {float(sale['quantity_tons']):.2f} {sale['unit']} | "
                        f"Loaded: {sale['sales_date'].strftime('%Y-%m-%d')} {loading_str} | "
                        f"Proposed Unloading: {prop_date} {prop_time}"
                    )

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
                    UPDATE Vehicle 
                    SET status = 'Inactive' 
                    WHERE vehicle_number = %s
                """, (v_num,))
                
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
                    cursor.execute("UPDATE Product SET quantity_tons = quantity_tons + %s WHERE product_id=%s", (old_sale["quantity_tons"], old_sale["product_id"]))
                    new_qty = unit_convertor(ref_data["unit"], ref_data["quantity"])
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
                    cursor.execute("UPDATE Product SET quantity_tons = quantity_tons - %s WHERE product_id=%s", (old["quantity_tons"], old["product_id"]))
                    new_qty = unit_convertor(ref_data["unit"], ref_data["quantity_tons"])
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
                    cursor.execute("UPDATE Product SET quantity_tons = quantity_tons - %s WHERE product_id=%s", (prod["quantity_tons"], prod["product_id"]))
                    cursor.execute("DELETE FROM Production WHERE production_id=%s", (prod_id,))

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
