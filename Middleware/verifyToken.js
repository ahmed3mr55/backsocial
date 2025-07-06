const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.SECRET_KEY;
const { User } = require("../models/User");

async function verifyToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(200).json({ message: "Authentication token is missing" });
  }

  jwt.verify(token, SECRET_KEY, async (err, decoded) => {
    if (err) {
      console.error(`Token verification failed: ${err.message}`);
      return res.status(403).json({ message: "Access denied." });
    }

    const { id, tokenVersion } = decoded;
    if (!id || tokenVersion === undefined) {
      return res.status(403).json({ message: "Invalid token payload" });
    }

    let user;
    try {
      user = await User.findById(id).select("-password");
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
    } catch (dbErr) {
      console.error(dbErr);
      return res.status(500).json({ message: "Server error" });
    }

    if (user.tokenVersion !== tokenVersion) {
      return res
        .status(401)
        .json({ message: "Token invalid. Please log in again." });
    }

    req.user = user;
    next();
  });
}

module.exports = { verifyToken };
