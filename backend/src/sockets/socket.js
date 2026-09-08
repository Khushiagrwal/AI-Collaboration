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

    socket.on("cursor-move", (data) => {
        socket.to(data.boardId).emit("cursor-move", {
            ...data,
            socketId: socket.id
        });
    });

    socket.on("cursor-leave", (boardId) => {
        socket.to(boardId).emit("cursor-leave", { socketId: socket.id });
    });

    socket.on("ai-diagram", (data) => {
        socket.to(data.boardId).emit("ai-diagram", data.diagram);
    });

    socket.on("disconnect", () => {
        socket.rooms.forEach((room) => {
            if (room !== socket.id) {
                socket.to(room).emit("cursor-leave", { socketId: socket.id });
            }
        });
        console.log("User disconnected:");
    });

});
}