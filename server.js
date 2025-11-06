const express = require("express");
const cors = require("cors");
const { default: makeWASocket, useSingleFileAuthState } = require("@whiskeysockets/baileys");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // Deployment site files

const { state, saveState } = useSingleFileAuthState("./auth_info.json");
let botOnline = false;

// Start Baileys bot
const sock = makeWASocket({
  auth: state,
  printQRInTerminal: false
});

sock.ev.on("creds.update", saveState);
sock.ev.on("connection.update", update => {
  const { connection } = update;
  botOnline = connection === "open";
});

// Example pair codes
let activePairCodes = {};

function generatePairCode() {
  const code = Math.random().toString(36).substr(2, 6).toUpperCase();
  activePairCodes[code] = Date.now();
  setTimeout(() => delete activePairCodes[code], 5 * 60 * 1000);
  return code;
}

// API endpoints
app.get("/status", (req, res) => {
  res.json({ online: botOnline });
});

app.get("/request-pair", (req, res) => {
  const code = generatePairCode();
  res.json({ code });
});

app.listen(3000, () => console.log("Trizzy AI bot + API running on http://localhost:3000"));
