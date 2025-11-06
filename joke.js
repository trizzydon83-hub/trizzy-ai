module.exports = {
  name: "joke",
  description: "Send a random fun fact or joke",
  execute: async (sock, jid) => {
    const jokes = [
      "😂 Why did the chicken cross the road? To check WhatsApp messages!",
      "💡 Fun Fact: Zimbabwe is home to the famous Victoria Falls.",
      "🤣 Why did Trizzy AI go to school? To improve its 'byte'-size knowledge!",
      "💡 Fun Fact: Zimbabwe has over 16 official languages.",
    ];
    const joke = jokes[Math.floor(Math.random()*jokes.length)];
    await sock.sendMessage(jid, { text: joke });
  },
};
