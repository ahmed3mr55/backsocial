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

// ===== Manual CORS Middleware =====
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && origin.endsWith(".vercel.app")) {
    res.header("Access-Control-Allow-Origin", origin);
  }
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
const routes = [
  "auth",
  "user",
  "post",
  "sharePost",
  "comment",
  "replyComment",
  "like",
  "follow",
  "password",
  "followRequest",
  "profileLink",
  "viewerHistory",
  "notification",
];
routes.forEach(route => {
  app.use(`/api/${route === 'sharePost' ? 'share' : route === 'profileLink' ? 'link' : route}`, require(`./routes/${route}`));
});

// ===== Initialize Socket.IO =====
initSocket(server);

// ===== Start Server =====
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
