// lib/redis.js — Upstash Redis REST API wrapper (no SDK needed)
const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!REDIS_URL || !REDIS_TOKEN) {
  console.warn("[redis] WARNING: UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set.");
}

async function redisCommand(...args) {
  const url = `${REDIS_URL}/${args.map(encodeURIComponent).join("/")}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Redis error ${res.status}: ${text}`);
  }
  const json = await res.json();
  return json.result;
}

const redis = {
  // STRING ops
  async set(key, value) {
    return redisCommand("SET", key, typeof value === "string" ? value : JSON.stringify(value));
  },
  async get(key) {
    const result = await redisCommand("GET", key);
    if (result === null) return null;
    try { return JSON.parse(result); } catch { return result; }
  },
  async del(key) {
    return redisCommand("DEL", key);
  },

  // LIST ops
  async rpush(key, value) {
    return redisCommand("RPUSH", key, typeof value === "string" ? value : JSON.stringify(value));
  },
  async lrange(key, start, stop) {
    const items = await redisCommand("LRANGE", key, String(start), String(stop));
    if (!Array.isArray(items)) return [];
    return items.map((item) => {
      try { return JSON.parse(item); } catch { return item; }
    });
  },
  async llen(key) {
    return redisCommand("LLEN", key);
  },

  // KEYS pattern scan (uses SCAN for safety)
  async keys(pattern) {
    let cursor = "0";
    const allKeys = [];
    do {
      const result = await redisCommand("SCAN", cursor, "MATCH", pattern, "COUNT", "200");
      cursor = result[0];
      allKeys.push(...result[1]);
    } while (cursor !== "0");
    return allKeys;
  },

  // EXPIRE
  async expire(key, seconds) {
    return redisCommand("EXPIRE", key, String(seconds));
  },
};

module.exports = redis;
