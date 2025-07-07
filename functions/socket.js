// functions/socket.js
const { Server } = require("socket.io");

let io, onlineUsers = new Map();

function initSocket(server) {
  io = new Server(server, {
    path: "/socket.io",
    cors: {
      origin: "https://front-social-seven.vercel.app",
      credentials: true,
      methods: ["GET","POST","OPTIONS"],
      allowedHeaders: ["Content-Type","Authorization"],
    },
    transports: ["websocket"]
  });

  io.on("connection", socket => {
    console.log("Socket connected:", socket.id);
    socket.on("register", uid => onlineUsers.set(uid, socket.id));
    socket.on("disconnect", () => {
      for (let [uid, sid] of onlineUsers)
        if (sid === socket.id) onlineUsers.delete(uid);
    });
  });

  return io;
}
