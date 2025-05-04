require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Serve index.html on root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Main login (form-based POST with redirect)
app.post('/login', (req, res) => {
  const { email, password, role } = req.body;
  const query = 'SELECT * FROM admins WHERE email = ? AND password = ?';

  db.query(query, [email, password], (err, results) => {
    if (err) return res.status(500).send('Database error');
    if (results.length > 0) {
      if (role === 'main') {
        res.redirect(`/dashboard.html?role=main`);
      } else {
        res.redirect(`/dashboard.html?role=admin`);
      }
    } else {
      res.send('Invalid email or password');
    }
  });
});

// API-based login for JavaScript fetch
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const query = 'SELECT * FROM admins WHERE email = ? AND password = ?';

  db.query(query, [username, password], (err, results) => {
    if (err) return res.status(500).send('Server error');
    if (results.length > 0) {
      res.json({ success: true, role: results[0].role });
    } else {
      res.status(401).send('Invalid credentials');
    }
  });
});

// Dashboard summary
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

// All users (latest first)
app.get('/api/users', (req, res) => {
  const query = `SELECT * FROM users ORDER BY time_in DESC`;
  db.query(query, (err, results) => {
    if (err) return res.status(500).send("Database error");
    res.json(results);
  });
});

// Present ACTIVE guests for today
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

// Daily logs with optional ?date= filter
app.get('/api/logs', (req, res) => {
  const selectedDate = req.query.date;
  let query = `SELECT * FROM users`;
  const params = [];

  if (selectedDate) {
    query += ` WHERE DATE(time_in) = ?`;
    params.push(selectedDate);
  }

  query += ` ORDER BY time_in DESC`;

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).send("Error loading logs");
    res.json(results);
  });
});

// Delete user log by ID
app.delete('/api/logs/:id', (req, res) => {
  const { id } = req.params;
  const query = `DELETE FROM users WHERE id = ?`;

  db.query(query, [id], (err) => {
    if (err) return res.status(500).send("Delete failed");
    res.sendStatus(200);
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on 0.0.0.0:${PORT}`);
});

