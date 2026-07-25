CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE devices (
    id BIGSERIAL PRIMARY KEY,
    dev_id VARCHAR(100) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL,
    location VARCHAR(255),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    ip VARCHAR(45),
    detail JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_devices_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE TABLE earthquakes (
    id BIGSERIAL PRIMARY KEY,
    datetime TIMESTAMPTZ NOT NULL,
    location VARCHAR(255),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    magnitude DECIMAL(4,2),
    depth_km DECIMAL(8,2),
    source VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE histories (
    id BIGSERIAL PRIMARY KEY,
    device_id BIGINT NOT NULL,
    datetime TIMESTAMPTZ NOT NULL,
    -- Sensor reading payload (flexible; add/remove keys without schema changes)
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_histories_device
        FOREIGN KEY (device_id)
        REFERENCES devices(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE INDEX idx_devices_user_id
    ON devices(user_id);

CREATE INDEX idx_histories_device_datetime
    ON histories(device_id, datetime DESC);

CREATE INDEX idx_earthquakes_datetime
    ON earthquakes(datetime DESC);
