// server.js — pJrAI Backend Entry Point
require("dotenv").config();

const express = require("express");
const cors    = require("cors");
const path    = require("path");

const visitRouter = require("./routes/visit");
const chatRouter  = require("./routes/chat");
const adminRouter = require("./routes/admin");

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "x-admin-key"],
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve static files (index.html, admin.html, style.css, script.js)
app.use(express.static(path.join(__dirname, "public")));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/visit",   visitRouter);
app.use("/api/chat",    chatRouter);
app.use("/api",         adminRouter);   // /api/sessions, /api/session/:id, /api/stats

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

// ─── Fallback SPA ─────────────────────────────────────────────────────────────
app.get("*", (req, res) => {
  // Let the browser handle unknown routes via index.html
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅  pJrAI backend running on http://localhost:${PORT}`);
  console.log(`   Admin panel → http://localhost:${PORT}/admin.html`);
});
