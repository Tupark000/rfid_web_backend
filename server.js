const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Serves public HTML files

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Main Admin Login Route
app.post('/login', (req, res) => {
  const { email, password, role } = req.body;

  const query = 'SELECT * FROM admins WHERE email = ? AND password = ?';
  db.query(query, [email, password], (err, results) => {
    if (err) return res.send('Database error');

    if (results.length > 0) {
      // Save role in a cookie or session if needed
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










// Test route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});


app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const query = 'SELECT * FROM admins WHERE email = ? AND password = ?';

  db.query(query, [username, password], (err, result) => {
    if (err) {
      console.error('Login error:', err);
      return res.status(500).send('Server error');
    }

    if (result.length > 0) {
      res.json({ success: true, role: result[0].role });
    } else {
      res.status(401).send('Invalid credentials');
    }
  });
});

// Dashboard Summary API
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

// Latest Users API
app.get('/api/users', (req, res) => {
  const query = `SELECT * FROM users ORDER BY time_in DESC`;
  db.query(query, (err, results) => {
    if (err) return res.status(500).send("Database error");
    res.json(results);
  });
});

// Get Present (ACTIVE) Guests
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

// Get daily logs filtered by date (optional)
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


app.delete('/api/logs/:id', (req, res) => {
  const { id } = req.params;
  const query = `DELETE FROM users WHERE id = ?`;

  db.query(query, [id], (err, result) => {
    if (err) return res.status(500).send("Delete failed");
    res.sendStatus(200);
  });
});
