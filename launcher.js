const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Trizzy AI WhatsApp Bot System...\n');

const server = spawn('node', ['server.js'], {
  stdio: 'inherit',
  env: { ...process.env }
});

setTimeout(() => {
  const bot = spawn('node', ['index.js'], {
    stdio: 'inherit',
    env: { ...process.env }
  });

  bot.on('error', (error) => {
    console.error(`❌ Bot error: ${error.message}`);
  });

  bot.on('exit', (code) => {
    if (code !== null && code !== 0) {
      console.log(`⚠️  Bot exited with code ${code}. Restarting in 5 seconds...`);
      setTimeout(() => {
        spawn('node', ['index.js'], { stdio: 'inherit', env: { ...process.env } });
      }, 5000);
    }
  });
}, 2000);

server.on('error', (error) => {
  console.error(`❌ Server error: ${error.message}`);
});

server.on('exit', (code) => {
  if (code !== null && code !== 0) {
    console.error(`❌ Server exited with code ${code}`);
    process.exit(code);
  }
});

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  server.kill();
  process.exit(0);
});
