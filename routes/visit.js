// routes/visit.js
const express = require("express");
const router  = express.Router();
const redis   = require("../lib/redis");

// POST /api/visit — save or update a user session
router.post("/", async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required." });
    }

    // Resolve real IP (behind proxies / Vercel / Nginx)
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      req.headers["x-real-ip"] ||
      req.socket?.remoteAddress ||
      "unknown";

    const userAgent = req.headers["user-agent"] || "unknown";
    const now       = new Date().toISOString();
    const key       = `visit:${sessionId}`;

    // Load existing record (preserve createdAt)
    const existing = await redis.get(key);

    const record = {
      sessionId,
      ip,
      userAgent,
      createdAt : existing?.createdAt || now,
      lastActive: now,
    };

    await redis.set(key, record);
    // Keep session data for 90 days
    await redis.expire(key, 60 * 60 * 24 * 90);

    return res.json({ ok: true, session: record });
  } catch (err) {
    console.error("[POST /api/visit]", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;
