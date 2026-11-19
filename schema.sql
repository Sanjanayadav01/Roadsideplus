CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT,
  phone VARCHAR(20),
  role VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (role IN ('user','mechanic','admin')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mechanics (
  user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT FALSE,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  services TEXT[] DEFAULT ARRAY['TYRE','BATTERY','FUEL','LOCKOUT','TOW','REPAIR'],
  rating_avg NUMERIC(2,1) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS service_requests (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  mechanic_id INT REFERENCES users(id),
  service_type VARCHAR(20) NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  address TEXT,
  status VARCHAR(12) NOT NULL DEFAULT 'REQUESTED',
  price INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_requests_status ON service_requests(status);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  request_id INT REFERENCES service_requests(id),
  amount INT NOT NULL,
  method VARCHAR(20) DEFAULT 'RAZORPAY',
  status VARCHAR(10) DEFAULT 'PENDING',
  razorpay_order_id VARCHAR(60),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  request_id INT UNIQUE REFERENCES service_requests(id),
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT
);
