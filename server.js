require("dotenv").config();
const express = require("express");
const expressWs = require("express-ws");
const cors = require("cors");
const bodyParser = require("body-parser");
const mysql = require("mysql2");

const app = express();
expressWs(app); // Enable WebSocket
const PORT = process.env.PORT || 5000;

// MySQL Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "TUPARK",
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// === WebSocket Clients List ===
const clients = new Set();
app.ws("/ws", (ws) => {
  clients.add(ws);
  ws.on("close", () => clients.delete(ws));
});

// === Broadcast Helper ===
function broadcast(data) {
  clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  });
}

// === LOGIN ROUTE ===
app.post("/login", (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password) {
    return res.status(400).send("Missing credentials");
  }

  const query = `SELECT * FROM admins WHERE email = ? AND password = ?`;
  db.query(query, [email, password], (err, results) => {
    if (err) return res.status(500).send("Database error");

    if (results.length > 0) {
      res.json({ success: true, role: role === "main" ? "main" : "admin" });
    } else {
      res.status(401).send("Invalid email or password");
    }
  });
});

// === DASHBOARD SUMMARY ===
app.get("/api/dashboard", (req, res) => {
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

// === FETCH ALL USERS ===
app.get("/api/users", (req, res) => {
  const query = `SELECT * FROM users ORDER BY time_in DESC`;
  db.query(query, (err, results) => {
    if (err) return res.status(500).send("Database error");
    res.json(results);
  });
});

// === FETCH PRESENT USERS (ACTIVE TODAY) ===
app.get("/api/present", (req, res) => {
  const query = `
    SELECT * FROM users
    WHERE status = 'ACTIVE' AND DATE(time_in) = CURDATE()
    ORDER BY time_in DESC;
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).send("Database error");
    res.json(results);
  });
});

// === FETCH DAILY LOGS (FILTERED) ===
app.get("/api/logs", (req, res) => {
  const selectedDate = req.query.date;
  let query = `SELECT * FROM users`;
  let params = [];

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

// === DELETE LOG BY ID ===
app.delete("/api/logs/:id", (req, res) => {
  const { id } = req.params;
  const query = `DELETE FROM users WHERE id = ?`;

  db.query(query, [id], (err, result) => {
    if (err) return res.status(500).send("Delete failed");
    broadcast({ action: "delete", id }); // Notify clients
    res.sendStatus(200);
  });
});

// === EDIT LOG BY ID ===
app.put("/api/logs/:id", (req, res) => {
  const { id } = req.params;
  const { name, plate_number, rfid_uid, time_in, time_out } = req.body;

  const query = `
    UPDATE users 
    SET name = ?, plate_number = ?, rfid_uid = ?, time_in = ?, time_out = ? 
    WHERE id = ?
  `;

  db.query(query, [name, plate_number, rfid_uid, time_in, time_out, id], (err) => {
    if (err) return res.status(500).send("Update failed");
    broadcast({ action: "update", id });
    res.sendStatus(200);
  });
});

// === HOME ===
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// === START SERVER ===
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
