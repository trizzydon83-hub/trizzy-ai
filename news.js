const Parser = require('rss-parser');
const parser = new Parser();
module.exports = {
  name: "news",
  description: "Get latest news from Zimbabwe",
  execute: async (sock, jid) => {
    try {
      const feed = await parser.parseURL('https://www.newsday.co.zw/rss/');
      let text = "*📰 Latest Zimbabwe News*\n\n";
      feed.items.slice(0,3).forEach((item, i) => {
        text += `${i+1}. ${item.title}\n${item.link}\n\n`;
      });
      await sock.sendMessage(jid, { text });
    } catch (err) {
      await sock.sendMessage(jid, { text: "⚠️ Failed to fetch news." });
    }
  },
};
