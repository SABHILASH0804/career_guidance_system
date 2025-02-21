const express = require("express");
const multer = require("multer");
const path = require("path");
const bcrypt = require("bcrypt");
const session = require("express-session");
const mysql = require("./db");
const extractSkills = require("./resumeParser");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: "secret_key",
    resave: false,
    saveUninitialized: true
}));

app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Multer Configuration for File Uploads
const upload = multer({ dest: "uploads/" });

// Home Page - Login & Signup
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "index.html"));
});

// User Signup
app.post("/signup", async (req, res) => {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    mysql.query("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", 
        [name, email, hashedPassword], 
        (err, result) => {
            if (err) {
                console.error("Signup Error:", err);
                return res.status(500).send("User already exists or an error occurred.");
            }
            res.redirect("/");
        }
    );
});

// User Login
app.post("/login", (req, res) => {
    const { email, password } = req.body;

    mysql.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
        if (err || results.length === 0) {
            return res.status(401).send("Invalid credentials");
        }

        const user = results[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).send("Invalid credentials");

        req.session.userId = user.id;
        res.redirect("/dashboard");
    });
});

// Dashboard - Display User Skills
app.get("/dashboard", (req, res) => {
    if (!req.session.userId) return res.redirect("/");

    mysql.query("SELECT skills FROM users WHERE id = ?", [req.session.userId], (err, results) => {
        if (err) {
            console.error("Error fetching user skills:", err);
            return res.status(500).send("Error retrieving skills.");
        }
        
        const userSkills = results[0]?.skills || "No skills found";
        res.render("dashboard", { skills: userSkills });
    });
});

// Upload & Parse Resume
app.post("/upload", upload.single("resume"), async (req, res) => {
    if (!req.session.userId) return res.status(401).send("Login required");

    const filePath = req.file.path;
    
    try {
        const skills = await extractSkills(filePath) || "No skills found";
        console.log("Extracted Skills:", skills);

        // Store resume in `resumes` table
        mysql.query("INSERT INTO resumes (user_id, file_path, skills) VALUES (?, ?, ?)", 
            [req.session.userId, filePath, skills], 
            (err, result) => {
                if (err) {
                    console.error("Database Insert Error:", err);
                    return res.status(500).send("Error saving resume.");
                }
            }
        );

        // Update user's skill set
        mysql.query("UPDATE users SET skills = ? WHERE id = ?", 
            [skills, req.session.userId], 
            (err, result) => {
                if (err) {
                    console.error("Database Update Error:", err);
                    return res.status(500).send("Error updating skills.");
                }
                res.redirect("/dashboard");
            }
        );

    } catch (error) {
        console.error("Error extracting skills:", error);
        res.status(500).send("Error processing resume.");
    }
});

// API to Fetch Skills for Frontend
app.get("/api/skills", (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });

    mysql.query("SELECT skills FROM users WHERE id = ?", [req.session.userId], (err, results) => {
        if (err) {
            console.error("Error fetching skills:", err);
            return res.status(500).json({ error: "Database error" });
        }

        const skills = results[0]?.skills || "No skills found";
        res.json({ skills });
    });
});

// Logout
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});

app.listen(3000, () => console.log("✅ Server running on port 3000"));
