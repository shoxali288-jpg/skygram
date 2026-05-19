ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_phone boolean default true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_bio boolean default true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_birth_date boolean default true;
