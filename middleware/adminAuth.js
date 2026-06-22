// middleware/adminAuth.js
module.exports = function adminAuth(req, res, next) {
  const key = req.headers["x-admin-key"];
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized: invalid admin key." });
  }
  next();
};
