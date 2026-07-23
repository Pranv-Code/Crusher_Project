# db.py

import mysql.connector
from mysql.connector import Error
from config import Config


def get_connection():
    """
    Creates and returns a new MySQL database connection.
    """
    try:
        connection = mysql.connector.connect(
            host=Config.DB_HOST,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=Config.DB_NAME,
            port=Config.DB_PORT,
            connection_timeout=10,       # fail fast if DB is unreachable
            autocommit=False,            # explicit commit/rollback required
        )

        if connection.is_connected():
            return connection

    except Error as e:
        print(f"Database Connection Error: {e}")
        raise RuntimeError("Database connection failed. Please ensure the database server is running and accessible.") from e


def get_cursor(dictionary=True):
    """
    Returns a database connection and cursor.

    Usage:
        conn, cursor = get_cursor()
    """
    conn = get_connection()

    if conn is None:
        return None, None

    cursor = conn.cursor(dictionary=dictionary)
    return conn, cursor


def commit_transaction(conn):
    """
    Commit the current transaction.
    """
    try:
        if conn:
            conn.commit()
    except Error as e:
        print(f"Commit Error: {e}")
        conn.rollback()
        raise


def rollback_transaction(conn):
    """
    Rollback the current transaction.
    """
    try:
        if conn:
            conn.rollback()
    except Error as e:
        print(f"Rollback Error: {e}")


def close_connection(conn, cursor=None):
    """
    Safely closes cursor and connection.
    """
    try:
        if cursor:
            cursor.close()

        if conn and conn.is_connected():
            conn.close()

    except Error as e:
        print(f"Closing Connection Error: {e}")


def get_system_setting(key, default=None, cursor=None):
    """
    Retrieves a system setting by key. If a cursor is passed, it uses it, 
    otherwise it opens a temporary connection.
    """
    should_close = False
    conn = None
    if cursor is None:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        should_close = True
    
    try:
        cursor.execute("SELECT setting_value FROM System_Settings WHERE setting_key = %s", (key,))
        row = cursor.fetchone()
        if row:
            return row["setting_value"]
        return default
    except Exception as e:
        print(f"Error reading system setting {key}: {e}")
        return default
    finally:
        if should_close:
            cursor.close()
            conn.close()


def set_system_setting(key, value, user_id=None, cursor=None):
    """
    Sets or updates a system setting. If a cursor is passed, it uses it, 
    otherwise it opens a temporary connection and commits.
    """
    should_close = False
    conn = None
    if cursor is None:
        conn = get_connection()
        cursor = conn.cursor()
        should_close = True
    
    try:
        # Check if exists
        cursor.execute("SELECT setting_key FROM System_Settings WHERE setting_key = %s", (key,))
        exists = cursor.fetchone()
        if exists:
            cursor.execute("""
                UPDATE System_Settings 
                SET setting_value = %s, updated_by = %s, updated_at = CURRENT_TIMESTAMP
                WHERE setting_key = %s
            """, (str(value), user_id, key))
        else:
            cursor.execute("""
                INSERT INTO System_Settings (setting_key, setting_value, updated_by)
                VALUES (%s, %s, %s)
            """, (key, str(value), user_id))
        
        if should_close and conn:
            conn.commit()
    except Exception as e:
        print(f"Error setting system setting {key}: {e}")
        if should_close and conn:
            conn.rollback()
        raise e
    finally:
        if should_close:
            cursor.close()
            conn.close()