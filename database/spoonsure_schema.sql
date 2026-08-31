-- SpoonSure Profile + Safety Logs (PostgreSQL)
-- Intended for Supabase Postgres. RLS is explicitly disabled.

CREATE TABLE IF NOT EXISTS spoonsure_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    diet TEXT,
    allergies TEXT[] DEFAULT '{}'::text[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS safety_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    inventory_item_id UUID,
    item_name TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('consumed', 'disposed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE spoonsure_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE safety_log DISABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_spoonsure_profiles_updated_at ON spoonsure_profiles;
CREATE TRIGGER update_spoonsure_profiles_updated_at BEFORE UPDATE ON spoonsure_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_safety_log_user_id_created_at ON safety_log(user_id, created_at DESC);
