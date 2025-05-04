// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Serve HTML from /public
app.use(express.urlencoded({ extended: true }));

// === ROUTES ===

// Home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Login API (for form submission)
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const query = 'SELECT * FROM admins WHERE email = ? AND password = ?';

  db.query(query, [username, password], (err, result) => {
    if (err) return res.status(500).send('Database error');
    if (result.length > 0) {
      return res.json({ success: true, role: result[0].role });
    } else {
      return res.status(401).send('Invalid credentials');
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
  db.query(query, (err, result) => {
    if (err) return res.status(500).send("Database error");
    res.json(result[0]);
  });
});

// All users for dashboard table
app.get('/api/users', (req, res) => {
  const query = `SELECT * FROM users ORDER BY time_in DESC`;
  db.query(query, (err, result) => {
    if (err) return res.status(500).send("Database error");
    res.json(result);
  });
});

// Present guests (active today)
app.get('/api/present', (req, res) => {
  const query = `
    SELECT * FROM users
    WHERE status = 'ACTIVE'
    AND DATE(time_in) = CURDATE()
    ORDER BY time_in DESC;
  `;
  db.query(query, (err, result) => {
    if (err) return res.status(500).send("Database error");
    res.json(result);
  });
});

// Logs filtered by date (optional)
app.get('/api/logs', (req, res) => {
  const selectedDate = req.query.date;
  let query = `SELECT * FROM users`;
  const params = [];

  if (selectedDate) {
    query += ` WHERE DATE(time_in) = ?`;
    params.push(selectedDate);
  }

  query += ` ORDER BY time_in DESC`;

  db.query(query, params, (err, result) => {
    if (err) return res.status(500).send("Error loading logs");
    res.json(result);
  });
});

// Delete log by ID
app.delete('/api/logs/:id', (req, res) => {
  const { id } = req.params;
  const query = `DELETE FROM users WHERE id = ?`;
  db.query(query, [id], (err) => {
    if (err) return res.status(500).send("Delete failed");
    res.sendStatus(200);
  });
});

// Fallback for unknown routes
app.use((req, res) => {
  res.status(404).send("Not Found");
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
