require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// ==========================
// LOGIN (Role-based)
// ==========================
app.post('/login', (req, res) => {
  const { email, password, role } = req.body;

  const query = 'SELECT * FROM admins WHERE email = ? AND password = ?';
  db.query(query, [email, password], (err, results) => {
    if (err) {
      console.error('Login error:', err);
      return res.status(500).send('Database error');
    }

    if (results.length > 0) {
      if (role === 'main') {
        res.redirect(`/dashboard.html?role=main`);
      } else {
        res.redirect(`/dashboard.html?role=admin`);
      }
    } else {
      res.status(401).send('Invalid email or password');
    }
  });
});

// ==========================
// API: Login via JS Fetch
// ==========================
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const query = 'SELECT * FROM admins WHERE email = ? AND password = ?';

  db.query(query, [username, password], (err, result) => {
    if (err) {
      console.error('Login API error:', err);
      return res.status(500).send('Server error');
    }

    if (result.length > 0) {
      res.json({ success: true, role: result[0].role });
    } else {
      res.status(401).send('Invalid credentials');
    }
  });
});

// ==========================
// API: Dashboard Summary
// ==========================
app.get('/api/dashboard', (req, res) => {
  const query = `
    SELECT 
      COUNT(*) AS totalGuests,
      SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS activeUsers,
      SUM(CASE WHEN status = 'INACTIVE' THEN 1 ELSE 0 END) AS inactiveUsers
    FROM users
    WHERE DATE(time_in) = CURDATE();
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).send("Database error");
    res.json(results[0]);
  });
});

// ==========================
// API: All Users (Latest Activity Table)
// ==========================
app.get('/api/users', (req, res) => {
  const query = `SELECT * FROM users ORDER BY time_in DESC`;
  db.query(query, (err, results) => {
    if (err) return res.status(500).send("Database error");
    res.json(results);
  });
});

// ==========================
// API: Present Guests (ACTIVE)
// ==========================
app.get('/api/present', (req, res) => {
  const query = `
    SELECT * FROM users 
    WHERE status = 'ACTIVE' 
    AND DATE(time_in) = CURDATE()
    ORDER BY time_in DESC;
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).send("Database error");
    res.json(results);
  });
});

// ==========================
// API: Daily Logs
// ==========================
app.get('/api/logs', (req, res) => {
  const selectedDate = req.query.date;
  let query = `SELECT * FROM users`;
  let params = [];

  if (selectedDate) {
    query += ` WHERE DATE(time_in) = ?`;
    params.push(selectedDate);
  }

  query += ` ORDER BY time_in DESC`;

  db.query(query, params, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error loading logs");
    }
    res.json(results);
  });
});

// ==========================
// API: Delete Log by ID
// ==========================
app.delete('/api/logs/:id', (req, res) => {
  const { id } = req.params;
  const query = `DELETE FROM users WHERE id = ?`;

  db.query(query, [id], (err, result) => {
    if (err) return res.status(500).send("Delete failed");
    res.sendStatus(200);
  });
});

// ==========================
// Root Route (index.html)
// ==========================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==========================
// Start Server (IMPORTANT: Listen on 0.0.0.0)
// ==========================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
});
