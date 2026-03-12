-- Supabase SQL Schema for OfCoach
-- users.id en TEXT (compatible avec ta base existante) ; workouts.id en UUID pour exercises.
-- Peut être exécuté même si les tables existent déjà (CREATE IF NOT EXISTS).

-- Users Table (id TEXT pour correspondre à ta base existante)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  avatar TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workouts Table (id UUID pour que exercises.workout_id puisse être UUID)
CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id TEXT REFERENCES users(id),
  coach_id TEXT REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  date TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercises Table
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sets INTEGER,
  reps TEXT,
  weight REAL,
  rest_time TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nutrition Plans Table
CREATE TABLE IF NOT EXISTS nutrition_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id TEXT REFERENCES users(id),
  coach_id TEXT REFERENCES users(id),
  title TEXT NOT NULL,
  date TEXT,
  calories_target INTEGER,
  protein_target INTEGER,
  carbs_target INTEGER,
  fat_target INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meals Table
CREATE TABLE IF NOT EXISTS meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES nutrition_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  calories INTEGER,
  protein INTEGER,
  carbs INTEGER,
  fat INTEGER,
  time TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progress Logs Table
CREATE TABLE IF NOT EXISTS progress_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id TEXT REFERENCES users(id),
  date TEXT,
  weight REAL,
  body_fat REAL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calendar Events Table
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id),
  title TEXT NOT NULL,
  date TEXT,
  time TEXT,
  duration TEXT,
  type TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Realtime pour messages : exécuter après avoir créé la table messages (voir supabase_rls_safe.sql)
-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Row Level Security (RLS) - Basic setup (sera affiné par supabase_rls_safe.sql)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public users are viewable by everyone" ON users;
CREATE POLICY "Public users are viewable by everyone" ON users FOR SELECT USING (true);

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Workouts are viewable by involved parties" ON workouts;
CREATE POLICY "Workouts are viewable by involved parties" ON workouts FOR SELECT USING (true);
