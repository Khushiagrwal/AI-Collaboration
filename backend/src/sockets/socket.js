const jwt = require("jsonwebtoken");
const { findAccessibleBoard, getBoardRole } = require("../services/board-access.service");

module.exports = io => {
  io.on("connection", socket => {
    socket.data.boardRoles = new Map();

    const rejectBoardEvent = message => {
      socket.emit("board-access-error", message);
    };

    const getAuthorizedRole = (boardId, allowViewer = false) => {
      if (typeof boardId !== "string" || !socket.data.boardRoles.has(boardId)) {
        rejectBoardEvent("Join this board before sending board events");
        return null;
      }

      const role = socket.data.boardRoles.get(boardId);
      if (!allowViewer && role === "viewer") {
        rejectBoardEvent("Viewer access cannot edit this board");
        return null;
      }
      return role;
    };

    socket.on("join-board", async ({ boardId, token } = {}) => {
      if (typeof boardId !== "string" || !token) {
        rejectBoardEvent("A valid board ID and login token are required");
        return;
      }

      socket.data.boardRoles.delete(boardId);
      socket.leave(boardId);

      let userId;
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch {
        rejectBoardEvent("Your login session is invalid or expired");
        return;
      }

      try {
        const board = await findAccessibleBoard(boardId, userId);
        if (!board) {
          rejectBoardEvent("Board not found or you don't have access");
          return;
        }

        socket.data.boardRoles.set(boardId, getBoardRole(board, userId));
        socket.join(boardId);
        console.log(`${socket.id} joined board ${boardId}`);
      } catch (error) {
        console.error("[Socket] Could not verify board access:", error);
        rejectBoardEvent("Could not verify board access");
      }
    });

    socket.on("leave-board", boardId => {
      if (typeof boardId !== "string") {
        return;
      }
      socket.data.boardRoles.delete(boardId);
      socket.leave(boardId);
    });

    for (const eventName of ["draw-start", "draw", "draw-end", "draw-shape"]) {
      socket.on(eventName, data => {
        if (!data || !getAuthorizedRole(data.boardId)) {
          return;
        }
        socket.to(data.boardId).emit(eventName, {
          ...data,
          ...(eventName === "draw-start" || eventName === "draw" || eventName === "draw-end"
            ? { socketId: socket.id }
            : {})
        });
      });
    }

    socket.on("clear-board", boardId => {
      if (!getAuthorizedRole(boardId)) {
        return;
      }
      socket.to(boardId).emit("clear-board");
    });

    socket.on("cursor-move", data => {
      if (!data || !getAuthorizedRole(data.boardId, true)) {
        return;
      }
      socket.to(data.boardId).emit("cursor-move", {
        ...data,
        socketId: socket.id
      });
    });

    socket.on("cursor-leave", boardId => {
      if (!getAuthorizedRole(boardId, true)) {
        return;
      }
      socket.to(boardId).emit("cursor-leave", { socketId: socket.id });
    });

    socket.on("ai-diagram", data => {
      if (!data || !getAuthorizedRole(data.boardId)) {
        return;
      }
      socket.to(data.boardId).emit("ai-diagram", data.diagram);
    });

    socket.on("disconnect", () => {
      for (const boardId of socket.data.boardRoles.keys()) {
        socket.to(boardId).emit("cursor-leave", { socketId: socket.id });
      }
      console.log("User disconnected:");
    });
  });
};
