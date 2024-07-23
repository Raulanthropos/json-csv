const express = require("express");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();
const { connectDB, client } = require("./db"); // Import the connectDB function and client

const app = express();
const port = process.env.LOCAL_PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

const SECRET_KEY = process.env.SECRET_KEY; // Use environment variable

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  console.log("Authorization header received:", authHeader); // Log header
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      console.error("Token verification failed:", err);
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
}

// Connect to MongoDB before starting the server
connectDB()
  .then(() => {
    // Define your routes and handlers here

    // Registration endpoint
    app.post("/register", async (req, res) => {
      const { username, password } = req.body;
      const usersCollection = client.db("json_to_csv_app").collection("users");

      // Check if the user already exists
      const existingUser = await usersCollection.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Insert the new user
      await usersCollection.insertOne({ username, password });
      res.status(201).json({ message: "User registered successfully" });
    });

    // Login endpoint
    app.post("/login", async (req, res) => {
      const { username, password } = req.body;
      const usersCollection = client.db("json_to_csv_app").collection("users");

      const user = await usersCollection.findOne({ username, password });

      if (user) {
        const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: "1h" });
        res.json({ token });
      } else {
        res.sendStatus(401);
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
    app.post(
      "/upload",
      authenticateToken,
      upload.single("file"),
      (req, res) => {
        try {
          if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
          }

          const filePath = path.join(__dirname, "uploads", req.file.filename);
          const rawData = fs.readFileSync(filePath);
          const transactions = JSON.parse(rawData);

          // Function to strip HTML tags from a string
          function stripHtml(html) {
            return html.replace(/<[^>]*>/g, "");
          }

          // Clean the data by stripping HTML from the identified fields and removing `select_item`
          transactions.forEach((transaction) => {
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
            // transaction.action = stripHtml(transaction.action);
            delete transaction.select_item;
            delete transaction.action;
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
          const csvPath = path.join(
            __dirname,
            "uploads",
            "cleaned_transactions.csv"
          );
          fs.writeFileSync(csvPath, csvData);

          res.download(csvPath, "cleaned_transactions.csv");
        } catch (err) {
          console.error("Error processing file:", err);
          res.status(500).json({ message: "Internal Server Error" });
        }
      }
    );

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  });
