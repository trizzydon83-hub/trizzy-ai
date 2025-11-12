import express from 'express'
import bodyParser from 'body-parser'
import makeWASocket, { useMultiFileAuthState, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'

const app = express()
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

let sock

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info')

  sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, console)
    },
    printQRInTerminal: false
  })

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
      console.log('Connection closed. Reason:', reason)
      startBot()
    } else if (connection === 'open') {
      console.log('✅ Bot connected to WhatsApp!')
    }
  })

  sock.ev.on('creds.update', saveCreds)
}

await startBot()

// Serve pairing page
app.get('/', (req, res) => {
  res.send(`
    <h2>Trizzy-AI WhatsApp Pairing</h2>
    <form method="POST" action="/pair">
      <label>Enter your WhatsApp number with country code:</label><br/>
      <input type="text" name="phone" placeholder="e.g. 26377xxxxxxx" required /><br/><br/>
      <button type="submit">Request Pair Code</button>
    </form>
  `)
})

// Handle pairing request
app.post('/pair', async (req, res) => {
  const phoneNumber = req.body.phone
  if (!phoneNumber) return res.send('❌ Phone number required.')

  try {
    const response = await sock.requestPairingCode(phoneNumber)
    res.send(`
      <p>✅ Pairing code requested!</p>
      <p>Enter this code in WhatsApp Linked Devices:</p>
      <h3>${response?.pairingCode}</h3>
      <a href="/">Go back</a>
    `)
  } catch (err) {
    console.error(err)
    res.send('❌ Failed to request pairing code: ' + err.message)
  }
})

app.listen(3000, () => console.log('🌐 Server running on http://localhost:3000'))
