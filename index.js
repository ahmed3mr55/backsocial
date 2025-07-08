// index.js
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
require("dotenv").config();
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const compression = require("compression");

const app = express();

const corsOptions = {
  origin: process.env.FRONT_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "X-Requested-With",
  ],
  exposedHeaders: ["Authorization"],
};

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // disable the `X-RateLimit-*` headers
});
app.use(limiter);

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(helmet());
app.use(hpp());
const xss = require("xss");

app.use((req, res, next) => {
  const sanitizeInput = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === "string") {
        obj[key] = xss(obj[key]);
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        sanitizeInput(obj[key]);
      }
    }
  };
  if (req.body) sanitizeInput(req.body);
  if (req.query) sanitizeInput(req.query);
  if (req.params) sanitizeInput(req.params);
  next();
});

app.use(compression());

connectDB();

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
