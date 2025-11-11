// api/requestPair.js
const crypto = require("crypto");
const fetch = require("node-fetch");

// Environment variables to set in Vercel project:
// BOT_WEBHOOK        -> e.g. https://your-bot-host.example.com/api/receive-pair
// BOT_SHARED_SECRET  -> same secret on bot host to authenticate incoming webhook
// CODE_TTL_MS        -> optional, default 5*60*1000 (5 minutes)
const BOT_WEBHOOK = process.env.BOT_WEBHOOK || "";
const BOT_SHARED_SECRET = process.env.BOT_SHARED_SECRET || "change_this_secret";
const CODE_TTL_MS = parseInt(process.env.CODE_TTL_MS || String(5 * 60 * 1000), 10);

// small helper to create a short secure code (6 chars)
function makeCode() {
  return crypto.randomBytes(4).toString("base64").replace(/[^A-Z0-9]/gi, "").slice(0, 6).toUpperCase();
}

module.exports = async (req, res) => {
  try {
    // allow only POST from frontend
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const body = req.body || {};
    // expect phone in international format without +, e.g. 263782767055 OR with +263...
    let phone = (body.phone || "").toString().trim();
    if (!phone) return res.status(400).json({ error: "Missing phone" });

    // normalize phone: remove non digits, strip leading +
    phone = phone.replace(/\D/g, "");
    if (phone.length < 6) return res.status(400).json({ error: "Phone looks too short" });

    const code = makeCode();
    const expiresAt = Date.now() + CODE_TTL_MS;

    const payload = {
      code,
      phone,        // requested phone number (digits only)
      expiresAt,
      createdAt: Date.now(),
      source: "vercel-pair-site"
    };

    // try to notify your bot backend (non-blocking if fails)
    if (BOT_WEBHOOK) {
      try {
        const r = await fetch(BOT_WEBHOOK, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-bot-secret": BOT_SHARED_SECRET
          },
          body: JSON.stringify(payload),
          // node-fetch doesn't support timeout in v2 by option in all envs; keep simple
        });
        if (!r.ok) {
          // log but do not fail response (so frontend still shows code)
          console.error("Bot webhook responded with", r.status, await r.text().catch(()=>"-"));
        }
      } catch (err) {
        console.error("Failed to POST to BOT_WEBHOOK:", err.message || err);
      }
    }

    // Respond with the code (frontend shows this to user)
    return res.json({ code, expiresAt });
  } catch (err) {
    console.error("requestPair error:", err);
    return res.status(500).json({ error: "internal error" });
  }
};
