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
        return None


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