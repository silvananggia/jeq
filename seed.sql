-- Seed data for local development (run after db.sql)

INSERT INTO users (name, address)
VALUES ('Demo User', 'Jakarta, Indonesia')
ON CONFLICT DO NOTHING;

INSERT INTO devices (dev_id, user_id, location, latitude, longitude, ip, detail)
SELECT
  'jeq-00001',
  u.id,
  'Stasiun Sensor Jakarta Pusat',
  -6.1751000,
  106.8272000,
  '100.94.157.101',
  '{"model":"Raspberry Pi 4","sensor":"ADXL355"}'::jsonb
FROM users u
WHERE u.name = 'Demo User'
  AND NOT EXISTS (
    SELECT 1 FROM devices d WHERE d.dev_id = 'jeq-00001'
  );

INSERT INTO devices (dev_id, user_id, location, latitude, longitude, ip, detail)
SELECT
  'jeq-00002',
  u.id,
  'Stasiun Sensor Jakarta Selatan',
  -6.2615000,
  106.8106000,
  '100.107.130.124',
  '{"model":"Raspberry Pi 4","sensor":"ADXL355"}'::jsonb
FROM users u
WHERE u.name = 'Demo User'
  AND NOT EXISTS (
    SELECT 1 FROM devices d WHERE d.dev_id = 'jeq-00002'
  );

-- 5 histories per device (skip if device already has any history)
INSERT INTO histories (device_id, datetime, data)
SELECT
  d.id,
  NOW() - (s.hours || ' hours')::interval,
  jsonb_build_object(
    'mmi', s.mmi,
    'horiz_pga', s.horiz_pga,
    'vert_pga', s.vert_pga,
    'vh_ratio', s.vh_ratio,
    'pgv_cm', s.pgv_cm,
    'max_disp', s.max_disp,
    'drift_idr', s.drift_idr,
    'dom_freq', s.dom_freq
  )
FROM devices d
CROSS JOIN (
  VALUES
    (1, 1.20, 0.00412000, 0.00281000, 0.680000, 0.180000, 0.040000, 0.00041000, 3.200000),
    (3, 1.80, 0.00785000, 0.00512000, 0.650000, 0.290000, 0.070000, 0.00072000, 3.800000),
    (5, 2.40, 0.01456000, 0.00934000, 0.640000, 0.510000, 0.130000, 0.00135000, 4.100000),
    (8, 3.10, 0.02890000, 0.01760000, 0.610000, 0.880000, 0.240000, 0.00248000, 4.600000),
    (12, 2.10, 0.01234567, 0.00876543, 0.710000, 0.450000, 0.120000, 0.00123456, 4.500000)
) AS s(hours, mmi, horiz_pga, vert_pga, vh_ratio, pgv_cm, max_disp, drift_idr, dom_freq)
WHERE d.dev_id IN ('jeq-00001', 'jeq-00002')
  AND NOT EXISTS (
    SELECT 1 FROM histories h WHERE h.device_id = d.id
  );
