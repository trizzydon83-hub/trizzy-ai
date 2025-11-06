const { default: makeWASocket, useSingleFileAuthState } = require('@whiskeysockets/baileys');
const fs = require('fs');

const { state, saveState } = useSingleFileAuthState('./auth_info.json');
const sock = makeWASocket({ auth: state, printQRInTerminal: true });
sock.ev.on('creds.update', saveState);

const linkedFile = './linked.json';
const miniLinkedFile = './mini-linked.json';

sock.ev.on('messages.upsert', async m => {
  const msg = m.messages[0];
  if(!msg.message) return;
  const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
  const jid = msg.key.remoteJid;
  if(!text) return;

  // Main bot pair
  if(text.startsWith('!pair ')){
    const code = text.split(' ')[1].toUpperCase();
    const activePairCodes = JSON.parse(fs.readFileSync('./server.json') || '{}');
    if(activePairCodes[code]){
      let linked = JSON.parse(fs.readFileSync(linkedFile, 'utf-8') || '{}');
      linked[jid] = { linkedAt: Date.now() };
      fs.writeFileSync(linkedFile, JSON.stringify(linked, null, 2));
      await sock.sendMessage(jid, { text: `✅ Main bot paired with code: ${code}` });
    } else {
      await sock.sendMessage(jid, { text: '❌ Invalid or expired code.' });
    }
  }

  // Mini bot pair
  if(text.startsWith('!mini-pair ')){
    const code = text.split(' ')[1].toUpperCase();
    const miniPairCodes = JSON.parse(fs.readFileSync('./server.json') || '{}');
    if(miniPairCodes[code]){
      let linkedMini = JSON.parse(fs.readFileSync(miniLinkedFile, 'utf-8') || '{}');
      linkedMini[jid] = { linkedAt: Date.now() };
      fs.writeFileSync(miniLinkedFile, JSON.stringify(linkedMini, null, 2));
      await sock.sendMessage(jid, { text: `✅ Mini bot paired with code: ${code}` });
    } else {
      await sock.sendMessage(jid, { text: '❌ Invalid or expired mini bot code.' });
    }
  }
});
