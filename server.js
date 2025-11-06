const express = require("express");
const cors = require("cors");
const { default: makeWASocket, useSingleFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const { state, saveState } = useSingleFileAuthState("./auth_info.json");

const sock = makeWASocket({
  auth: state,
  printQRInTerminal: false, // we use pair codes, not QR
});

sock.ev.on("creds.update", saveState);

let activePairCodes = {}; // code: timestamp

// Generate a random 6-character pair code
function generatePairCode() {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

// API endpoint to request pair code
app.get("/request-pair", (req, res) => {
  const code = generatePairCode();
  const timestamp = Date.now();
  activePairCodes[code] = timestamp;
  
  // expire code in 5 minutes
  setTimeout(() => delete activePairCodes[code], 5 * 60 * 1000);
  
  res.json({ code });
});

// API endpoint to verify pair code (for bot)
app.post("/verify-pair", (req, res) => {
  const { code, jid } = req.body;
  if(activePairCodes[code]) {
    delete activePairCodes[code];
    // Here you can save the JID as linked number
    res.json({ success: true, message: `${jid} linked successfully!` });
  } else {
    res.json({ success: false, message: "Invalid or expired code." });
  }
});

// Start server
app.listen(3000, () => console.log("Pair code site running on http://localhost:3000"));

// Example bot listener for !pair <code>
sock.ev.on("messages.upsert", async (m) => {
  const msg = m.messages[0];
  if(!msg.message) return;
  const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
  const jid = msg.key.remoteJid;

  if(text.startsWith("!pair ")) {
    const code = text.split(" ")[1].toUpperCase();
    if(activePairCodes[code]) {
      delete activePairCodes[code];
      await sock.sendMessage(jid, { text: `✅ Successfully paired with code: ${code}` });
      // Save JID as linked
    } else {
      await sock.sendMessage(jid, { text: "❌ Invalid or expired pair code." });
    }
  }
});
