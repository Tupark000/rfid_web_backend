require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// MySQL Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error('❌ Failed to connect to DB:', err);
  } else {
    console.log('✅ Connected to MySQL Database');
  }
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Login route
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const query = 'SELECT * FROM admins WHERE email = ? AND password = ?';

  db.query(query, [username, password], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });

    if (results.length > 0) {
      res.json({ success: true, role: results[0].role });
    } else {
      res.json({ success: false });
    }
  });
});

// Active users route
app.get('/api/active', (req, res) => {
  const query = 'SELECT * FROM users WHERE status = "ACTIVE" ORDER BY time_in DESC';

  db.query(query, (err, results) => {
    if (err) return res.status(500).send('Error loading active users');
    res.json(results);
  });
});

// Logs route
app.get('/api/logs', (req, res) => {
  const query = 'SELECT * FROM users WHERE status = "INACTIVE" ORDER BY time_in DESC';

  db.query(query, (err, results) => {
    if (err) return res.status(500).send('Error loading logs');
    res.json(results);
  });
});

// Delete user by ID
app.delete('/api/logs/:id', (req, res) => {
  const id = req.params.id;
  const query = 'DELETE FROM users WHERE id = ?';

  db.query(query, [id], (err) => {
    if (err) return res.status(500).send('Delete failed');
    res.sendStatus(200);
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on 0.0.0.0:${PORT}`);
});
