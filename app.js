// -------------------------
// Imports
// -------------------------
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { default: makeWASocket, useSingleFileAuthState } = require('@whiskeysockets/baileys');

// -------------------------
// Config
// -------------------------
const PORT = process.env.PORT || 3000;
const PAIR_CODE_EXPIRY = 5 * 60 * 1000; // 5 minutes

// WhatsApp Bot Config
const TARGET_NUMBER = '2630714290663@s.whatsapp.net'; // change to your number
const BOT_TYPE = 'main'; // 'main' or 'mini'

// -------------------------
// Pairing Site Setup
// -------------------------
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let mainPairCodes = {};
let miniPairCodes = {};

// Generate main pair code
app.get('/request-pair', (req, res) => {
    const code = crypto.randomBytes(3).toString('hex').toUpperCase();
    mainPairCodes[code] = Date.now();
    setTimeout(() => delete mainPairCodes[code], PAIR_CODE_EXPIRY);
    res.json({ code });
});

// Generate mini pair code
app.get('/request-mini-pair', (req, res) => {
    const code = crypto.randomBytes(3).toString('hex').toUpperCase();
    miniPairCodes[code] = Date.now();
    setTimeout(() => delete miniPairCodes[code], PAIR_CODE_EXPIRY);
    res.json({ code });
});

// Status endpoint
app.get('/status', (req, res) => res.json({ online: true }));

// Start pairing site
app.listen(PORT, () => console.log(`Pairing site + bot running on http://localhost:${PORT}`));

// -------------------------
// WhatsApp Bot Setup
// -------------------------
const { state, saveState } = useSingleFileAuthState('./auth_info.json');
const sock = makeWASocket({ auth: state });

sock.ev.on('creds.update', saveState);
sock.ev.on('connection.update', update => {
    const { connection, lastDisconnect } = update;
    if(connection === 'close'){
        console.log('❌ WhatsApp disconnected', lastDisconnect?.error?.output?.statusCode);
    } else if(connection === 'open'){
        console.log('✅ WhatsApp connected!');
    }
});

// -------------------------
// Bot Message Listener
// -------------------------
sock.ev.on('messages.upsert', async m => {
    const msg = m.messages[0];
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
    const jid = msg.key.remoteJid;
    if(!text) return;

    // Main Bot Pair
    if(text.startsWith('!pair ')){
        const code = text.split(' ')[1].toUpperCase();
        if(mainPairCodes[code]){
            let linked = JSON.parse(fs.readFileSync('./linked.json','utf-8') || '{}');
            linked[jid] = { linkedAt: Date.now() };
            fs.writeFileSync('./linked.json', JSON.stringify(linked,null,2));
            await sock.sendMessage(jid, { text: `✅ Main bot paired with code: ${code}` });
            delete mainPairCodes[code];
        } else {
            await sock.sendMessage(jid, { text: '❌ Invalid or expired main bot code.' });
        }
    }

    // Mini Bot Pair
    if(text.startsWith('!mini-pair ')){
        const code = text.split(' ')[1].toUpperCase();
        if(miniPairCodes[code]){
            let linkedMini = JSON.parse(fs.readFileSync('./mini-linked.json','utf-8') || '{}');
            linkedMini[jid] = { linkedAt: Date.now() };
            fs.writeFileSync('./mini-linked.json', JSON.stringify(linkedMini,null,2));
            await sock.sendMessage(jid, { text: `✅ Mini bot paired with code: ${code}` });
            delete miniPairCodes[code];
        } else {
            await sock.sendMessage(jid, { text: '❌ Invalid or expired mini bot code.' });
        }
    }
});

// -------------------------
// Optional: Auto-request pair code
// -------------------------
async function autoRequestPair(){
    try {
        const fetch = require('node-fetch');
        const endpoint = BOT_TYPE === 'main' ? '/request-pair' : '/request-mini-pair';
        const res = await fetch(`http://localhost:${PORT}${endpoint}`);
        const data = await res.json();
        console.log(`✅ Auto pair code generated: ${data.code}`);

        // Send to WhatsApp bot
        await sock.sendMessage(TARGET_NUMBER, { text: `!${BOT_TYPE}-pair ${data.code}` });
        console.log(`✅ Pair code sent to WhatsApp bot: ${TARGET_NUMBER}`);
    } catch(err){
        console.error('❌ Auto-request failed:', err.message);
    }
}

// Auto-request after WhatsApp connects
sock.ev.on('connection.update', async update => {
    if(update.connection === 'open'){
        setTimeout(autoRequestPair, 3000); // wait 3s then request
    }
}); 
