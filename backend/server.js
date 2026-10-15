const path = require("path");
const dotenv = require("dotenv");

// dotenv.config({ path: path.join(__dirname, "..", ".env") });

const express = require("express");
const connectDB = require("./src/config/db");
const { initializeVectorStore } = require("./src/services/vector-store.service");
const authRoute = require("./src/routes/auth.route");
const boardRoute = require("./src/routes/board.route")
const inviteRoute= require("./src/routes/invitation.route")
const app = express();
const cors= require('cors');
const {Server}=require('socket.io');
const http=require('http')
const aiRoute =require("./src/routes/ai.route")
const documentRoute = require("./src/routes/document.route");

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
    res.send("Server Running");
});

const PORT = process.env.PORT || 8080;

// Create HTTP server
const server=http.createServer(app);

// app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
// });

// Create Socket.IO server
const io=new Server(server,{
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Socket connection
require("./src/sockets/socket")(io);

app.use("/api/auth/",authRoute);
app.use("/api/board/",boardRoute);
app.use("/api/invite",inviteRoute);
app.use("/api/ai",aiRoute)
app.use("/api/documents",documentRoute)

const startServer = async () => {
    try {
        await Promise.all([
            connectDB(),
            initializeVectorStore()
        ]);
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("[Startup] Backend initialization failed:", error);
        process.exit(1);
    }
};

startServer();