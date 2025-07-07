// index.js
const express = require("express");
const http = require("http");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
require("dotenv").config();

// Socket setup
const { initSocket } = require("./functions/socket");

const app = express();
const server = http.createServer(app);

// ===== CORS Manual Middleware =====
const FRONT_ORIGIN = "https://front-social-seven.vercel.app";
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", FRONT_ORIGIN);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Methods",
    "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization,Accept,X-Requested-With"
  );
  res.header("Access-Control-Expose-Headers", "Authorization");
  
  if (req.method === "OPTIONS") {
    // Preflight request
    return res.sendStatus(204);
  }
  next();
});

// ===== Other Middleware =====
app.use(express.json());
app.use(cookieParser());

// Connect to database
connectDB();

// ===== API Routes =====
app.get("/", (req, res) => {
  res.status(200).json({ message: "Welcome to the Social Media API" });
});
app.use("/api/auth", require("./routes/auth"));
app.use("/api/user", require("./routes/user"));
app.use("/api/post", require("./routes/post"));
app.use("/api/share", require("./routes/sharePost"));
app.use("/api/comment", require("./routes/comment"));
app.use("/api/replyComment", require("./routes/replyComment"));
app.use("/api/like", require("./routes/like"));
app.use("/api/follow", require("./routes/follow"));
app.use("/api/password", require("./routes/password"));
app.use("/api/followRequest", require("./routes/followRequest"));
app.use("/api/link", require("./routes/profileLink"));
app.use("/api/viewerHistory", require("./routes/viewerHistory"));
app.use("/api/notification", require("./routes/notification"));

// ===== Initialize Socket.IO =====
initSocket(server);

// ===== Start Server =====
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
