module.exports = {
  name: 'about',
  description: 'About this bot',
  async execute(sock, jid, args) {
    const aboutText = `
🤖 *Trizzy AI*

A WhatsApp bot created by Sean Phiri.

Type !help to see available commands.
    `.trim();
    await sock.sendMessage(jid, { text: aboutText });
  }
};
