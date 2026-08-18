module.exports = (io) => {
    io.on("connection", (socket) => {

    socket.on("join-board", (boardId) => {
        socket.join(boardId);
        console.log(`${socket.id} joined board ${boardId}`);
    });

    socket.on("draw-start", (data) => {
        socket.to(data.boardId).emit("draw-start", data);
    });

    socket.on("draw", (data) => {
        socket.to(data.boardId).emit("draw", data);
    });

    socket.on("draw-end", (data) => {
        socket.to(data.boardId).emit("draw-end", data);
    });

    socket.on("draw-shape", (data) => {
        socket.to(data.boardId).emit("draw-shape", data);
    });

    socket.on("clear-board", (boardId) => {
    socket.to(boardId).emit("clear-board");
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:");
    });

});
}