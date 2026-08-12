const path = require("path");
const dotenv = require("dotenv");

// dotenv.config({ path: path.join(__dirname, "..", ".env") });

const express = require("express");
const connectDB = require("./src/config/db");
const authRoute = require("./src/routes/auth.route");
const app = express();
const cors= require('cors');

connectDB();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Server Running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

app.use("/api/auth/",authRoute);