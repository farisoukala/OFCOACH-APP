import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('ofcoach.db');

// Ancienne table repas (SQLite local) — supprimée si elle existait encore
db.exec('DROP TABLE IF EXISTS meals;');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL,
    avatar TEXT,
    status TEXT
  );

  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    weight REAL,
    height REAL,
    target_weight REAL,
    age INTEGER,
    objectives TEXT,
    medical_risks TEXT,
    last_update TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT,
    receiver_id TEXT,
    content TEXT,
    timestamp TEXT,
    is_read INTEGER DEFAULT 0,
    FOREIGN KEY(sender_id) REFERENCES users(id),
    FOREIGN KEY(receiver_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS workouts (
    id TEXT PRIMARY KEY,
    athlete_id TEXT,
    coach_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    date TEXT,
    status TEXT DEFAULT 'pending',
    FOREIGN KEY(athlete_id) REFERENCES users(id),
    FOREIGN KEY(coach_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY,
    workout_id TEXT,
    name TEXT NOT NULL,
    sets INTEGER,
    reps TEXT,
    weight REAL,
    rest_time TEXT,
    FOREIGN KEY(workout_id) REFERENCES workouts(id)
  );

  CREATE TABLE IF NOT EXISTS nutrition_plans (
    id TEXT PRIMARY KEY,
    athlete_id TEXT,
    coach_id TEXT,
    title TEXT NOT NULL,
    date TEXT,
    calories_target INTEGER,
    protein_target INTEGER,
    carbs_target INTEGER,
    fat_target INTEGER,
    FOREIGN KEY(athlete_id) REFERENCES users(id),
    FOREIGN KEY(coach_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS progress_logs (
    id TEXT PRIMARY KEY,
    athlete_id TEXT,
    date TEXT,
    weight REAL,
    body_fat REAL,
    notes TEXT,
    FOREIGN KEY(athlete_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS calendar_events (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    title TEXT NOT NULL,
    date TEXT,
    time TEXT,
    duration TEXT,
    type TEXT,
    color TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Seed some data if empty
const userCount = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
if (userCount.count === 0) {
  const insertUser = db.prepare('INSERT INTO users (id, name, email, role, avatar, status) VALUES (?, ?, ?, ?, ?, ?)');
  insertUser.run('1', 'Marie Leroi', 'marie@example.com', 'athlete', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop', 'En ligne');
  insertUser.run('2', 'Jean Dupont', 'jean@example.com', 'athlete', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop', 'Actif il y a 2h');
  insertUser.run('3', 'Coach Antoine', 'antoine@ofcoach.com', 'coach', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=150&auto=format&fit=crop', 'En ligne');

  // Seed a workout for Marie
  const workoutId = 'w1';
  db.prepare('INSERT INTO workouts (id, athlete_id, coach_id, title, description, date) VALUES (?, ?, ?, ?, ?, ?)').run(
    workoutId, '1', '3', 'Haut du corps - Élite', `Focus sur l'hypertrophie des pectoraux et du dos.`, '2024-10-12'
  );
  
  const insertExercise = db.prepare('INSERT INTO exercises (id, workout_id, name, sets, reps, weight, rest_time) VALUES (?, ?, ?, ?, ?, ?, ?)');
  insertExercise.run('e1', workoutId, 'Développé Couché', 4, '10', 80, '90s');
  insertExercise.run('e2', workoutId, 'Tractions', 4, 'Max', 0, '60s');
  insertExercise.run('e3', workoutId, 'Développé Militaire', 3, '12', 40, '60s');

  // Seed nutrition for Marie
  const planId = 'n1';
  db.prepare('INSERT INTO nutrition_plans (id, athlete_id, coach_id, title, date, calories_target, protein_target, carbs_target, fat_target) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    planId, '1', '3', 'Plan Sèche - Phase 1', '2024-10-12', 2200, 180, 200, 60
  );

  const insertMeal = db.prepare('INSERT INTO meals (id, plan_id, name, calories, protein, carbs, fat, time, is_completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  insertMeal.run('m1', planId, 'Petit Déjeuner Proteiné', 550, 40, 60, 15, '08:00', 1);
  insertMeal.run('m2', planId, 'Déjeuner Poulet Riz', 700, 50, 80, 20, '13:00', 0);
  insertMeal.run('m3', planId, 'Collation Whey & Amandes', 300, 30, 10, 15, '16:30', 0);
  insertMeal.run('m4', planId, 'Dîner Poisson & Légumes', 650, 60, 50, 10, '20:00', 0);

  // Seed progress for Marie
  const insertProgress = db.prepare('INSERT INTO progress_logs (id, athlete_id, date, weight, body_fat, notes) VALUES (?, ?, ?, ?, ?, ?)');
  insertProgress.run('p1', '1', '2024-10-01', 64.5, 22, 'Début du programme');
  insertProgress.run('p2', '1', '2024-10-08', 63.2, 21.5, 'Bonne progression');
  insertProgress.run('p3', '1', '2024-10-12', 62.5, 21.2, 'Poids stable, meilleure définition');

  // Seed calendar for Coach
  const insertEvent = db.prepare('INSERT INTO calendar_events (id, user_id, title, date, time, duration, type, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  insertEvent.run('ev1', '3', 'Marie Leroi', '2024-10-12', '09:00', '60 min', 'Musculation', 'bg-blue-500');
  insertEvent.run('ev2', '3', 'Jean Dupont', '2024-10-12', '11:30', '45 min', 'Cardio HIIT', 'bg-orange-500');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/clients', (req, res) => {
    const clients = db.prepare('SELECT * FROM users WHERE role = "athlete"').all();
    res.json(clients);
  });

  app.get('/api/workouts/athlete/:id', (req, res) => {
    const workouts = db.prepare('SELECT * FROM workouts WHERE athlete_id = ?').all();
    const workoutsWithExercises = workouts.map(w => {
      const exercises = db.prepare('SELECT * FROM exercises WHERE workout_id = ?').all();
      return { ...w, exercises };
    });
    res.json(workoutsWithExercises);
  });

  app.get('/api/nutrition/athlete/:id', (req, res) => {
    const plan = db.prepare('SELECT * FROM nutrition_plans WHERE athlete_id = ? ORDER BY date DESC LIMIT 1').get(req.params.id);
    res.json(plan || null);
  });

  app.get('/api/progress/athlete/:id', (req, res) => {
    const logs = db.prepare('SELECT * FROM progress_logs WHERE athlete_id = ? ORDER BY date ASC').all();
    res.json(logs);
  });

  app.get('/api/calendar/:userId', (req, res) => {
    const events = db.prepare('SELECT * FROM calendar_events WHERE user_id = ?').all();
    res.json(events);
  });

  app.post('/api/workouts', (req, res) => {
    const { id, athlete_id, coach_id, title, description, date, exercises } = req.body;
    
    const insertWorkout = db.prepare('INSERT INTO workouts (id, athlete_id, coach_id, title, description, date) VALUES (?, ?, ?, ?, ?, ?)');
    insertWorkout.run(id, athlete_id, coach_id, title, description, date);

    if (exercises && exercises.length > 0) {
      const insertExercise = db.prepare('INSERT INTO exercises (id, workout_id, name, sets, reps, weight, rest_time) VALUES (?, ?, ?, ?, ?, ?, ?)');
      exercises.forEach((ex: any) => {
        insertExercise.run(ex.id, id, ex.name, ex.sets, ex.reps, ex.weight, ex.rest_time);
      });
    }

    res.status(201).json({ message: 'Workout created successfully' });
  });

  app.get('/api/clients/:id', (req, res) => {
    const client = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  });

  app.get('/api/messages', (req, res) => {
    const messages = db.prepare('SELECT * FROM messages ORDER BY timestamp DESC').all();
    res.json(messages);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
