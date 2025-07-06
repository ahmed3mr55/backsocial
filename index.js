// index.js
const express = require("express");
const http = require("http");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
require("dotenv").config();

// Socket
const { initSocket } = require("./functions/socket");

app.use((req, res, next) => {
  res.header(
    "Access-Control-Allow-Origin",
    "https://front-social-seven.vercel.app"
  );

  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});
const app = express();
const server = http.createServer(app);
app.use(cors({
  origin: "https://front-social-seven.vercel.app",
  credentials: true,
}));

// Middleware
app.use(
  cors({
    origin: "https://front-social-seven.vercel.app/",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
connectDB();

// Routes
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

initSocket(server);

// start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
