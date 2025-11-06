const {
  default: makeWASocket,
  useSingleFileAuthState,
  DisconnectReason,
} = require("@whiskeysockets/baileys");
const P = require("pino");
const fs = require("fs");
const path = require("path");
const { ownerNumber, prefix, botName } = require("./config");

const { state, saveState } = useSingleFileAuthState("./auth_info.json");
const commandsPath = path.join(__dirname, "commands");

// Load commands dynamically
const commands = new Map();
fs.readdirSync(commandsPath).forEach((file) => {
  const cmd = require(path.join(commandsPath, file));
  commands.set(cmd.name, cmd);
});

async function startBot() {
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: P({ level: "silent" }),
  });

  sock.ev.on("creds.update", saveState);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log("Connection closed. Reconnecting:", shouldReconnect);
      if (shouldReconnect) startBot();
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
