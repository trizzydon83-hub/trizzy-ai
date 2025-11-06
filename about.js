module.exports = {
  name: "about",
  description: "Information about Trizzy AI",
  execute: async (sock, jid) => {
    await sock.sendMessage(jid, {
      text: "💡 *Trizzy AI 🤖* — A WhatsApp automation bot by *Sean Phiri*.\nPowered by Baileys library (Node.js).",
    });
  },
};
