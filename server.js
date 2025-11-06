const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const fs = require("fs");
const { default: makeWASocket, useSingleFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // serve index.html + style.css

// --- WhatsApp Bot Setup ---
const { state, saveState } = useSingleFileAuthState("./auth_info.json");
const sock = makeWASocket({ auth: state, printQRInTerminal: true });

sock.ev.on("creds.update", saveState);
sock.ev.on("connection.update", update => {
  const { connection, lastDisconnect } = update;
  if(connection === "open") console.log("✅ Trizzy AI connected!");
  else if(connection === "close") {
    const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
    if(shouldReconnect) startBot();
  }
});

// --- Main Pair Codes ---
let activePairCodes = {};
app.get("/request-pair", (req, res) => {
  const code = crypto.randomBytes(3).toString("hex").toUpperCase();
  activePairCodes[code] = Date.now();
  setTimeout(() => delete activePairCodes[code], 5*60*1000);
  res.json({ code });
});

// --- Mini Bot Pair Codes ---
let miniPairCodes = {};
app.get("/request-mini-pair", (req, res) => {
  const code = crypto.randomBytes(3).toString("hex").toUpperCase();
  miniPairCodes[code] = Date.now();
  setTimeout(() => delete miniPairCodes[code], 5*60*1000);
  res.json({ code });
});

// --- Bot Message Listener ---
sock.ev.on("messages.upsert", async (m) => {
  const msg = m.messages[0];
  if(!msg.message) return;
  const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
  const jid = msg.key.remoteJid;

  if(!text) return;

  // Main bot pairing
  if(text.startsWith("!pair ")) {
    const code = text.split(" ")[1].toUpperCase();
    if(activePairCodes[code]) {
      delete activePairCodes[code];
      let linked = JSON.parse(fs.readFileSync("./linked.json", "utf-8") || "{}");
      linked[jid] = { linkedAt: Date.now() };
      fs.writeFileSync("./linked.json", JSON.stringify(linked, null, 2));
      await sock.sendMessage(jid, { text: `✅ Successfully paired with code: ${code}` });
    } else {
      await sock.sendMessage(jid, { text: "❌ Invalid or expired pair code." });
    }
  }

  // Mini bot pairing
  if(text.startsWith("!mini-pair ")) {
    const code = text.split(" ")[1].toUpperCase();
    if(miniPairCodes[code]) {
      delete miniPairCodes[code];
      let linkedMini = JSON.parse(fs.readFileSync("./mini-linked.json", "utf-8") || "{}");
      linkedMini[jid] = { linkedAt: Date.now() };
      fs.writeFileSync("./mini-linked.json", JSON.stringify(linkedMini, null, 2));
      await sock.sendMessage(jid, { text: `✅ Mini bot paired successfully!` });
    } else {
      await sock.sendMessage(jid, { text: "❌ Invalid or expired mini bot code." });
    }
  }
});

// --- Status Endpoint ---
app.get("/status", (req, res) => {
  res.json({ online: true });
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Pairing API running on http://localhost:${PORT}`));
