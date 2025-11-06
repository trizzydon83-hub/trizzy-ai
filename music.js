const ytdl = require("ytdl-core");
const yts = require("yt-search");

module.exports = {
  name: "music",
  description: "Search and download a song from YouTube",
  execute: async (sock, jid, args) => {
    if (!args.length) return await sock.sendMessage(jid, { text: "Usage: !music <song name>" });
    
    const query = args.join(" ");
    try {
      const r = await yts(query);
      const video = r.videos.length > 0 ? r.videos[0] : null;
      if (!video) return await sock.sendMessage(jid, { text: "❌ Song not found." });

      const url = video.url;

      await sock.sendMessage(jid, {
        text: `🎵 *${video.title}*\nDownload here: ${url}`
      });

      // Optional: You could download MP3 and send, but file size limits may apply
    } catch (err) {
      console.error(err);
      await sock.sendMessage(jid, { text: "⚠️ Failed to fetch song." });
    }
  },
};
