module.exports = {
  name: "help",
  description: "Displays all available commands",
  execute: async (sock, jid) => {
    const helpText = `
*🤖 Trizzy AI Command List*
──────────────────────
!ping - Check if bot is online
!about - Info about the bot
!help - Show this help menu
!pair - Generate QR code to link a new number
!news - Latest Zimbabwe news
!rates - USD/ZAR → ZWL rates
!weather <city> - Weather in Zimbabwe
!joke - Fun fact / joke
──────────────────────
👤 Owner: Sean Phiri
`;
    await sock.sendMessage(jid, { text: helpText });
  },
};
