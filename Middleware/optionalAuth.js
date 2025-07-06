const jwt = require('jsonwebtoken');

function optionalAuth(req, res, next) {
  const token = req.cookies.token;

  if (token) {
    jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
      if (err) {
        req.user = null;
      } else {
        req.user = decoded;
      }
      return next();
    });
  } else {
    req.user = null;
    return next();
  }
}

module.exports = { optionalAuth };