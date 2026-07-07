INSERT INTO Product (product_name, quantity_tons) VALUES 
('Stone Dust', 150.00), 
('20 mm Aggregate', 320.50),
 ('10 mm Aggregate', 210.75),
 ('40 mm Aggregate', 95.00), 
 ('M-Sand', 180.25);
 
INSERT INTO Production ( production_date, product_id, unit, quantity_tons, production_cost ) VALUES 
('2026-07-01', 1, 'tons', 50.00, 25000.00),
('2026-07-01', 2, 'tons', 75.50, 38000.00), ('2026-07-02', 3, 'brass', 28.30, 18000.00),
 ('2026-07-02', 4, 'tons', 40.00, 22000.00), ('2026-07-03', 5, 'brass', 35.40, 27000.00), 
 ('2026-07-03', 2, 'tons', 60.00, 31000.00);
 
 INSERT INTO Vehicle (vehicle_number) VALUES 
 ('MH09AB1234'), 
 ('MH09CD5678'), 
 ('MH12EF9012'), ('KA01GH3456'), 
 ('GA03JK7890');
 
 INSERT INTO Vehicle_Activity ( activity_date, vehicle_number, arrival_time, loading_unloading_time, net_weight, site ) VALUES 
 ('2026-07-01', 'MH09AB1234', '08:15:00', '08:45:00', 24.50, 'Crusher Plant'), 
 ('2026-07-01', 'MH09CD5678', '09:30:00', '10:00:00', 22.80, 'Quarry Site A'), 
 ('2026-07-02', 'MH12EF9012', '07:50:00', '08:20:00', 26.10, 'Crusher Plant'), 
 ('2026-07-02', 'KA01GH3456', '11:10:00', '11:40:00', 23.75, 'Stock Yard'), 
 ('2026-07-03', 'GA03JK7890', '10:05:00', '10:35:00', 25.20, 'Quarry Site B'), 
 ('2026-07-03', 'MH09AB1234', '14:00:00', '14:30:00', 24.90, 'Crusher Plant');