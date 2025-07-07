// socket.js
const { Server } = require("socket.io");

let io;
const onlineUsers = new Map();

function initSocket(server) {
  io = new Server(server, {
    path: "/socket.io",
    cors: {
      origin: "https://front-social-seven.vercel.app",
      methods: ["GET", "POST", "OPTIONS"],
      credentials: true,
      allowedHeaders: ["Authorization", "Content-Type"],
    },
    transports: ["websocket"],
  });

  io.on("connection", (socket) => {
    console.log("a user connected");
    socket.on("register", (userId) => {
      onlineUsers.set(userId, socket.id);
      console.log(`User ${userId} connected, socket id: ${socket.id}`);
    });

    socket.on("disconnect", () => {
      for (const [uid, sid] of onlineUsers) {
        if (sid === socket.id) {
          onlineUsers.delete(uid);
          console.log(`User ${uid} disconnected`);
          break;
        }
      }
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error("Socket.IO not initialized!");
  return io;
}

module.exports = { initSocket, getIO, onlineUsers };
