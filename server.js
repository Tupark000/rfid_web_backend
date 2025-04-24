const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Serves public HTML files

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
  const query = 'SELECT * FROM admins WHERE username = ? AND password = ?';

  db.query(query, [username, password], (err, result) => {
    if (err) {
      console.error('Login error:', err);
      return res.status(500).send('Server error');
    }

    if (result.length > 0) {
      res.json({ success: true, role: result[0].role }); // 'admin' or 'main'
    } else {
      res.status(401).send('Invalid credentials');
    }
  });
});
