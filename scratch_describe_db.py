import mysql.connector
from dotenv import load_dotenv
import os

load_dotenv(dotenv_path="inventory_backend/.env", override=True)

conn = mysql.connector.connect(
    host=os.getenv("DB_HOST", "localhost"),
    user=os.getenv("DB_USER", "root"),
    password=os.getenv("DB_PASSWORD", "root"),
    database=os.getenv("DB_NAME", "crusher"),
    port=int(os.getenv("DB_PORT", 3306))
)

cursor = conn.cursor(dictionary=True)
cursor.execute("SELECT sales_id, sales_date, loading_time, unloading_date, unloading_time, unloading_status FROM Sales;")
for row in cursor.fetchall():
    print(row)

cursor.close()
conn.close()
