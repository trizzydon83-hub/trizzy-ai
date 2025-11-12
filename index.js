const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} = require("maher-zubair-baileys");
const P = require("pino");
const fs = require("fs");
const path = require("path");
const { ownerNumber, prefix, botName } = require("./config");

const commandsPath = path.join(__dirname, "commands");
const SESSION_PATH = './sessions/default';

// Load commands dynamically
const commands = new Map();
fs.readdirSync(commandsPath).forEach((file) => {
  const cmd = require(path.join(commandsPath, file));
  commands.set(cmd.name, cmd);
});

async function startBot() {
  const credsPath = path.join(SESSION_PATH, 'creds.json');
  
  if (!fs.existsSync(credsPath)) {
    console.log('⏳ Waiting for session... Please pair your WhatsApp first at the pairing portal.');
    setTimeout(startBot, 5000);
    return;
  }

  try {
    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
    if (!creds.registered) {
      console.log('⏳ Session not yet registered... waiting for pairing to complete.');
      setTimeout(startBot, 5000);
      return;
    }
  } catch (err) {
    console.log('⏳ Invalid session file... waiting for valid pairing.');
    setTimeout(startBot, 5000);
    return;
  }

  console.log(`🤖 Starting ${botName}...`);
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);
  
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: P({ level: "silent" }),
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log("Connection closed. Reconnecting:", shouldReconnect);
      if (shouldReconnect) {
        console.log("🔄 Restarting bot in 5 seconds...");
        setTimeout(startBot, 5000);
      } else {
        console.log("🔓 Logged out. Please pair again at the pairing portal.");
        setTimeout(startBot, 5000);
      }
    } else if (connection === "open") {
      console.log(`✅ ${botName} connected successfully!`);
    }
  });

  sock.ev.on("messages.upsert", async (msg) => {
    const m = msg.messages[0];
    if (!m.message || m.key.fromMe) return;

    const jid = m.key.remoteJid;
    const text =
      m.message.conversation || m.message.extendedTextMessage?.text || "";

    if (!text.startsWith(prefix)) return;
    const args = text.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = commands.get(commandName);
    if (!command) {
      await sock.sendMessage(jid, { text: "❓ Unknown command. Type !help" });
      return;
    }

    try {
      await command.execute(sock, jid, args);
      console.log(`✅ Executed ${commandName} for ${jid}`);
    } catch (err) {
      console.error(err);
      await sock.sendMessage(jid, { text: "⚠️ Error executing command." });
    }
  });
}

startBot();
