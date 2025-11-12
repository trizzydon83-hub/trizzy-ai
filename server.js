const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pairRouter = require('./pair');

app.use('/pair', pairRouter);

// ----------------------------
// Status endpoint
// ----------------------------
app.get('/status', (req, res) => res.json({ online: true }));

// ----------------------------
// Start server
// ----------------------------
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => console.log(`Pairing server running on ${HOST}:${PORT}`));
