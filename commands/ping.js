module.exports = {
  name: 'ping',
  description: 'Check if bot is online',
  async execute(sock, jid, args) {
    const start = Date.now();
    await sock.sendMessage(jid, { text: '🏓 Pong!' });
    const latency = Date.now() - start;
    await sock.sendMessage(jid, { text: `⚡ Latency: ${latency}ms` });
  }
};
