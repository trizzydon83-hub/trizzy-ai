const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { default: makeWASocket, useSingleFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // Serve your index.html + style.css

// --- WhatsApp Bot Setup ---
const { state, saveState } = useSingleFileAuthState("./auth_info.json");

const sock = makeWASocket({
  auth: state,
  printQRInTerminal: true
});

sock.ev.on("creds.update", saveState);

sock.ev.on("connection.update", update => {
  const { connection, lastDisconnect } = update;
  if(connection === "open") console.log("✅ Trizzy AI connected!");
  else if(connection === "close") {
    const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
    if(shouldReconnect) startBot();
  }
});

// --- Pairing API ---
let activePairCodes = {}; // { code: timestamp }

// Generate 6-character pair code
function generatePairCode() {
  const code = crypto.randomBytes(3).toString("hex").toUpperCase();
  activePairCodes[code] = Date.now();
  // Expire code after 5 minutes
  setTimeout(() => delete activePairCodes[code], 5*60*1000);
  return code;
}

// Endpoint: request new pair code
app.get("/request-pair", (req, res) => {
  const code = generatePairCode();
  res.json({ code });
});

// Endpoint: verify code (bot can use internally)
app.post("/verify-pair", (req, res) => {
  const { code, jid } = req.body;
  if(activePairCodes[code]) {
    delete activePairCodes[code];
    // Save linked JID to file/database
    let linked = JSON.parse(fs.readFileSync("./linked.json", "utf-8") || "{}");
    linked[jid] = { linkedAt: Date.now() };
    fs.writeFileSync("./linked.json", JSON.stringify(linked, null, 2));
    return res.json({ success: true, message: `${jid} linked successfully!` });
  }
  res.json({ success: false, message: "Invalid or expired pair code." });
});

// Endpoint: bot status
app.get("/status", (req, res) => {
  res.json({ online: true });
});

// --- WhatsApp Bot Message Listener ---
sock.ev.on("messages.upsert", async (m) => {
  const msg = m.messages[0];
  if(!msg.message) return;
  const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
  const jid = msg.key.remoteJid;

  if(text && text.startsWith("!pair ")) {
    const code = text.split(" ")[1].toUpperCase();
    if(activePairCodes[code]) {
      delete activePairCodes[code];
      // Save linked JID to file/database
      let linked = JSON.parse(fs.readFileSync("./linked.json", "utf-8") || "{}");
      linked[jid] = { linkedAt: Date.now() };
      fs.writeFileSync("./linked.json", JSON.stringify(linked, null, 2));
      await sock.sendMessage(jid, { text: `✅ Successfully paired with code: ${code}` });
    } else {
      await sock.sendMessage(jid, { text: "❌ Invalid or expired pair code." });
    }
  }
});

// --- Start Express Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Pairing API running on http://localhost:${PORT}`));
