const { default: makeWASocket, useSingleFileAuthState, delay } = require('@whiskeysockets/baileys');
const fetch = require('node-fetch'); // for Node <18
const fs = require('fs');

// -------------------------
// Configuration
// -------------------------
const PAIRING_SITE = 'https://trizzy-ai-pairing.render.host'; // Change to your deployed pairing site
const BOT_TYPE = 'main'; // 'main' or 'mini'
const TARGET_NUMBER = '2630714290663@s.whatsapp.net'; // Replace with your WhatsApp number in JID format

// -------------------------
// WhatsApp setup
// -------------------------
const { state, saveState } = useSingleFileAuthState('./auth_info.json');
const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
});

sock.ev.on('creds.update', saveState);

sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if(connection === 'close') {
        console.log('❌ Disconnected:', lastDisconnect?.error?.output?.statusCode);
    } else if(connection === 'open') {
        console.log('✅ WhatsApp connected!');
    }
});

// -------------------------
// Request pair code
// -------------------------
async function requestPairCode() {
    try {
        const endpoint = BOT_TYPE === 'main' ? '/request-pair' : '/request-mini-pair';
        const res = await fetch(`${PAIRING_SITE}${endpoint}`);
        if(!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);

        const data = await res.json();
        console.log('✅ Pair code received:', data.code);

        // Send code to WhatsApp bot
        await sock.sendMessage(TARGET_NUMBER, {
            text: `!${BOT_TYPE}-pair ${data.code}`
        });
        console.log(`✅ Sent pair code to WhatsApp bot: ${TARGET_NUMBER}`);
    } catch(err) {
        console.error('❌ Failed to request or send pair code:', err.message);
    }
}

// -------------------------
// Run
// -------------------------
sock.ev.on('connection.update', async (update) => {
    if(update.connection === 'open') {
        // Wait a few seconds for WhatsApp session to stabilize
        await delay(3000);
        requestPairCode();
    }
});
