// routes/chat.js
const express = require("express");
const router  = express.Router();
const redis   = require("../lib/redis");

// POST /api/chat — save user message + AI response
router.post("/", async (req, res) => {
  try {
    const { sessionId, userMessage, aiResponse } = req.body;

    if (!sessionId || !userMessage || !aiResponse) {
      return res.status(400).json({
        error: "sessionId, userMessage, and aiResponse are required.",
      });
    }

    const now     = new Date().toISOString();
    const chatKey = `chat:${sessionId}`;

    const userEntry = {
      role: "user",
      text: userMessage,
      time: now,
    };
    const aiEntry = {
      role: "ai",
      text: aiResponse,
      time: now,
    };

    await redis.rpush(chatKey, userEntry);
    await redis.rpush(chatKey, aiEntry);

    // Keep chat logs for 90 days
    await redis.expire(chatKey, 60 * 60 * 24 * 90);

    // Also update lastActive on the visit record
    const visitKey   = `visit:${sessionId}`;
    const existing   = await redis.get(visitKey);
    if (existing) {
      existing.lastActive = now;
      await redis.set(visitKey, existing);
      await redis.expire(visitKey, 60 * 60 * 24 * 90);
    }

    return res.json({ ok: true, saved: 2 });
  } catch (err) {
    console.error("[POST /api/chat]", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;
