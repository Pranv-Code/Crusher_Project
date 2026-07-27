import os
import sys
import subprocess
import shutil

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "inventory_frontend")
BACKEND_DIR = os.path.join(PROJECT_ROOT, "inventory_backend")
DIST_DIR = os.path.join(FRONTEND_DIR, "dist")
OUTPUT_PACKAGE_DIR = os.path.join(PROJECT_ROOT, "CrusherServer_Package")
VENV_PYTHON = os.path.join(BACKEND_DIR, "venv", "Scripts", "python.exe")
VENV_PYINSTALLER = os.path.join(BACKEND_DIR, "venv", "Scripts", "pyinstaller.exe")

def run_step(description, command, cwd=None):
    print(f"\n==================================================")
    print(f"  {description}")
    print(f"==================================================")
    result = subprocess.run(command, cwd=cwd, shell=True)
    if result.returncode != 0:
        print(f"[ERROR] Step failed: {description}")
        sys.exit(1)
    print(f"[SUCCESS] {description}")

def main():
    print("Starting Crusher Inventory EXE Packaging Process...")

    # Step 1: Build Frontend static dist
    run_step("Building Frontend Static Production Bundle", "npm run build", cwd=FRONTEND_DIR)

    if not os.path.exists(DIST_DIR):
        print(f"❌ Error: Frontend dist directory does not exist at {DIST_DIR}")
        sys.exit(1)

    # Step 2: Prepare output package directory
    if os.path.exists(OUTPUT_PACKAGE_DIR):
        try:
            shutil.rmtree(OUTPUT_PACKAGE_DIR, ignore_errors=True)
        except Exception:
            pass
    os.makedirs(OUTPUT_PACKAGE_DIR, exist_ok=True)

    # Step 3: Run PyInstaller to generate EXE package
    add_data_dist = f"{DIST_DIR};dist"
    db_dir = os.path.join(PROJECT_ROOT, "DB")
    add_data_db = f"{db_dir};DB"

    hidden_imports = [
        "mysql.connector",
        "mysql.connector.locales.eng.client_error",
        "flask_cors",
        "bcrypt",
        "dotenv",
        "jwt",
        "werkzeug",
        "config",
        "db",
        "run_migration",
        "pystray",
        "PIL",
        "PIL.Image",
        "PIL.ImageDraw",
        "waitress",
    ]

    for root, dirs, files in os.walk(BACKEND_DIR):
        if "venv" in root or "__pycache__" in root:
            continue
        for f in files:
            if f.endswith(".py") and f != "app.py":
                rel_path = os.path.relpath(os.path.join(root, f), BACKEND_DIR)
                mod_name = os.path.splitext(rel_path)[0].replace(os.sep, ".").replace("/", ".")
                if mod_name not in hidden_imports:
                    hidden_imports.append(mod_name)

    pyinstaller_cmd = [
        f'"{VENV_PYINSTALLER}"',
        "--noconfirm",
        "--noconsole",
        "--onedir",
        "--name CrusherServer",
        f'--add-data "{add_data_dist}"',
        f'--add-data "{add_data_db}"',
        f'--add-data "{os.path.join(BACKEND_DIR, "services")};services"',
        f'--add-data "{os.path.join(BACKEND_DIR, "routes")};routes"',
        f'--add-data "{os.path.join(BACKEND_DIR, "middleware")};middleware"',
        f'--add-data "{os.path.join(BACKEND_DIR, "utils")};utils"',
        f'--paths "{BACKEND_DIR}"',
    ]

    for hi in hidden_imports:
        pyinstaller_cmd.extend(["--hidden-import", hi])

    pyinstaller_cmd.extend([
        "--collect-submodules", "services",
        "--collect-submodules", "routes",
        "--collect-submodules", "middleware",
        "--collect-submodules", "utils",
    ])

    pyinstaller_cmd.append(f'"{os.path.join(BACKEND_DIR, "app.py")}"')

    full_cmd = " ".join(pyinstaller_cmd)
    run_step("Packaging Flask Backend + React Frontend into CrusherServer.exe", full_cmd, cwd=PROJECT_ROOT)

    # Step 4: Copy built files from dist/CrusherServer to CrusherServer_Package
    built_dist_path = os.path.join(PROJECT_ROOT, "dist", "CrusherServer")
    if os.path.exists(built_dist_path):
        for item in os.listdir(built_dist_path):
            s = os.path.join(built_dist_path, item)
            d = os.path.join(OUTPUT_PACKAGE_DIR, item)
            if os.path.isdir(s):
                shutil.copytree(s, d)
            else:
                shutil.copy2(s, d)

    # Step 5: Copy .env template file next to CrusherServer.exe
    env_content = """# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=crusher_inventory
DB_PORT=3306

# Server Configuration
PORT=5000
FLASK_DEBUG=False
SECRET_KEY=crusher_secret_key_2026
"""
    env_path = os.path.join(OUTPUT_PACKAGE_DIR, ".env")
    with open(env_path, "w", encoding="utf-8") as f:
        f.write(env_content)

    # Copy SQL database schema setup files
    db_package_dir = os.path.join(OUTPUT_PACKAGE_DIR, "Database_Setup")
    os.makedirs(db_package_dir, exist_ok=True)
    db_source_dir = os.path.join(PROJECT_ROOT, "DB")
    if os.path.exists(db_source_dir):
        for item in os.listdir(db_source_dir):
            s = os.path.join(db_source_dir, item)
            d = os.path.join(db_package_dir, item)
            if os.path.isfile(s):
                shutil.copy2(s, d)

    # Step 6: Create user-friendly setup guide
    readme_content = """========================================================================
            CRUSHER INVENTORY SYSTEM - SERVER SETUP GUIDE
========================================================================

HOW TO RUN THE SERVER ON A COMPUTER:

1. DATABASE SETUP (Required Once on Host PC):
   - Install MySQL Server or XAMPP on this computer.
   - Create a database named: crusher_inventory
   - Import the single master script inside 'Database_Setup':
     -> 01_master_database_schema.sql (creates all tables, roles, and default settings cleanly)

2. CONFIGURE DATABASE DETAILS:
   - Open the '.env' file in this folder using Notepad.
   - Set your DB_USER, DB_PASSWORD, and DB_NAME to match your MySQL database.

3. START THE SERVER:
   - Double-click 'CrusherServer.exe' (inside this folder).
   - The application starts quietly in the Windows System Tray (near the clock).
   - Right-click the Crusher tray icon for options:
     * Open Dashboard
     * Server Status
     * View Logs (opens logs/server.log)
     * Restart Server
     * Exit

4. ACCESS FROM OTHER OFFICE PCS:
   - Make sure all office PCs are connected to the same Wi-Fi / LAN.
   - Open Google Chrome or Microsoft Edge on any office PC.
   - Type the Network URL (e.g., http://192.168.1.100:5000) to access the system!

========================================================================
Default Logins:
- Manager: username 'manager', password 'admin123'
- Clerk:   username 'clerk',   password 'clerk123'
========================================================================
"""
    readme_path = os.path.join(OUTPUT_PACKAGE_DIR, "README_SERVER_SETUP.txt")
    with open(readme_path, "w", encoding="utf-8") as f:
        f.write(readme_content)

    print("\n" + "=" * 60)
    print("[SUCCESS] PACKAGE CREATED SUCCESSFULLY!")
    print(f"Output Location: {OUTPUT_PACKAGE_DIR}")
    print("=" * 60)

if __name__ == "__main__":
    main()
