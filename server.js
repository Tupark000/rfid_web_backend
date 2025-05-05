require("dotenv").config();
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.get('/', (req, res) => {
  res.send('Backend is working!');
});

// Serve HTML files directly
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Login API
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  const query = "SELECT * FROM admins WHERE email = ? AND password = ?";
  db.query(query, [username, password], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: "DB Error" });

    if (results.length > 0) {
      const role = results[0].role === "main" ? "main" : "admin";
      res.json({ success: true, role });
    } else {
      res.json({ success: false, message: "Invalid credentials" });
    }
  });
});

// Fallback for 404s
app.use((req, res) => {
  res.status(404).send("Page not found");
});

// Start server on 0.0.0.0 for Railway
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on 0.0.0.0:${PORT}`);
});
