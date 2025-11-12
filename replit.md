# Trizzy AI WhatsApp Bot

## Overview

Trizzy AI is a multi-device WhatsApp bot built with Baileys (Node.js WhatsApp library). The system consists of two main components running concurrently on Replit:

1. **Pairing Server** - A web-based pairing portal that generates pairing codes for WhatsApp authentication
2. **Bot Instance** - The WhatsApp bot that connects to WhatsApp servers and handles message commands

The bot uses pairing code authentication (no QR scanning needed) and automatically starts once pairing is complete.

## Recent Changes (November 2025)

**Migration from Vercel to Replit**:
- Unified launcher system runs both pairing server and bot concurrently
- Shared session management using multi-file auth state (./sessions/default)
- Bot auto-start with valid session detection
- Modern pairing interface similar to industry standards
- Proper session persistence - no more temp file deletion

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Authentication Flow

**Problem**: WhatsApp Multi-Device requires secure authentication to link bot instances without exposing session credentials.

**Solution**: Separated pairing server and bot architecture with webhook-based code delivery.

**Architecture**:
- Frontend pairing site collects phone numbers and generates secure 6-character codes
- Codes are sent to bot backend via webhook with shared secret authentication
- Bot stores active codes and validates them when users send `!pair <code>` commands
- Session credentials are stored in multi-file auth state format using Baileys

**Trade-offs**:
- Pros: Secure separation of concerns, supports multiple deployment platforms, no QR code scanning needed
- Cons: Requires webhook endpoint configuration, additional complexity over simple QR auth

### Bot Command System

**Problem**: Need extensible command handling for various bot features.

**Solution**: Dynamic command loader pattern with module-based command files.

**Implementation**:
- Commands are stored in `/commands` directory as separate modules
- Each command exports `name`, `description`, and `execute(sock, jid, args)` function
- Main bot loads all commands dynamically at startup into a Map for fast lookup
- Commands are triggered by prefix (default: `!`) followed by command name

**Benefits**: Easy to add new commands without modifying core bot logic, clear separation of functionality

### Session Management

**Problem**: Maintain persistent WhatsApp connection across restarts and handle reconnection gracefully.

**Solution**: Multi-file auth state with automatic credential saving.

**Details**:
- Uses `useMultiFileAuthState` to store credentials in `./sessions/default/` directory
- Credentials automatically saved on `creds.update` events
- Bot checks for valid session before starting, waits for pairing if not found
- Supports auto-reconnect on connection drops

### Launcher System

**Problem**: Need to coordinate pairing server and bot instance startup.

**Solution**: Process orchestration via launcher.js

**Flow**:
1. Launcher starts pairing server (server.js) first
2. After 2-second delay, starts bot instance (index.js)
3. Monitors both processes and restarts bot on crashes
4. Handles graceful shutdown on SIGINT

**Benefits**: Single entry point for deployment, automatic recovery from bot crashes

### Message Processing

**Problem**: Handle incoming WhatsApp messages and route to appropriate command handlers.

**Solution**: Event-driven message processing with command parsing.

**Flow**:
1. Bot listens to `messages.upsert` events from Baileys
2. Extracts message text from various message types (conversation, extendedText)
3. Checks for command prefix
4. Looks up command in Map and executes with socket, JID, and arguments
5. Commands send responses directly via Baileys socket

## External Dependencies

### WhatsApp Connection
- **@whiskeysockets/baileys** (v6.5.0) - Primary WhatsApp Web API library
- **maher-zubair-baileys** (v6.6.5) - Extended Baileys fork with additional features
- Uses WebSocket connection to WhatsApp Multi-Device servers
- No official WhatsApp API dependency

### Web Server
- **Express** (v4.18.1) - HTTP server for pairing portal
- **CORS** - Cross-origin resource sharing for frontend/backend communication
- **body-parser** - JSON request parsing

### Session & Authentication
- **Pino** (v8.1.0) - Logging library (configured to silent for production)
- **qrcode** (v1.5.3) - QR code generation (for optional QR auth flow)
- **awesome-phonenumber** (v2.64.0) - Phone number validation and formatting

### External APIs
- **Pastebin API** - Session credential backup/sharing (optional)
- **RSS feeds** - News command fetches from Zimbabwe news sources
- **YouTube/Music APIs** - Music command for song search (ytdl-core, yt-search)

### Deployment Platform
- **Replit** - Unified hosting for both pairing server and bot
- Configured to bind to 0.0.0.0:5000 for Replit compatibility
- All configuration via environment variables for portability

### Storage
- **File System** - Local JSON files for:
  - Active pairing codes (`pair-store.json`, `activePairCodes.json`, `miniPairCodes.json`)
  - Linked device registry (`linked.json`, `mini-linked.json`)
  - Session credentials (`./sessions/default/creds.json`)
- No external database required for basic operation

### Environment Variables
Required configuration:
- `BOT_WEBHOOK` - Webhook URL for pairing code delivery
- `BOT_SHARED_SECRET` - Shared authentication secret
- `PASTEBIN_API_KEY` - Optional Pastebin integration
- `OWNER_JID` - Bot owner WhatsApp ID for notifications
- `PORT` - Server port (default: 5000)