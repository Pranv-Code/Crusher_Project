# config.py

import os
from dotenv import load_dotenv

# Load environment variables from .env file (if present)
load_dotenv()

class Config:
    # Database Configuration
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "root")
    DB_NAME = os.getenv("DB_NAME", "crusher")
    DB_PORT = int(os.getenv("DB_PORT", 3306))

    # Flask Configuration
    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
    DEBUG = os.getenv("FLASK_DEBUG", "True").lower() == "true"