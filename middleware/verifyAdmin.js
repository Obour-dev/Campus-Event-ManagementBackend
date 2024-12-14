const jwt = require("jsonwebtoken");

const verifyAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: "Access denied. Admin only." });
  }
  next();
};

module.exports = verifyAdmin;
