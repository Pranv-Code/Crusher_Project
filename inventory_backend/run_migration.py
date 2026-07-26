import mysql.connector
import bcrypt
from dotenv import load_dotenv
import os

import sys

def get_sql_file_path(filename):
    """Find absolute path for SQL migration file in dev or bundled package."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(base_dir, "..", "DB", filename),
        os.path.join(base_dir, "DB", filename),
        os.path.join(os.getcwd(), "DB", filename),
        os.path.join(os.getcwd(), "Database_Setup", filename),
        os.path.join(base_dir, "Database_Setup", filename),
    ]
    if hasattr(sys, "_MEIPASS"):
        candidates.insert(0, os.path.join(sys._MEIPASS, "DB", filename))
        candidates.insert(0, os.path.join(sys._MEIPASS, "Database_Setup", filename))
    for p in candidates:
        abs_p = os.path.abspath(p)
        if os.path.exists(abs_p):
            return abs_p
    return filename

load_dotenv(override=True)

def run():
    print("Connecting to MySQL and running migration...")
    conn = mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", "root"),
        database=os.getenv("DB_NAME", "crusher"),
        port=int(os.getenv("DB_PORT", 3306))
    )
    cursor = conn.cursor()
    
    auth_sql_path = get_sql_file_path("migration_auth.sql")
    if os.path.exists(auth_sql_path):
        with open(auth_sql_path, "r", encoding="utf-8") as f:
            sql = f.read()
    else:
        sql = ""
        
    # Split by semicolon for execution
    statements = sql.split(";")
    for stmt in statements:
        stmt = stmt.strip()
        if not stmt:
            continue
        # Strip comments to check actual command prefix
        clean_lines = [l.strip() for l in stmt.splitlines() if l.strip() and not l.strip().startswith("--")]
        clean_stmt = " ".join(clean_lines).strip()
        if clean_stmt.upper().startswith("USE ") or clean_stmt.upper().startswith("ALTER TABLE"):
            continue
        try:
            cursor.execute(stmt)
        except Exception as e:
            err_str = str(e)
            if "already exists" in err_str or "Duplicate" in err_str:
                pass
            else:
                print(f"Statement: {stmt[:50]}... | Error: {e}")
                
    conn.commit()
    print("Base migration SQL execution finished.")
    
    # Safe alters for Sales
    print("Applying indexes to Sales...")
    for idx_name, cols in [("idx_sales_party_date", "(party_id, sales_date)"), ("idx_sales_status", "(unloading_status)"), ("idx_sales_date", "(sales_date)")]:
        try:
            cursor.execute(f"ALTER TABLE Sales ADD INDEX {idx_name} {cols};")
        except Exception as e:
            if "Duplicate key name" not in str(e):
                print(f"Index {idx_name} alter warning: {e}")

    # Safe alters for Vehicle
    print("Applying column extensions to Vehicle...")
    try:
        cursor.execute("ALTER TABLE Vehicle MODIFY COLUMN status ENUM('Active', 'Inactive', 'Pending') DEFAULT 'Pending';")
    except Exception as e:
        print(f"Vehicle status modify warning: {e}")
        
    for col, dtype in [("requested_by", "INT NULL"), ("requested_at", "TIMESTAMP NULL"), ("approved_by", "INT NULL"), ("approved_at", "TIMESTAMP NULL")]:
        try:
            cursor.execute(f"ALTER TABLE Vehicle ADD COLUMN {col} {dtype};")
        except Exception as e:
            if "Duplicate column name" not in str(e):
                print(f"Vehicle column {col} alter warning: {e}")
                
    # Modify Approval_Requests request_type enum
    print("Modifying Approval_Requests.request_type ENUM...")
    try:
        cursor.execute("ALTER TABLE Approval_Requests MODIFY COLUMN request_type ENUM('vehicle', 'sales_unloading', 'user_registration', 'sales_edit', 'sales_delete', 'production_edit', 'production_delete', 'party', 'report_print') NOT NULL;")
    except Exception as e:
        print(f"Approval_Requests modify warning: {e}")

    # Safe alters for Party
    print("Applying column extensions to Party...")
    try:
        cursor.execute("ALTER TABLE Party ADD COLUMN status ENUM('Active', 'Inactive', 'Pending') NOT NULL DEFAULT 'Pending';")
        cursor.execute("UPDATE Party SET status = 'Active' WHERE status = 'Pending';")
    except Exception as e:
        if "Duplicate column name" not in str(e):
            print(f"Party status alter warning: {e}")
            
    for col, dtype in [("requested_by", "INT NULL"), ("requested_at", "TIMESTAMP NULL"), ("approved_by", "INT NULL"), ("approved_at", "TIMESTAMP NULL")]:
        try:
            cursor.execute(f"ALTER TABLE Party ADD COLUMN {col} {dtype};")
        except Exception as e:
            if "Duplicate column name" not in str(e):
                print(f"Party column {col} alter warning: {e}")

    # Make product_id nullable for Production and Sales (Common Pool / Empty DB support)
    try:
        cursor.execute("ALTER TABLE Production MODIFY COLUMN product_id INT NULL;")
    except Exception as e:
        print(f"Production product_id alter warning: {e}")

    try:
        cursor.execute("ALTER TABLE Sales MODIFY COLUMN product_id INT NULL;")
    except Exception as e:
        print(f"Sales product_id alter warning: {e}")

    try:
        cursor.execute("ALTER TABLE Sales MODIFY COLUMN unloading_status ENUM('pending', 'completed', 'pending_approval', 'pending_unloading', 'unloaded') DEFAULT 'pending';")
    except Exception as e:
        print(f"Sales unloading_status alter warning: {e}")

    conn.commit()
    print("Alters successfully applied.")

    print("Running settings migrations...")
    try:
        settings_sql_path = get_sql_file_path("migration_settings.sql")
        if os.path.exists(settings_sql_path):
            with open(settings_sql_path, "r", encoding="utf-8") as f:
                settings_sql = f.read()
        else:
            settings_sql = ""
        for stmt in settings_sql.split(";"):
            stmt = stmt.strip()
            if not stmt or stmt.upper().startswith("USE "):
                continue
            try:
                cursor.execute(stmt)
            except Exception as e:
                if "already exists" not in str(e) and "Duplicate" not in str(e):
                    print(f"Settings migration warning: {e}")
        conn.commit()
        print("Settings migrations applied successfully.")
    except Exception as e:
        print(f"Error running settings migrations: {e}")

    print("Checking and extending Activity_Logs table...")
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS Activity_Logs (
                log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NULL,
                username VARCHAR(100) NULL,
                role VARCHAR(50) NULL,
                user_role VARCHAR(50) NULL,
                action VARCHAR(100) NULL,
                action_type VARCHAR(50) NULL,
                module VARCHAR(50) NULL,
                entity_type VARCHAR(50) NULL,
                entity_id VARCHAR(100) NULL,
                description TEXT NULL,
                details TEXT NULL,
                ip_address VARCHAR(45) NULL,
                user_agent TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE SET NULL,
                INDEX idx_user (user_id),
                INDEX idx_action (action_type),
                INDEX idx_module (module),
                INDEX idx_created (created_at)
            );
        """)
        conn.commit()
        
        # Add missing columns safely if table already existed
        act_cols = [
            ("username", "VARCHAR(100) NULL"),
            ("role", "VARCHAR(50) NULL"),
            ("user_role", "VARCHAR(50) NULL"),
            ("action", "VARCHAR(100) NULL"),
            ("action_type", "VARCHAR(50) NULL"),
            ("module", "VARCHAR(50) NULL"),
            ("entity_type", "VARCHAR(50) NULL"),
            ("entity_id", "VARCHAR(100) NULL"),
            ("description", "TEXT NULL"),
            ("details", "TEXT NULL"),
            ("ip_address", "VARCHAR(45) NULL"),
            ("user_agent", "TEXT NULL")
        ]
        for col, dtype in act_cols:
            try:
                cursor.execute(f"ALTER TABLE Activity_Logs ADD COLUMN {col} {dtype};")
            except Exception as e:
                if "Duplicate column name" not in str(e):
                    pass
        conn.commit()
        print("Activity_Logs schema verified.")
    except Exception as e:
        print(f"Error ensuring Activity_Logs schema: {e}")

    print("Checking and extending Approval_Requests table...")
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS Approval_Requests (
                request_id INT AUTO_INCREMENT PRIMARY KEY,
                requester_id INT NOT NULL,
                request_type ENUM('vehicle', 'sales_unloading', 'user_registration', 'sales_edit', 'sales_delete', 'production_edit', 'production_delete', 'party', 'report_print') NOT NULL,
                reference_id VARCHAR(100) NULL,
                reference_data JSON NULL,
                status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
                remark TEXT NULL,
                reviewed_by INT NULL,
                reviewed_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (requester_id) REFERENCES Users(user_id) ON DELETE CASCADE,
                FOREIGN KEY (reviewed_by) REFERENCES Users(user_id) ON DELETE SET NULL,
                INDEX idx_status (status),
                INDEX idx_requester (requester_id),
                INDEX idx_type (request_type)
            );
        """)
        conn.commit()

        # Safely modify reference_id type to VARCHAR(100)
        try:
            cursor.execute("ALTER TABLE Approval_Requests MODIFY COLUMN reference_id VARCHAR(100) NULL;")
        except Exception as e:
            print(f"Approval_Requests reference_id alter warning: {e}")

        # Safely modify request_type ENUM
        try:
            cursor.execute("ALTER TABLE Approval_Requests MODIFY COLUMN request_type ENUM('vehicle', 'sales_unloading', 'user_registration', 'sales_edit', 'sales_delete', 'production_edit', 'production_delete', 'party', 'report_print') NOT NULL;")
        except Exception as e:
            print(f"Approval_Requests request_type modify warning: {e}")

        # Safely add remark column
        try:
            cursor.execute("ALTER TABLE Approval_Requests ADD COLUMN remark TEXT NULL;")
        except Exception as e:
            if "Duplicate column name" not in str(e):
                pass
        conn.commit()
        print("Approval_Requests schema verified.")
    except Exception as e:
        print(f"Error ensuring Approval_Requests schema: {e}")

    print("Running Goods_Returns migration...")
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS Goods_Returns (
                return_id INT AUTO_INCREMENT PRIMARY KEY,
                return_date DATE NOT NULL,
                sale_id INT NULL,
                party_id INT NOT NULL,
                product_id INT NULL,
                vehicle_number VARCHAR(50) NULL,
                original_quantity_tons DECIMAL(12,4) NULL,
                returned_quantity_tons DECIMAL(12,4) NOT NULL,
                unit VARCHAR(20) DEFAULT 'tons',
                condition_type ENUM('GOOD', 'DAMAGED') NOT NULL DEFAULT 'GOOD',
                reason TEXT NULL,
                created_by INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                FOREIGN KEY (sale_id) REFERENCES Sales(sales_id) ON DELETE SET NULL,
                FOREIGN KEY (party_id) REFERENCES Party(party_id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES Product(product_id) ON DELETE SET NULL,
                FOREIGN KEY (created_by) REFERENCES Users(user_id) ON DELETE SET NULL,
                INDEX idx_return_date (return_date),
                INDEX idx_party_id (party_id),
                INDEX idx_product_id (product_id),
                INDEX idx_sale_id (sale_id),
                INDEX idx_condition (condition_type)
            );
        """)
        conn.commit()
        print("Goods_Returns table checked/created successfully.")
    except Exception as e:
        print(f"Error creating Goods_Returns table: {e}")

    # Hash default passwords
    manager_pw = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode()
    clerk_pw = bcrypt.hashpw(b"clerk123", bcrypt.gensalt()).decode()
    
    try:
        cursor.execute("""
            INSERT IGNORE INTO Users (name, email, username, password_hash, role, status)
            VALUES ('System Manager', 'manager@crusher.com', 'manager', %s, 'Manager', 'Active');
        """, (manager_pw,))
        
        cursor.execute("""
            INSERT IGNORE INTO Users (name, email, username, password_hash, role, status)
            VALUES ('System Clerk', 'clerk@crusher.com', 'clerk', %s, 'Clerk', 'Active');
        """, (clerk_pw,))
        
        conn.commit()
        print("Default users check complete.")
        print("  Manager -> username: 'manager', password: 'admin123'")
        print("  Clerk   -> username: 'clerk', password: 'clerk123'")
    except Exception as e:
        print(f"Error configuring default accounts: {e}")
        
    cursor.close()
    conn.close()

def ensure_database_schema():
    """Helper for app.py startup to silently ensure tables exist."""
    try:
        run()
    except Exception as e:
        print(f"[WARNING] Database schema auto-check encountered an error: {e}")

if __name__ == "__main__":
    run()
