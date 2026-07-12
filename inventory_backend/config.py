# config.py

import os
from dotenv import load_dotenv

# Load environment variables from .env file (if present)
load_dotenv(override=True)

class Config:
    # Database Configuration
    DB_HOST = os.getenv("DB_HOST")
    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD")
    DB_NAME = os.getenv("DB_NAME")
    DB_PORT = int(os.getenv("DB_PORT", 3306))

    # Flask Configuration
    SECRET_KEY = os.getenv("SECRET_KEY")
    DEBUG = os.getenv("FLASK_DEBUG", "True").lower() == "true"