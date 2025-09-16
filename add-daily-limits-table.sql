-- Add table for storing specific date reservation limits
-- This allows admins to set custom reservation limits for specific dates
-- that override the monthly default settings

CREATE TABLE daily_reservation_limits (
    id SERIAL PRIMARY KEY,
    region_id INTEGER REFERENCES regions(id) NOT NULL,
    date DATE NOT NULL,
    max_reservations INTEGER NOT NULL DEFAULT 0, -- 0 means no reservations allowed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(region_id, date) -- One setting per date per region
);

-- Index for fast lookups by region and date
CREATE INDEX idx_daily_limits_region_date ON daily_reservation_limits(region_id, date);

-- Comment on table
COMMENT ON TABLE daily_reservation_limits IS 'Stores custom reservation limits for specific dates that override monthly settings';
COMMENT ON COLUMN daily_reservation_limits.max_reservations IS 'Number of reservations allowed for this date. 0 = no reservations allowed';