const express = require("express");
const app = express();

app.get("/api/request-pair", (req, res) => {
  // Generate a random, short pairing code
  const pairCode = "PAIR-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  res.json({ code: pairCode });
});

// Export for Vercel
module.exports = app;
