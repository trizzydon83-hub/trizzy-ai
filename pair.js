const qrcode = require("qrcode-terminal");
module.exports = {
  name: "pair",
  description: "Generate QR code to link a new WhatsApp number",
  execute: async (sock, jid) => {
    if(sock?.ev) {
      sock.ev.once('connection.update', (update) => {
        if(update.qr) {
          qrcode.generate(update.qr, {small: true});
        }
      });
      await sock.sendMessage(jid, { text: "📌 Pairing request initiated. Check the server logs for QR code." });
    } else {
      await sock.sendMessage(jid, { text: "⚠️ Pairing feature not available." });
    }
  },
};
