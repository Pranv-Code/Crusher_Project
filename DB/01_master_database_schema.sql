-- ============================================================
-- MASTER DATABASE SCHEMA - CRUSHER INVENTORY SYSTEM
-- ============================================================
-- Instructions: Select or create your database in MySQL, then
-- execute this file to set up all required tables and defaults.
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. VEHICLE TABLE  
CREATE TABLE IF NOT EXISTS Vehicle (
    vehicle_number VARCHAR(50) PRIMARY KEY,
    owner VARCHAR(100) NOT NULL,
    status ENUM('Active', 'Inactive', 'Pending') DEFAULT 'Pending',
    requested_by INT NULL,
    requested_at TIMESTAMP NULL,
    approved_by INT NULL,
    approved_at TIMESTAMP NULL
);

-- 2. PARTY TABLE 
CREATE TABLE IF NOT EXISTS Party ( 
    party_id INT AUTO_INCREMENT PRIMARY KEY, 
    party_name VARCHAR(150) NOT NULL UNIQUE, 
    gst_no VARCHAR(100) NOT NULL,
    address VARCHAR(150) NOT NULL,
    pan_no VARCHAR(50) NOT NULL,
    status ENUM('Active', 'Inactive', 'Pending') NOT NULL DEFAULT 'Active',
    requested_by INT NULL,
    requested_at TIMESTAMP NULL,
    approved_by INT NULL,
    approved_at TIMESTAMP NULL
);

-- 3. PRODUCT TABLE
CREATE TABLE IF NOT EXISTS Product (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL UNIQUE,
    quantity_tons DECIMAL(12,2) NOT NULL DEFAULT 0,
    status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active'
);

