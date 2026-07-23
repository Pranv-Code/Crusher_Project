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
            
        return jsonify({
            "inventory_mode": mode,
            "common_pool_stock": pool_stock
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

def update_settings():
    data = request.json
    new_mode = data.get("inventory_mode")
    reason = data.get("reason", "").strip()
    
    if new_mode not in ("COMMON_POOL", "PRODUCT_WISE"):
        return jsonify({"message": "Invalid inventory mode. Must be COMMON_POOL or PRODUCT_WISE"}), 400
        
    if not reason:
        return jsonify({"message": "Reason is required to update inventory settings"}), 400
        
    user_id = request.user.get("user_id")
    
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        prev_mode = get_system_setting("inventory_mode", "COMMON_POOL", cursor)
        
        # Only log and process if mode has actually changed
        if prev_mode != new_mode:
            # 1. Add log entry
            cursor.execute("""
                INSERT INTO Inventory_Mode_Logs (previous_mode, new_mode, user_id, reason)
                VALUES (%s, %s, %s, %s)
            """, (prev_mode, new_mode, user_id, reason))
            
            # 2. If changing from PRODUCT_WISE to COMMON_POOL, consolidate stock
            if new_mode == "COMMON_POOL" and prev_mode == "PRODUCT_WISE":
                cursor.execute("SELECT SUM(quantity_tons) AS total FROM Product WHERE status = 'Active'")
                row = cursor.fetchone()
                total_stock = float(row["total"] or 0)
                set_system_setting("common_pool_stock", str(total_stock), user_id, cursor)
                
            # 3. Update setting in database
            set_system_setting("inventory_mode", new_mode, user_id, cursor)
            
            conn.commit()
            return jsonify({
                "message": f"Inventory mode successfully changed to {new_mode}",
                "inventory_mode": new_mode
            }), 200
        else:
            return jsonify({
                "message": f"Inventory mode is already {new_mode}",
                "inventory_mode": new_mode
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
