import mysql.connector
import bcrypt
from dotenv import load_dotenv
import os

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
    
    with open("DB/migration_auth.sql", "r") as f:
        sql = f.read()
        
    # Split by semicolon for execution
    statements = sql.split(";")
    for stmt in statements:
        stmt = stmt.strip()
        if not stmt:
            continue
        # Skip USE or ALTER queries from the SQL file, we will execute safe alters manually
        if stmt.upper().startswith("USE ") or stmt.upper().startswith("ALTER TABLE"):
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
        cursor.execute("ALTER TABLE Approval_Requests MODIFY COLUMN request_type ENUM('vehicle', 'sales_unloading', 'user_registration', 'sales_edit', 'sales_delete', 'production_edit', 'production_delete') NOT NULL;")
    except Exception as e:
        print(f"Approval_Requests modify warning: {e}")

    conn.commit()
    print("Alters successfully applied.")

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

if __name__ == "__main__":
    run()