-- 4. VEHICLE ACTIVITY TABLE 
CREATE TABLE IF NOT EXISTS Vehicle_Activity (
    activity_id INT AUTO_INCREMENT PRIMARY KEY,
    activity_date DATE NOT NULL,
    vehicle_number VARCHAR(50) NOT NULL,
    arrival_time TIME NOT NULL,
    loading_start_time TIME NOT NULL,
    unloading_end_time TIME NOT NULL,
    turnaround_time TIME NOT NULL,
    total_weight DECIMAL(10,2) NOT NULL,
    vehicle_weight DECIMAL(10,2) NOT NULL,
    net_weight DECIMAL(10,2) NOT NULL,
    site VARCHAR(150) NOT NULL,

    CONSTRAINT fk_vehicle_activity_vehicle
        FOREIGN KEY (vehicle_number)
        REFERENCES Vehicle(vehicle_number)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- 5. PRODUCTION TABLE 
CREATE TABLE IF NOT EXISTS Production (
    production_id INT AUTO_INCREMENT PRIMARY KEY,
    production_date DATE NOT NULL,
    product_id INT NULL,
    unit ENUM('tons', 'brass') NOT NULL,
    quantity_tons DECIMAL(12,2) NOT NULL,
    production_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    cost_per_unit DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT fk_production_product
        FOREIGN KEY (product_id)
        REFERENCES Product(product_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- 6. SALES TABLE 
CREATE TABLE IF NOT EXISTS Sales (
    sales_id INT AUTO_INCREMENT PRIMARY KEY,
    sales_date DATE NOT NULL,
    party_id INT NOT NULL,
    product_id INT NULL,
    vehicle_number VARCHAR(50) NOT NULL,
    unit ENUM('tons', 'brass') NOT NULL,
    quantity_tons DECIMAL(12,2) NOT NULL,
    site VARCHAR(150) NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    loading_time TIME NULL,
    unloading_time TIME NULL,
    unloading_date DATE NULL,
    unloading_status ENUM('pending', 'completed', 'pending_approval', 'pending_unloading', 'unloaded') NOT NULL DEFAULT 'pending',
    remarks VARCHAR(255),

    CONSTRAINT fk_sales_party
        FOREIGN KEY (party_id)
        REFERENCES Party(party_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_sales_product
        FOREIGN KEY (product_id)
        REFERENCES Product(product_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_sales_vehicle
        FOREIGN KEY (vehicle_number)
        REFERENCES Vehicle(vehicle_number)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    INDEX idx_sales_party_date (party_id, sales_date),
    INDEX idx_sales_status (unloading_status),
    INDEX idx_sales_date (sales_date)
);

-- 7. VEHICLE SALE TABLE
CREATE TABLE IF NOT EXISTS VehicleSale (
    vehicle_sale_id INT AUTO_INCREMENT PRIMARY KEY,
    sales_id INT NOT NULL,
    vehicle_number VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_vs_sales
        FOREIGN KEY (sales_id)
        REFERENCES Sales(sales_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_vs_vehicle
        FOREIGN KEY (vehicle_number)
        REFERENCES Vehicle(vehicle_number)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- 8. USERS TABLE
CREATE TABLE IF NOT EXISTS Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Manager', 'Clerk') NOT NULL DEFAULT 'Clerk',
    status ENUM('Active', 'Inactive', 'Pending') NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP NULL,
    
    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_status (status),
    INDEX idx_role (role)
);

-- DEFAULT USERS SEED (Manager: admin123 | Clerk: clerk123)
INSERT IGNORE INTO Users (user_id, name, email, username, password_hash, role, status) VALUES
(1, 'System Manager', 'manager@crusher.com', 'manager', '$2b$12$xvtxYFDaUjDof.b8767wXekGQorMf5Kzgye77fYIh1KoaQ3x6a/HK', 'Manager', 'Active'),
(2, 'System Clerk', 'clerk@crusher.com', 'clerk', '$2b$12$c22fbaoCoQZBXdRTs3gM6um67/5LyUhjWZWd8fSz65iirt4hhDl.e', 'Clerk', 'Active');

-- 9. ROLES TABLE
CREATE TABLE IF NOT EXISTS Roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO Roles (role_id, role_name, description) VALUES
(1, 'Manager', 'Full system access including approvals and user management'),
(2, 'Clerk', 'Limited access - can create sales, production, request vehicles');

-- 10. PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS Permissions (
    permission_id INT AUTO_INCREMENT PRIMARY KEY,
    permission_key VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    module VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO Permissions (permission_key, description, module) VALUES
('dashboard.view', 'View dashboard', 'dashboard'),
('products.view', 'View products', 'products'),
('products.create', 'Create products', 'products'),
('products.update', 'Update products', 'products'),
('products.delete', 'Delete products', 'products'),
('production.view', 'View production', 'production'),
('production.create', 'Create production', 'production'),
('production.update', 'Update production', 'production'),
('production.delete', 'Delete production', 'production'),
('sales.view', 'View sales', 'sales'),
('sales.create', 'Create sales', 'sales'),
('sales.update', 'Update sales', 'sales'),
('sales.delete', 'Delete sales', 'sales'),
('sales.approve_unloading', 'Approve unloading > 24h', 'sales'),
('vehicles.view', 'View vehicles', 'vehicles'),
('vehicles.create', 'Create vehicles', 'vehicles'),
('vehicles.update', 'Update vehicles', 'vehicles'),
('vehicles.delete', 'Delete vehicles', 'vehicles'),
('vehicles.request', 'Request new vehicle', 'vehicles'),
('vehicles.approve', 'Approve vehicle requests', 'vehicles'),
('parties.view', 'View parties', 'parties'),
('parties.create', 'Create parties', 'parties'),
('parties.update', 'Update parties', 'parties'),
('parties.delete', 'Delete parties', 'parties'),
('reports.view', 'View reports', 'reports'),
('reports.generate', 'Generate reports', 'reports'),
('reports.export', 'Export reports to Excel', 'reports'),
('users.view', 'View users', 'users'),
('users.create', 'Create users', 'users'),
('users.update', 'Update users', 'users'),
('users.delete', 'Delete users', 'users'),
('users.reset_password', 'Reset user passwords', 'users');

-- 11. ROLE_PERMISSIONS MAPPING TABLE
CREATE TABLE IF NOT EXISTS Role_Permissions (
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES Roles(role_id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES Permissions(permission_id) ON DELETE CASCADE
);

INSERT IGNORE INTO Role_Permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM Roles r, Permissions p
WHERE r.role_name = 'Manager';

INSERT IGNORE INTO Role_Permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM Roles r, Permissions p
WHERE r.role_name = 'Clerk'
AND p.permission_key IN (
    'dashboard.view',
    'production.view', 'production.create',
    'sales.view', 'sales.create',
    'vehicles.view', 'vehicles.request',
    'parties.view',
    'reports.view'
);

-- 12. APPROVAL REQUESTS TABLE
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

-- 13. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS Notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
    reference_type VARCHAR(50),
    reference_id INT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    INDEX idx_user_read (user_id, is_read),
    INDEX idx_user_created (user_id, created_at),
    INDEX idx_reference (reference_type, reference_id)
);

-- 14. ACTIVITY LOGS TABLE
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

-- 15. SYSTEM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS System_Settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT NULL,
    FOREIGN KEY (updated_by) REFERENCES Users(user_id) ON DELETE SET NULL
);

INSERT IGNORE INTO System_Settings (setting_key, setting_value) VALUES ('inventory_mode', 'COMMON_POOL');
INSERT IGNORE INTO System_Settings (setting_key, setting_value) VALUES ('common_pool_stock', '0.0');

-- 16. INVENTORY MODE LOGS TABLE
CREATE TABLE IF NOT EXISTS Inventory_Mode_Logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    previous_mode VARCHAR(50) NOT NULL,
    new_mode VARCHAR(50) NOT NULL,
    user_id INT NULL,
    reason TEXT NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE SET NULL
);

-- 17. GOODS RETURNS TABLE
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

SET FOREIGN_KEY_CHECKS = 1;
