// bot-webhook.js
const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const STORE_FILE = path.join(__dirname, 'pair-store.json');
const BOT_SHARED_SECRET = process.env.BOT_SHARED_SECRET || 'change_this_secret';
const OWNER_JID = process.env.OWNER_JID || null; // optional to notify owner

// load store (code -> { code, phone, expiresAt, createdAt, source })
let store = {};
try { store = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8') || '{}'); } catch(e){ store = {}; }

function saveStore(){ try{ fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2)); } catch(e){ console.error('saveStore error', e); } }

// POST /api/receive-pair  <-- called by Vercel function
router.post('/api/receive-pair', express.json(), async (req, res) => {
  try {
    const secret = req.headers['x-bot-secret'];
    if (!secret || secret !== BOT_SHARED_SECRET) return res.status(403).json({ error: 'unauthorized' });

    const { code, phone, expiresAt, createdAt, source } = req.body || {};
    if (!code || !phone) return res.status(400).json({ error: 'missing code or phone' });

    // normalize phone digits only
    const normalizedPhone = phone.toString().replace(/\D/g, "");

    store[code] = {
      code,
      phone: normalizedPhone,
      expiresAt: expiresAt || (Date.now() + 5*60*1000),
      createdAt: createdAt || Date.now(),
      source: source || 'unknown'
    };
    saveStore();

    // optionally notify owner via Baileys socket (if available on global.sock)
    if (global.sock && OWNER_JID) {
      try {
        await global.sock.sendMessage(OWNER_JID, { text: `New pair code: ${code} for +${normalizedPhone} (expires ${new Date(store[code].expiresAt).toLocaleString()})` });
      } catch (e) { console.error('owner notify failed', e); }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('receive-pair error', err);
    return res.status(500).json({ error: 'internal' });
  }
});

// Helper: verifyCode(code, jid) -> boolean
// jid is user JID like "263782767055@s.whatsapp.net"
async function verifyCode(code, jid){
  // normalize
  if(!code || !jid) return false;
  code = code.toString().toUpperCase();
  const jidPhone = jid.split('@')[0]; // digits only
  // clean up expired entries
  const now = Date.now();
  for (const k of Object.keys(store)) {
    if (store[k].expiresAt && store[k].expiresAt <= now) delete store[k];
  }
  saveStore();

  const entry = store[code];
  if (!entry) return false;
  // must match phone requested and the JID phone part
  if (entry.phone !== jidPhone) {
    // optional: allow if you want to link different number; currently require match
    return false;
  }
  // consume code (single use)
  delete store[code];
  saveStore();
  return true;
}

module.exports = { router, verifyCode };
