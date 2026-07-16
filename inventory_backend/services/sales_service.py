from flask import request, jsonify
from db import get_connection
from utils.unit_converter import unit_convertor, ton_to_brass
from datetime import datetime, timedelta


# ─── Helpers ─────────────────────────────────────────────────────────────────

def capitalize_words(s):
    if not s:
        return ""
    return " ".join(word.capitalize() for word in s.strip().split())


def _format_time(td):
    """Convert a timedelta (MySQL TIME) to HH:MM string."""
    if td is None:
        return ""
    total_seconds = int(td.total_seconds())
    hours, remainder = divmod(total_seconds, 3600)
    minutes = remainder // 60
    return f"{hours:02d}:{minutes:02d}"


def _format_sale(sale):
    """Apply all field transformations to a sale row dict."""
    if sale.get("sales_date"):
        sale["sales_date"] = sale["sales_date"].strftime("%Y-%m-%d")
    if sale.get("unloading_date"):
        sale["unloading_date"] = sale["unloading_date"].strftime("%Y-%m-%d")

    sale["loading_time"]   = _format_time(sale.get("loading_time"))
    sale["unloading_time"] = _format_time(sale.get("unloading_time"))

    qty_tons  = float(sale["quantity_tons"])
    qty_brass = ton_to_brass(qty_tons)

    if sale["unit"].lower() == "brass":
        sale["display_quantity"]  = qty_brass
        sale["converted_quantity"] = qty_tons
        sale["converted_unit"]    = "tons"
    else:
        sale["display_quantity"]  = qty_tons
        sale["converted_quantity"] = qty_brass
        sale["converted_unit"]    = "brass"

    sale["quantity_tons"] = qty_tons
    return sale


# ─── Base SELECT for sales ────────────────────────────────────────────────────

_SALES_SELECT = """
    SELECT
        s.sales_id,
        s.sales_date,
        s.party_id,
        s.product_id,
        pt.party_name,
        p.product_name,
        s.vehicle_number,
        v.owner          AS vehicle_owner,
        s.quantity_tons,
        s.unit,
        s.site,
        s.price,
        s.loading_time,
        s.unloading_time,
        s.unloading_date,
        s.unloading_status,
        s.remarks
    FROM Sales s
    JOIN Product p  ON s.product_id = p.product_id
    JOIN Party  pt  ON s.party_id   = pt.party_id
    LEFT JOIN Vehicle v ON s.vehicle_number = v.vehicle_number
"""


# ─── get_sales  (paginated, last 30 days, completed only) ────────────────────

