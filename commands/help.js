module.exports = {
  name: 'help',
  description: 'Shows available commands',
  async execute(sock, jid, args) {
    const helpText = `
🤖 *Trizzy AI Bot Commands*

!help - Show this message
!ping - Check if bot is online
!about - About this bot
!joke - Get a random joke

Use the prefix ! before each command.
    `.trim();
    await sock.sendMessage(jid, { text: helpText });
  }
};
