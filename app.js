// -------------------------
// Imports
// -------------------------
const { default: makeWASocket, useSingleFileAuthState } = require('@whiskeysockets/baileys');
const fetch = require('node-fetch');
const fs = require('fs');

// -------------------------
// Config
// -------------------------
const PAIRING_SITE = 'https://solo-leveling-mini.dexter.it.com'; // Existing deployment
const BOT_TYPE = 'main'; // 'main' or 'mini'
const TARGET_NUMBER = '2630714290663@s.whatsapp.net'; // Your WhatsApp number

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

    // Main bot pair
    if(text.startsWith('!pair ')){
        const code = text.split(' ')[
