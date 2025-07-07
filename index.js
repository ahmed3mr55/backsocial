// index.js
const express = require("express");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
require("dotenv").config();


const app = express();

// ===== Dynamic CORS Middleware for all subdomains =====
app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Allow any subdomain of front-social...vercel.app
  if (origin && /https:\/\/.*\.vercel\.app$/.test(origin)) {
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

  // Preflight
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


// ===== Start Server =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
