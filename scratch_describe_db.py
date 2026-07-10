import mysql.connector
from dotenv import load_dotenv
import os

load_dotenv(dotenv_path="inventory_backend/.env")

conn = mysql.connector.connect(
    host=os.getenv("DB_HOST", "localhost"),
    user=os.getenv("DB_USER", "root"),
    password=os.getenv("DB_PASSWORD", "root"),
    database=os.getenv("DB_NAME", "crusher"),
    port=int(os.getenv("DB_PORT", 3306))
)

cursor = conn.cursor()
cursor.execute("DESCRIBE Vehicle_Activity;")
for row in cursor.fetchall():
    print(row)

cursor.close()
conn.close()
