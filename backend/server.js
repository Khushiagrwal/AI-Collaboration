const path = require("path");
const dotenv = require("dotenv");

// dotenv.config({ path: path.join(__dirname, "..", ".env") });

const express = require("express");
const connectDB = require("./src/config/db");
const authRoute = require("./src/routes/auth.route");
const boardRoute = require("./src/routes/board.route")
const app = express();
const cors= require('cors');
const {Server}=require('socket.io');
const http=require('http')

connectDB();

app.use(cors());
app.use(express.json());

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
io.on("connection", (socket) => {

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });

    socket.on("join-board", (boardId) => {
        socket.join(boardId);
        console.log(`${socket.id} joined board ${boardId}`);
    });

    socket.on("draw",(data)=>{
        socket.to(data.boardId).emit("draw",data)
    })

    socket.on("disconnect", () => {
        console.log("User disconnected:");
    });

});

app.use("/api/auth/",authRoute);
app.use("/api/board/",boardRoute);
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});