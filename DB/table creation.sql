create database crusher;
use crusher;

-- VEHICLE TABLE  
CREATE TABLE Vehicle( vehicle_number VARCHAR(50) PRIMARY KEY, owner VARCHAR(100) NOT NULL);

-- VEHICLE ACTIVITY TABLE 
CREATE TABLE Vehicle_Activity (
    activity_id INT AUTO_INCREMENT PRIMARY KEY,
    activity_date DATE NOT NULL,
    vehicle_number VARCHAR(50) NOT NULL,
    arrival_time TIME NOT NULL,
    loading_start_time TIME NOT NULL,
    unloading_end_time TIME NOT NULL,
    turnaround_time TIME NOT NULL,
    net_weight DECIMAL(10,2) NOT NULL,
    site VARCHAR(150) NOT NULL,

    CONSTRAINT fk_vehicle_activity_vehicle
        FOREIGN KEY (vehicle_number)
        REFERENCES Vehicle(vehicle_number)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- Product TABLE
CREATE TABLE Product ( product_id INT AUTO_INCREMENT PRIMARY KEY, product_name VARCHAR(100) NOT NULL UNIQUE, quantity_tons DECIMAL(12,2) NOT NULL DEFAULT 0 ,status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active');


-- Production Table 
CREATE TABLE Production ( production_id INT AUTO_INCREMENT PRIMARY KEY, production_date DATE NOT NULL, product_id INT NOT NULL, unit ENUM('tons', 'brass') NOT NULL, quantity_tons DECIMAL(12,2) NOT NULL, production_cost DECIMAL(12,2) NOT NULL DEFAULT 0, CONSTRAINT fk_production_product FOREIGN KEY (product_id) REFERENCES Product(product_id) ON UPDATE CASCADE ON DELETE RESTRICT );

-- Sales Table 
CREATE TABLE Sales (
    sales_id INT AUTO_INCREMENT PRIMARY KEY,
    sales_date DATE NOT NULL,
    party_name VARCHAR(100) NOT NULL,
    product_id INT NOT NULL,
    vehicle_number VARCHAR(50) NOT NULL,
    quantity DECIMAL(12,2) NOT NULL,
    unit ENUM('tons', 'brass') NOT NULL,
    quantity_tons DECIMAL(12,2) NOT NULL,
    site VARCHAR(150) NOT NULL,
    price DECIMAL(12,2) NOT NULL,

    CONSTRAINT fk_sales_product
        FOREIGN KEY (product_id)
        REFERENCES Product(product_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_sales_vehicle
        FOREIGN KEY (vehicle_number)
        REFERENCES Vehicle(vehicle_number)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

<<<<<<< HEAD
=======
-- Party Table 
CREATE TABLE Party ( 
party_id INT AUTO_INCREMENT PRIMARY KEY, 
party_name VARCHAR(150) NOT NULL UNIQUE, 
gst_no VARCHAR(100) NOT NULL DEFAULT 0 ,
address VARCHAR(150) NOT NULL,
pan_no varchar(50) NOT NULL DEfAULT 0);

>>>>>>> 21b50d7 (update product added)
