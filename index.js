const express = require('express');
const db = require('./db');
const bcrypt = require('bcrypt'); // Used for hashing passwords (security)
const crypto = require('crypto'); // Used for generating random session IDs
const cors = require('cors'); // Allows frontend to talk to backend
const cookieParser = require('cookie-parser'); // Reads cookies from browser

const app = express();
const PORT = 3001;

// --- MIDDLEWARE ---

// 1. Allow JSON data to be sent to backend
app.use(express.json());

// 2. Allow checking cookies
app.use(cookieParser());

// 3. Allow Frontend (localhost:5173) to call this Backend
// credentials: true IS REQUIRED for cookies to work!
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

// --- STEP 7: SIGNUP API ---
// User sends email + password. We hash password and save to DB.
app.post('/signup', (req, res) => {
    const { email, password } = req.body;

    // Simple validation
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    // Check if user already exists
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (user) return res.status(400).json({ error: 'User already exists' });

        // Hash the password (scramble it) so it's safe
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) return res.status(500).json({ error: err.message });

            // Save to Database
            db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, hash], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true, message: 'User created!' });
            });
        });
    });
});

// --- STEP 7 & 8: LOGIN API & SESSION CREATION ---
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // 1. Find user by email
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(400).json({ error: 'User not found' });

        // 2. Check password
        bcrypt.compare(password, user.password, (err, match) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!match) return res.status(400).json({ error: 'Wrong password' });

            // --- STEP 8: CREATE SESSION ---

            // A. Generate a random unique ID (The "Wristband")
            const sessionId = crypto.randomBytes(16).toString('hex');

            // B. Get device info (e.g., "Mozilla/5.0...")
            const device = req.headers['user-agent'] || 'Unknown Device';

            // C. Save "Wristband" to Database (Sessions Table)
            db.run('INSERT INTO sessions (id, user_id, device) VALUES (?, ?, ?)',
                [sessionId, user.id, device],
                function (err) {
                    if (err) return res.status(500).json({ error: err.message });

                    // D. Give "Wristband" to User (Cookie)
                    // HttpOnly = JavaScript cannot read it (Security)
                    res.cookie('session_id', sessionId, {
                        httpOnly: true,
                        sameSite: 'lax',
                        maxAge: 24 * 60 * 60 * 1000 // 24 hours
                    });

                    res.json({ success: true, message: 'Logged in!' });
                }
            );
        });
    });
});

// --- STEP 9: AUTHENTICATION MIDDLEWARE ---
// This function runs before PROTECTED routes.
// It checks: Do you have a valid "Wristband" (Cookie)?
const auth = (req, res, next) => {
    // 1. Get the cookie
    const sessionId = req.cookies.session_id;

    if (!sessionId) {
        return res.status(401).json({ error: 'Not logged in (No Cookie)' });
    }

    // 2. Check if this Session ID exists in Database
    db.get('SELECT * FROM sessions WHERE id = ?', [sessionId], (err, session) => {
        if (err) return res.status(500).json({ error: err.message });

        // If not found in DB, it means session was revoked or expired
        if (!session) {
            return res.status(401).json({ error: 'Invalid or Expired Session' });
        }

        // 3. Attach user_id to the request so next functions know who this is
        req.userId = session.user_id; // "You are User ID 5"

        // 4. Continue to the actual API
        next();
    });
};

// --- STEP 10: TODO APIs ---

// GET /todos - View my todos
app.get('/todos', auth, (req, res) => {
    // Only get todos for THIS logged-in user
    db.all('SELECT * FROM todos WHERE user_id = ?', [req.userId], (err, todos) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(todos);
    });
});

// POST /todos - Add a todo
app.post('/todos', auth, (req, res) => {
    const { task } = req.body;
    if (!task) return res.status(400).json({ error: 'Task required' });

    db.run('INSERT INTO todos (user_id, task) VALUES (?, ?)', [req.userId, task], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        // Return the new ID so frontend can update usage
        res.json({ id: this.lastID, task, completed: 0 });
    });
});

// DELETE /todos/:id - Delete a todo
app.delete('/todos/:id', auth, (req, res) => {
    // IMPORTANT: Ensure user can only delete THEIR OWN todo
    db.run('DELETE FROM todos WHERE id = ? AND user_id = ?',
        [req.params.id, req.userId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// --- STEP 11: LIST ACTIVE SESSIONS ---
// Show all devices logged in to this account
app.get('/sessions', auth, (req, res) => {
    db.all('SELECT * FROM sessions WHERE user_id = ?', [req.userId], (err, sessions) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(sessions);
    });
});

// --- STEP 12: LOGOUT / REVOKE SESSION ---

// Logout (Current Device)
app.post('/logout', auth, (req, res) => {
    const sessionId = req.cookies.session_id;

    // 1. Delete from Database
    db.run('DELETE FROM sessions WHERE id = ?', [sessionId], () => {
        // 2. Clear Cookie
        res.clearCookie('session_id');
        res.json({ success: true });
    });
});

// Revoke Specific Session (Logout another device)
app.post('/sessions/revoke', auth, (req, res) => {
    const { sessionId } = req.body;

    // IMPORTANT: Make sure this session actually belongs to the user!
    // We don't want users logging out OTHER users.
    db.run('DELETE FROM sessions WHERE id = ? AND user_id = ?',
        [sessionId, req.userId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
