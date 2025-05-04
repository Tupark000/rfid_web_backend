require("dotenv").config();
const express = require("express");
const app = express();
const expressWs = require("express-ws")(app);
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");

const PORT = process.env.PORT || 5000;

// MySQL Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect(err => {
  if (err) console.error("MySQL connection error:", err);
  else console.log("Connected to MySQL Database");
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// ===== Routes =====

// Login Route (Main/Admin)
app.post("/login", (req, res) => {
  const { email, password, role } = req.body;
  db.query("SELECT * FROM admins WHERE email = ? AND password = ? AND role = ?", [email, password, role], (err, results) => {
    if (err) return res.status(500).send("Database error");
    if (results.length === 0) return res.status(401).json({ success: false, message: "Invalid credentials" });
    return res.json({ success: true });
  });
});

// Dashboard Stats
app.get("/api/dashboard", (req, res) => {
  db.query("SELECT COUNT(*) AS totalGuests FROM users WHERE DATE(time_in) = CURDATE()", (err1, result1) => {
    db.query("SELECT COUNT(*) AS activeUsers FROM users WHERE status = 'ACTIVE'", (err2, result2) => {
      db.query("SELECT COUNT(*) AS inactiveUsers FROM users WHERE status = 'INACTIVE' AND DATE(time_out) = CURDATE()", (err3, result3) => {
        if (err1 || err2 || err3) return res.status(500).send("Error");
        res.json({
          totalGuests: result1[0].totalGuests,
          activeUsers: result2[0].activeUsers,
          inactiveUsers: result3[0].inactiveUsers,
        });
      });
    });
  });
});

// Get All Users for Dashboard
app.get("/api/users", (req, res) => {
  db.query("SELECT * FROM users ORDER BY id DESC", (err, results) => {
    if (err) return res.status(500).send("Error");
    res.json(results);
  });
});

// Filter Logs by Date
app.get("/api/logs", (req, res) => {
  const date = req.query.date;
  if (!date) return res.status(400).send("Date required");
  db.query("SELECT * FROM users WHERE DATE(time_in) = ?", [date], (err, results) => {
    if (err) return res.status(500).send("Error");
    res.json(results);
  });
});

// Edit User
app.put("/api/users/:id", (req, res) => {
  const id = req.params.id;
  const { name } = req.body;
  db.query("UPDATE users SET name = ? WHERE id = ?", [name, id], err => {
    if (err) return res.status(500).send("Error updating");
    broadcastUpdate();
    res.sendStatus(200);
  });
});

// Delete User
app.delete("/api/users/:id", (req, res) => {
  const id = req.params.id;
  db.query("DELETE FROM users WHERE id = ?", [id], err => {
    if (err) return res.status(500).send("Error deleting");
    broadcastUpdate();
    res.sendStatus(200);
  });
});

// ===== WebSocket for Logs =====
const clients = new Set();
app.ws("/ws/logs", (ws) => {
  clients.add(ws);
  ws.on("close", () => clients.delete(ws));
});

function broadcastUpdate() {
  clients.forEach(ws => {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({ type: "log_update" }));
    }
  });
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
