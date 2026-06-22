// routes/admin.js
const express   = require("express");
const router    = express.Router();
const redis     = require("../lib/redis");
const adminAuth = require("../middleware/adminAuth");

// All routes below require the x-admin-key header
router.use(adminAuth);

// ─── GET /api/sessions ────────────────────────────────────────────────────────
// Returns all sessions with chat count + metadata
router.get("/sessions", async (req, res) => {
  try {
    const keys = await redis.keys("visit:*");

    if (!keys.length) return res.json({ sessions: [] });

    // Fetch all visit records in parallel
    const records = await Promise.all(
      keys.map(async (key) => {
        const session = await redis.get(key);
        if (!session) return null;

        // Get chat count
        const chatKey  = `chat:${session.sessionId}`;
        const chatCount = await redis.llen(chatKey);

        return { ...session, chatCount: Number(chatCount) || 0 };
      })
    );

    // Sort newest first
    const sessions = records
      .filter(Boolean)
      .sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive));

    return res.json({ sessions, total: sessions.length });
  } catch (err) {
    console.error("[GET /api/sessions]", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/session/:id ─────────────────────────────────────────────────────
// Returns visit metadata + full chat history for one session
router.get("/session/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const visitKey = `visit:${id}`;
    const chatKey  = `chat:${id}`;

    const [session, messages] = await Promise.all([
      redis.get(visitKey),
      redis.lrange(chatKey, 0, -1),
    ]);

    if (!session) {
      return res.status(404).json({ error: "Session not found." });
    }

    return res.json({ session, messages: messages || [] });
  } catch (err) {
    console.error("[GET /api/session/:id]", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/stats ───────────────────────────────────────────────────────────
// Returns aggregate stats
router.get("/stats", async (req, res) => {
  try {
    const visitKeys = await redis.keys("visit:*");
    const chatKeys  = await redis.keys("chat:*");

    // Total unique sessions
    const totalSessions = visitKeys.length;

    // Total messages across all chats
    let totalMessages = 0;
    const msgCounts = await Promise.all(
      chatKeys.map((k) => redis.llen(k))
    );
    msgCounts.forEach((c) => { totalMessages += Number(c) || 0; });

    // Active users today (lastActive within last 24 h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let activeToday = 0;

    if (visitKeys.length) {
      const sessions = await Promise.all(visitKeys.map((k) => redis.get(k)));
      sessions.forEach((s) => {
        if (s && new Date(s.lastActive) >= oneDayAgo) activeToday++;
      });
    }

    return res.json({
      totalSessions,
      totalMessages,
      activeToday,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[GET /api/stats]", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;