def get_sales():
    page    = int(request.args.get("page",    1))
    limit   = int(request.args.get("limit",   30))
    search  = request.args.get("search",  "").strip()
    sort_by = request.args.get("sort_by", "sales_date")
    sort_dir = request.args.get("sort_dir", "DESC").upper()
    days    = int(request.args.get("days",    30))

    # Whitelist sort columns to prevent SQL injection
    allowed_sort = {"sales_date", "party_name", "product_name", "vehicle_number", "quantity_tons"}
    if sort_by not in allowed_sort:
        sort_by = "sales_date"
    if sort_dir not in ("ASC", "DESC"):
        sort_dir = "DESC"

    offset = (page - 1) * limit

    conn   = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Build WHERE clause
        conditions = ["s.unloading_status = 'completed'"]
        params     = []

        if days > 0:
            from_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
            conditions.append("s.sales_date >= %s")
            params.append(from_date)
        # days == 0 means all-time, no date filter

        if search:
            conditions.append("(pt.party_name LIKE %s OR p.product_name LIKE %s OR s.vehicle_number LIKE %s OR CAST(s.sales_date AS CHAR) LIKE %s)")
            like = f"%{search}%"
            params.extend([like, like, like, like])

        where_clause = "WHERE " + " AND ".join(conditions)

        # Count
        cursor.execute(f"SELECT COUNT(*) AS cnt FROM Sales s JOIN Product p ON s.product_id=p.product_id JOIN Party pt ON s.party_id=pt.party_id LEFT JOIN Vehicle v ON s.vehicle_number=v.vehicle_number {where_clause}", params)
        total = cursor.fetchone()["cnt"]

        # Data
        query = f"{_SALES_SELECT} {where_clause} ORDER BY s.{sort_by} {sort_dir}, s.sales_id {sort_dir} LIMIT %s OFFSET %s"
        cursor.execute(query, params + [limit, offset])
        sales = cursor.fetchall()

        for sale in sales:
            _format_sale(sale)

        return jsonify({
            "sales":  sales,
            "total":  total,
            "page":   page,
            "pages":  max(1, -(-total // limit)),   # ceil division
            "limit":  limit,
        })

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ─── get_pending_sales ────────────────────────────────────────────────────────

def get_pending_sales():
    """Returns sales with status 'pending' or 'pending_approval', all time."""
    page  = int(request.args.get("page",  1))
    limit = int(request.args.get("limit", 50))
    offset = (page - 1) * limit

    conn   = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(f"SELECT COUNT(*) AS cnt FROM Sales s WHERE s.unloading_status IN ('pending','pending_approval')")
        total = cursor.fetchone()["cnt"]

        query = f"""
            {_SALES_SELECT}
            WHERE s.unloading_status IN ('pending','pending_approval')
            ORDER BY s.sales_date ASC, s.sales_id ASC
            LIMIT %s OFFSET %s
        """
        cursor.execute(query, (limit, offset))
        sales = cursor.fetchall()
        for sale in sales:
            _format_sale(sale)

        return jsonify({
            "sales": sales,
            "total": total,
            "page":  page,
            "pages": max(1, -(-total // limit)),
            "limit": limit,
        })

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ─── complete_unloading ───────────────────────────────────────────────────────

def complete_unloading(id):
    """
    Step 2 of the unloading workflow.
    Accepts: { unloading_date: "YYYY-MM-DD", unloading_time: "HH:MM" }
    If gap > 24h → status = 'pending_approval'
    Else         → status = 'completed'
    """
    from datetime import date as date_type, time as time_type

    data = request.json

    unloading_date_str = data.get("unloading_date", "").strip()
    unloading_time_str = data.get("unloading_time", "").strip()

    if not unloading_date_str or not unloading_time_str:
        return jsonify({"message": "Unloading date and time are required"}), 400

    conn   = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM Sales WHERE sales_id = %s", (id,))
        sale = cursor.fetchone()

        if sale is None:
            return jsonify({"message": "Sale not found"}), 404

        if sale["unloading_status"] == "completed":
            return jsonify({"message": "Already completed"}), 400

        loading_time_td = sale.get("loading_time")   # timedelta from MySQL, or None
        sales_date_raw  = sale.get("sales_date")      # datetime.date from MySQL

        new_status = "completed"
        gap_hours  = None

        # Only run gap check when loading_time was actually recorded
        if loading_time_td is not None and sales_date_raw is not None:

            # Normalise sales_date to a date object (MySQL returns date, but guard anyway)
            if hasattr(sales_date_raw, "date"):
                sale_date = sales_date_raw.date()   # datetime → date
            else:
                sale_date = sales_date_raw           # already a date

            # Build loading datetime:  sale_date at midnight  +  loading timedelta
            loading_dt = datetime(
                sale_date.year,
                sale_date.month,
                sale_date.day,
                0, 0, 0
            ) + loading_time_td

            # Build unloading datetime from user input
            try:
                unloading_dt = datetime.strptime(
                    f"{unloading_date_str} {unloading_time_str}", "%Y-%m-%d %H:%M"
                )
            except ValueError:
                return jsonify({"message": "Invalid date/time format. Expected YYYY-MM-DD and HH:MM"}), 400

            gap_hours = (unloading_dt - loading_dt).total_seconds() / 3600

            print(f"[complete_unloading] sale_id={id} | "
                  f"loading={loading_dt} | unloading={unloading_dt} | gap={gap_hours:.2f}h")

            if gap_hours < 0:
                return jsonify({
                    "message": f"Unloading time ({unloading_dt}) cannot be before loading time ({loading_dt})"
                }), 400

            if gap_hours > 24:
                new_status = "pending_approval"

        if new_status == "pending_approval":
            # Update sales status only, keeping unloading date/time NULL until approved
            cursor.execute("""
                UPDATE Sales
                SET unloading_status = 'pending_approval'
                WHERE sales_id = %s
            """, (id,))
            
            import json
            ref_data = json.dumps({
                "unloading_date": unloading_date_str,
                "unloading_time": unloading_time_str
            })
            cursor.execute("""
                INSERT INTO Approval_Requests (requester_id, request_type, reference_id, reference_data, status)
                VALUES (%s, 'sales_unloading', %s, %s, 'pending')
            """, (request.user["user_id"], id, ref_data))
        else:
            cursor.execute("""
                UPDATE Sales
                SET
                    unloading_time   = %s,
                    unloading_date   = %s,
                    unloading_status = 'completed'
                WHERE sales_id = %s
            """, (
                unloading_time_str,
                unloading_date_str,
                id
            ))

        conn.commit()

        msg = "Unloading completed successfully." if new_status == "completed" \
              else f"Unloading recorded. Gap is {gap_hours:.1f}h — requires manager approval."

        return jsonify({
            "message":    msg,
            "status":     new_status,
            "gap_hours":  round(gap_hours, 2) if gap_hours is not None else None,
        }), 200

    except Exception as e:
        import traceback; traceback.print_exc()
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ─── add_sale ─────────────────────────────────────────────────────────────────

def add_sale():
    data = request.json

    try:
        qty_val = float(data.get("quantity", 0))
        price_val = float(data.get("price", 0.0) or 0.0)
    except (ValueError, TypeError):
        return jsonify({"message": "Quantity and Price must be valid numbers"}), 400

    if qty_val <= 0:
        return jsonify({"message": "Quantity must be greater than zero"}), 400
    if price_val < 0:
        return jsonify({"message": "Price cannot be negative"}), 400

    conn   = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Check Product
        cursor.execute("SELECT product_id, quantity_tons, status FROM Product WHERE product_id=%s", (data["product_id"],))
        product = cursor.fetchone()
        if product is None:
            return jsonify({"message": "Product not found"}), 404
        if product["status"].lower() != "active":
            return jsonify({"message": "Product is Inactive"}), 400

        # Check Vehicle
        cursor.execute("SELECT vehicle_number FROM Vehicle WHERE vehicle_number=%s", (data["vehicle_number"],))
        if cursor.fetchone() is None:
            return jsonify({"message": "Vehicle not found"}), 404

        qty = unit_convertor(data["unit"], data["quantity"])

        # Check Stock
        if float(product["quantity_tons"]) < float(qty):
            return jsonify({"message": "Insufficient Stock"}), 400

        # Check Party
        cursor.execute("SELECT party_name FROM Party WHERE party_id=%s", (data["party_id"],))
        if cursor.fetchone() is None:
            return jsonify({"message": "Party not found"}), 404

        # Insert Sale — unloading fields left NULL, status = 'pending'
        cursor.execute("""
            INSERT INTO Sales (
                sales_date, party_id, product_id, vehicle_number,
                quantity_tons, unit, site, price,
                loading_time, unloading_time, unloading_date, unloading_status,
                remarks
            )
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,NULL,NULL,'pending',%s)
        """, (
            data["sales_date"],
            data["party_id"],
            data["product_id"],
            data["vehicle_number"],
            qty,
            data["unit"],
            capitalize_words(data.get("site", "")),
            float(data.get("price", 0.0) or 0.0),
            data.get("loading_time") or None,
            data.get("remarks")    or None,
        ))

        sales_id = cursor.lastrowid

        # Insert into VehicleSale
        cursor.execute("INSERT INTO VehicleSale (sales_id, vehicle_number) VALUES (%s, %s)", (sales_id, data["vehicle_number"]))

        # Deduct stock
        cursor.execute("UPDATE Product SET quantity_tons = quantity_tons - %s WHERE product_id=%s", (qty, data["product_id"]))

        conn.commit()
        return jsonify({"message": "Sale Added Successfully", "sales_id": sales_id}), 201

    except Exception as e:
        import traceback; traceback.print_exc()
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ─── add_sales_bulk ───────────────────────────────────────────────────────────

def add_sales_bulk():
    """
    Bulk insert: accepts { common: {sales_date, party_id, site}, rows: [...] }
    Each row: { product_id, vehicle_number, quantity, unit, loading_time }
    """
    body   = request.json
    common = body.get("common", {})
    rows   = body.get("rows",   [])

    if not rows:
        return jsonify({"message": "No rows provided"}), 400

    party_id = common.get("party_id")
    sales_date = common.get("sales_date")
    site = capitalize_words(common.get("site", ""))

    if not party_id or not sales_date:
        return jsonify({"message": "Party and Sales Date are required in the common section"}), 400

    conn   = get_connection()
    cursor = conn.cursor(buffered=True, dictionary=True)

    errors  = []
    created = 0

    try:
        # 1. Verify Party once upfront
        cursor.execute("SELECT party_name FROM Party WHERE party_id=%s", (party_id,))
        party = cursor.fetchone()
        if not party:
            return jsonify({"message": "Party not found"}), 404

        # 2. Gather unique product IDs and vehicle numbers
        product_ids = []
        vehicle_numbers = []
        for r in rows:
            pid = r.get("product_id")
            vnum = r.get("vehicle_number")
            if pid:
                try:
                    product_ids.append(int(pid))
                except (ValueError, TypeError):
                    product_ids.append(pid)
            if vnum:
                vehicle_numbers.append(vnum)

        product_ids = list(set(product_ids))
        vehicle_numbers = list(set(vehicle_numbers))

        # 3. Bulk fetch Products
        products_map = {}
        if product_ids:
            format_strings = ','.join(['%s'] * len(product_ids))
            cursor.execute(
                f"SELECT product_id, quantity_tons, status FROM Product WHERE product_id IN ({format_strings})",
                tuple(product_ids)
            )
            for p in cursor.fetchall():
                products_map[p["product_id"]] = p

        # 4. Bulk fetch Vehicles
        vehicles_set = set()
        if vehicle_numbers:
            format_strings = ','.join(['%s'] * len(vehicle_numbers))
            cursor.execute(
                f"SELECT vehicle_number FROM Vehicle WHERE vehicle_number IN ({format_strings})",
                tuple(vehicle_numbers)
            )
            for v in cursor.fetchall():
                vehicles_set.add(v["vehicle_number"])

        # 5. Local stock tracking to handle multiple rows of same product
        local_stock = {pid: float(p["quantity_tons"]) for pid, p in products_map.items()}

        # 6. Loop and Insert
        for idx, row in enumerate(rows):
            row_label = f"Row {idx + 1}"

            product_id     = row.get("product_id")
            vehicle_number = row.get("vehicle_number")
            quantity       = row.get("quantity")
            unit           = row.get("unit", "tons")
            loading_time   = row.get("loading_time") or None
            price          = row.get("price")

            if not all([product_id, vehicle_number, quantity]):
                errors.append(f"{row_label}: Missing required fields")
                continue

            try:
                qty_val = float(quantity)
                price_val = float(price or 0.0)
            except (ValueError, TypeError):
                errors.append(f"{row_label}: Quantity and Price must be valid numbers")
                continue

            if qty_val <= 0:
                errors.append(f"{row_label}: Quantity must be greater than zero")
                continue
            if price_val < 0:
                errors.append(f"{row_label}: Price cannot be negative")
                continue

            price = price_val

            try:
                p_id = int(product_id)
            except (ValueError, TypeError):
                p_id = product_id

            # Validate Product
            product = products_map.get(p_id)
            if not product:
                errors.append(f"{row_label}: Product not found")
                continue
            if product["status"].lower() != "active":
                errors.append(f"{row_label}: Product is Inactive")
                continue

            # Validate Vehicle
            if vehicle_number not in vehicles_set:
                errors.append(f"{row_label}: Vehicle not found")
                continue

            qty = unit_convertor(unit, quantity)

            # Validate Stock
            if local_stock.get(p_id, 0.0) < float(qty):
                errors.append(f"{row_label}: Insufficient Stock for product")
                continue

            # Perform Insertions & Updates
            cursor.execute("""
                INSERT INTO Sales (
                    sales_date, party_id, product_id, vehicle_number,
                    quantity_tons, unit, site, price,
                    loading_time, unloading_time, unloading_date, unloading_status,
                    remarks
                )
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,NULL,NULL,'pending',NULL)
            """, (
                sales_date,
                party_id,
                p_id,
                vehicle_number,
                qty,
                unit,
                site,
                price,
                loading_time,
            ))

            sales_id = cursor.lastrowid
            cursor.execute("INSERT INTO VehicleSale (sales_id, vehicle_number) VALUES (%s, %s)", (sales_id, vehicle_number))
            cursor.execute("UPDATE Product SET quantity_tons = quantity_tons - %s WHERE product_id=%s", (qty, p_id))

            # Update local stock
            local_stock[p_id] -= float(qty)
            created += 1

        conn.commit()

        if errors and created == 0:
            return jsonify({"message": "All rows failed", "errors": errors}), 400

        return jsonify({
            "message": f"{created} sale(s) added successfully.",
            "created": created,
            "errors":  errors,
        }), 201

    except Exception as e:
        import traceback; traceback.print_exc()
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ─── delete_sale ──────────────────────────────────────────────────────────────

def delete_sale(id):
    conn   = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM Sales WHERE sales_id=%s", (id,))
        sale = cursor.fetchone()
        if sale is None:
            return jsonify({"message": "Sale not found"}), 404

        user_role = request.user.get("role")
        user_id   = request.user.get("user_id")

        if user_role == "Clerk":
            cursor.execute("""
                INSERT INTO Approval_Requests (requester_id, request_type, reference_id, reference_data, status)
                VALUES (%s, 'sales_delete', %s, NULL, 'pending')
            """, (user_id, str(id)))
            conn.commit()
            return jsonify({
                "message": "Delete request submitted for Manager approval",
                "status": "pending_approval"
            }), 202

        cursor.execute("UPDATE Product SET quantity_tons = quantity_tons + %s WHERE product_id=%s", (sale["quantity_tons"], sale["product_id"]))
        cursor.execute("DELETE FROM VehicleSale WHERE sales_id=%s", (id,))
        cursor.execute("DELETE FROM Sales WHERE sales_id=%s", (id,))
        conn.commit()
        return jsonify({"message": "Sale Deleted Successfully"})

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ─── update_sale ──────────────────────────────────────────────────────────────

def update_sale(id):
    import json
    data = request.json

    try:
        qty_val = float(data.get("quantity", 0))
        price_val = float(data.get("price", 0.0) or 0.0)
    except (ValueError, TypeError):
        return jsonify({"message": "Quantity and Price must be valid numbers"}), 400

    if qty_val <= 0:
        return jsonify({"message": "Quantity must be greater than zero"}), 400
    if price_val < 0:
        return jsonify({"message": "Price cannot be negative"}), 400

    conn   = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM Sales WHERE sales_id=%s", (id,))
        old_sale = cursor.fetchone()
        if old_sale is None:
            return jsonify({"message": "Sale not found"}), 404

        user_role = request.user.get("role")
        user_id   = request.user.get("user_id")

        if user_role == "Clerk":
            cursor.execute("""
                INSERT INTO Approval_Requests (requester_id, request_type, reference_id, reference_data, status)
                VALUES (%s, 'sales_edit', %s, %s, 'pending')
            """, (user_id, str(id), json.dumps(data)))
            conn.commit()
            return jsonify({
                "message": "Edit request submitted for Manager approval",
                "status": "pending_approval"
            }), 202

        # Return old stock
        cursor.execute("UPDATE Product SET quantity_tons = quantity_tons + %s WHERE product_id=%s", (old_sale["quantity_tons"], old_sale["product_id"]))

        new_qty = unit_convertor(data["unit"], data["quantity"])

        cursor.execute("SELECT quantity_tons, status FROM Product WHERE product_id=%s", (data["product_id"],))
        product = cursor.fetchone()
        if not product:
            conn.rollback(); return jsonify({"message": "Product not found"}), 404
        if product["status"].lower() != "active":
            conn.rollback(); return jsonify({"message": "Product is Inactive"}), 400
        if float(product["quantity_tons"]) < float(new_qty):
            conn.rollback(); return jsonify({"message": "Insufficient Stock"}), 400

        cursor.execute("UPDATE Product SET quantity_tons = quantity_tons - %s WHERE product_id=%s", (new_qty, data["product_id"]))

        cursor.execute("""
            UPDATE Sales SET
                sales_date=%s, party_id=%s, product_id=%s, vehicle_number=%s,
                quantity_tons=%s, unit=%s, site=%s, price=%s,
                loading_time=%s, unloading_time=%s, remarks=%s
            WHERE sales_id=%s
        """, (
            data["sales_date"], data["party_id"], data["product_id"], data["vehicle_number"],
            new_qty, data["unit"], capitalize_words(data["site"]), float(data.get("price", 0.0) or 0.0),
            data.get("loading_time") or None,
            data.get("unloading_time") or None,
            data.get("remarks") or None,
            id,
        ))

        cursor.execute("DELETE FROM VehicleSale WHERE sales_id=%s", (id,))
        cursor.execute("INSERT INTO VehicleSale (sales_id, vehicle_number) VALUES (%s,%s)", (id, data["vehicle_number"]))

        conn.commit()
        return jsonify({"message": "Sale Updated Successfully"})

    except Exception as e:
        import traceback; traceback.print_exc()
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()