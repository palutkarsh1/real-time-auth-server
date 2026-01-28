const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 1. Setup the path where the database file will be saved
// __dirname means "the directory where this script is running"
const dbPath = path.resolve(__dirname, 'database.sqlite');

// 2. Connect to the SQLite database
// If the file doesn't exist, it will be created automatically.
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// 3. Create Tables
// We use db.serialize to run commands one by one safely.
db.serialize(() => {

  // TABLE 1: USERS
  // Stores the people who can log in.
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,  -- Unique ID for each user (1, 2, 3...)
      email TEXT UNIQUE,                     -- User's email (Must be unique!)
      password TEXT                          -- Hashed password (never store plain text!)
    )
  `);

  // TABLE 2: SESSIONS
  // Stores the "wristbands" (active logins) for users.
  // One user can have multiple sessions (phone, laptop, etc.)
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,                   -- Long random string (Session ID / Wristband)
      user_id INTEGER,                       -- Which user owns this session?
      device TEXT,                           -- Browser info (e.g., "Chrome on Windows")
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- When did they login?
      FOREIGN KEY(user_id) REFERENCES users(id)      -- Link to the users table
    )
  `);

  // TABLE 3: TODOS
  // Stores the tasks.
  db.run(`
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,  -- Unique ID for each todo
      user_id INTEGER,                       -- Which user owns this todo?
      task TEXT,                             -- The actual todo text (e.g., "Buy milk")
      completed BOOLEAN DEFAULT 0,           -- Is it done? (0 = No, 1 = Yes)
      FOREIGN KEY(user_id) REFERENCES users(id) -- Link to the users table
    )
  `);

});

// Export the database connection so other files can use it
module.exports = db;
