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
    app.post("/upload", upload.single("file"), (req, res) => {
      try {
        if (!req.file) {
          console.log("No file uploaded");
          return res.status(400).json({ message: "No file uploaded" });
        }

        const filePath = path.join(__dirname, "uploads", req.file.filename);
        const rawData = fs.readFileSync(filePath, "utf8");

        if (!rawData) {
          console.log("Uploaded file is empty");
          return res.status(400).json({ message: "Uploaded file is empty" });
        }

        let transactions;
        try {
          transactions = JSON.parse(rawData);
        } catch (err) {
          console.log("Invalid JSON file:", err);
          return res.status(400).json({ message: "Invalid JSON file" });
        }

        // If the parsed data is not an array, we wrap it into an array
        if (!Array.isArray(transactions)) {
          console.log("Parsed data is not an array, wrapping into array");
          transactions = [transactions]; // Wrap non-array objects into an array
        }

        // Function to strip HTML tags from a string
        // function stripHtml(html) {
        //   return html.replace(/<[^>]*>/g, "");
        // }

        function stripHtmlRecursive(data) {
          if (typeof data === "string") {
            return data.replace(/<[^>]*>/g, "");
          } else if (Array.isArray(data)) {
            return data.map(stripHtmlRecursive);
          } else if (typeof data === "object" && data !== null) {
            return Object.fromEntries(
              Object.entries(data).map(([key, value]) => [
                key,
                stripHtmlRecursive(value),
              ])
            );
          }
          return data;
        }

        // transactions.forEach((transaction) => {
        //   Object.keys(transaction).forEach((key) => {
        //     transaction[key] = stripHtmlRecursive(transaction[key]);
        //     if (key === "select_item" || key === "action") {
        //       delete transaction[key];
        //     }
        //   });
        // });

        transactions = transactions.map(stripHtmlRecursive);

        function flattenObject(obj, parentKey = "", res = {}) {
          for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
              const newKey = parentKey ? `${parentKey}.${key}` : key; // Create a new key in 'parent.child' format
              if (Array.isArray(obj[key])) {
                // If it's an array, iterate over each item and flatten it
                obj[key].forEach((item, index) => {
                  flattenObject(item, `${newKey}.${index}`, res); // Use the array index as part of the key
                });
              } else if (typeof obj[key] === "object" && obj[key] !== null) {
                flattenObject(obj[key], newKey, res); // Recursively flatten for objects
              } else {
                res[newKey] = obj[key]; // Add the key-value pair
              }
            }
          }
          return res;
        }

        // Function to convert JSON to CSV
        // function jsonToCsv(jsonArray) {
        //   const headers = Object.keys(jsonArray[0]).join(","); // Get the headers
        //   const rows = jsonArray.map((obj) =>
        //     Object.values(obj)
        //       .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        //       .join(",")
        //   ); // Ensure each value is quoted and any internal quotes are doubled
        //   return [headers, ...rows].join("\n"); // Join headers and rows
        // }

        function jsonToCsv(jsonArray) {
          const flatJsonArray = jsonArray.map(flattenObject); // Flatten all objects

          const headers = Object.keys(flatJsonArray[0]).join(","); // Get the headers from the flattened objects
          const rows = flatJsonArray.map((obj) =>
            Object.values(obj)
              .map((value) => `"${String(value).replace(/"/g, '""')}"`) // Quote and escape values
              .join(",")
          );
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
    });

    // Endpoint to download the test file
    app.get("/download", (req, res) => {
      const jsonpath = path.join(__dirname, "downloads", "test.json");
      res.download(jsonpath, "test.json");
    });

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  });
