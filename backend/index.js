const express = require("express");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
require("dotenv").config(); // Load environment variables
const pool = require("./db"); // Database connection

const app = express();
const port = process.env.LOCAL_PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

const SECRET_KEY = process.env.SECRET_KEY; // Use environment variable

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Login endpoint
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    console.log("Login attempt:", username, password); // Log the login attempt
    try {
      const result = await pool.query('SELECT * FROM public.users WHERE username = $1', [username]);
      const user = result.rows[0];
      if (user) {
        console.log("Stored password hash:", user.password); // Log stored password hash
        const isMatch = await bcrypt.compare(password, user.password);
        console.log("Password match result:", isMatch); // Log password comparison result
        if (isMatch) {
          const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: "1h" });
          res.json({ token });
        } else {
          console.log("Unauthorized: Incorrect username or password"); // Log unauthorized attempts
          res.sendStatus(401);
        }
      } else {
        console.log("Unauthorized: User not found"); // Log user not found
        res.sendStatus(401);
      }
    } catch (err) {
      console.error(err);
      res.sendStatus(500);
    }
  });
  

// Register endpoint
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *",
      [username, hashedPassword]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage });

// Endpoint to upload JSON file
app.post("/upload", authenticateToken, upload.single("file"), (req, res) => {
  const filePath = path.join(__dirname, "uploads", req.file.filename);
  const rawData = fs.readFileSync(filePath);
  const transactions = JSON.parse(rawData);

  // Function to strip HTML tags from a string
  function stripHtml(html) {
    return html.replace(/<[^>]*>/g, "");
  }

  // Clean the data by stripping HTML from the identified fields
  transactions.forEach((transaction) => {
    transaction.select_item = stripHtml(transaction.select_item);
    transaction.id = stripHtml(transaction.id);
    transaction.code = stripHtml(transaction.code);
    transaction.user = stripHtml(transaction.user);
    transaction.membership = stripHtml(transaction.membership);
    transaction.amount_value = stripHtml(transaction.amount_value);
    transaction.payment_method = stripHtml(transaction.payment_method);
    transaction.create_date = stripHtml(transaction.create_date);
    transaction.coupon = stripHtml(transaction.coupon);
    transaction.transaction = stripHtml(transaction.transaction);
    transaction.status = stripHtml(transaction.status);
    transaction.action = stripHtml(transaction.action);
  });

  // Function to convert JSON to CSV
  function jsonToCsv(jsonArray) {
    const headers = Object.keys(jsonArray[0]).join(","); // Get the headers
    const rows = jsonArray.map((obj) =>
      Object.values(obj)
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",")
    ); // Ensure each value is quoted and any internal quotes are doubled
    return [headers, ...rows].join("\n"); // Join headers and rows
  }

  const csvData = jsonToCsv(transactions);

  // Save the CSV data to a file
  const csvPath = path.join(__dirname, "uploads", "cleaned_transactions.csv");
  fs.writeFileSync(csvPath, csvData);

  res.download(csvPath, "cleaned_transactions.csv");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
