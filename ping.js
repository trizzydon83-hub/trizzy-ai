module.exports = {
  name: "ping",
  description: "Replies with Pong!",
  execute: async (sock, jid) => {
    await sock.sendMessage(jid, { text: "🏓 Pong! Trizzy AI is online." });
  },
};
