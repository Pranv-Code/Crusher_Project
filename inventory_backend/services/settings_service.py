from flask import request, jsonify
from db import get_connection, get_system_setting, set_system_setting

def get_settings():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        mode = get_system_setting("inventory_mode", "COMMON_POOL", cursor)
        pool_stock_str = get_system_setting("common_pool_stock", "0.0", cursor)
        try:
            pool_stock = float(pool_stock_str)
        except (ValueError, TypeError):
            pool_stock = 0.0

        tons_per_brass_str = get_system_setting("tons_per_brass", "4.2", cursor)
        try:
            tons_per_brass = float(tons_per_brass_str)
        except (ValueError, TypeError):
            tons_per_brass = 4.2

        company_name = get_system_setting("company_name", "Vishwajeet Enterprises", cursor)
        company_address = get_system_setting("company_address", "366, Shantisadan House, Ratnagiri, Maharashtra - 415639", cursor)
        company_gstin = get_system_setting("company_gstin", "27AAXFV1394B1ZR", cursor)
        company_state = get_system_setting("company_state", "Maharashtra, Code 27", cursor)
        company_email = get_system_setting("company_email", "vishwajeete54@gmail.com", cursor)
        company_phone = get_system_setting("company_phone", "", cursor)
            
        return jsonify({
            "inventory_mode": mode,
            "common_pool_stock": pool_stock,
            "tons_per_brass": tons_per_brass,
            "company_name": company_name,
            "company_address": company_address,
            "company_gstin": company_gstin,
            "company_state": company_state,
            "company_email": company_email,
            "company_phone": company_phone
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

def update_settings():
    data = request.json or {}
    new_mode = data.get("inventory_mode")
    reason = data.get("reason", "").strip()

    user_id = request.user.get("user_id") if hasattr(request, "user") and request.user else None
    
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Save tons per brass factor if provided
        if "tons_per_brass" in data:
            try:
                tpb = float(data["tons_per_brass"])
                if tpb > 0:
                    set_system_setting("tons_per_brass", str(tpb), user_id, cursor)
            except (ValueError, TypeError):
                pass

        # Save company settings if present
        if "company_name" in data:
            set_system_setting("company_name", data.get("company_name", "").strip() or "Vishwajeet Enterprises", user_id, cursor)
        if "company_address" in data:
            set_system_setting("company_address", data.get("company_address", "").strip(), user_id, cursor)
        if "company_gstin" in data:
            set_system_setting("company_gstin", data.get("company_gstin", "").strip(), user_id, cursor)
        if "company_state" in data:
            set_system_setting("company_state", data.get("company_state", "").strip(), user_id, cursor)
        if "company_email" in data:
            set_system_setting("company_email", data.get("company_email", "").strip(), user_id, cursor)
        if "company_phone" in data:
            set_system_setting("company_phone", data.get("company_phone", "").strip(), user_id, cursor)

        # Inventory mode update logic if inventory_mode provided
        if new_mode:
            if new_mode not in ("COMMON_POOL", "PRODUCT_WISE"):
                return jsonify({"message": "Invalid inventory mode. Must be COMMON_POOL or PRODUCT_WISE"}), 400
                
            if not reason:
                return jsonify({"message": "Reason is required to update inventory mode settings"}), 400

            prev_mode = get_system_setting("inventory_mode", "COMMON_POOL", cursor)
            
            if prev_mode != new_mode:
                cursor.execute("""
                    INSERT INTO Inventory_Mode_Logs (previous_mode, new_mode, user_id, reason)
                    VALUES (%s, %s, %s, %s)
                """, (prev_mode, new_mode, user_id, reason))
                
                if new_mode == "COMMON_POOL" and prev_mode == "PRODUCT_WISE":
                    cursor.execute("SELECT SUM(quantity_tons) AS total FROM Product WHERE status = 'Active'")
                    row = cursor.fetchone()
                    total_stock = float(row["total"] or 0)
                    set_system_setting("common_pool_stock", str(total_stock), user_id, cursor)
                    
                set_system_setting("inventory_mode", new_mode, user_id, cursor)
        
        conn.commit()
        return jsonify({
            "message": "Settings updated successfully",
            "inventory_mode": get_system_setting("inventory_mode", "COMMON_POOL", cursor),
            "tons_per_brass": float(get_system_setting("tons_per_brass", "4.2", cursor))
        }), 200
            
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

def get_settings_logs():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT 
                l.log_id,
                l.previous_mode,
                l.new_mode,
                l.reason,
                l.changed_at,
                u.username,
                u.name AS user_fullname
            FROM Inventory_Mode_Logs l
            LEFT JOIN Users u ON l.user_id = u.user_id
            ORDER BY l.changed_at DESC
        """)
        logs = cursor.fetchall()
        for log in logs:
            if log["changed_at"]:
                log["changed_at"] = log["changed_at"].strftime("%Y-%m-%d %H:%M:%S")
        return jsonify(logs), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
