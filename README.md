# Trigr — The AI that shops the second you ask.

Trigr is a modern, AI-powered commerce agent that takes natural language queries (voice or text), searches real Shopify stores in parallel using MCP (Model Context Protocol), and lets you purchase instantly with a Prava mandate.

This project was recently upgraded to feature a premium, award-winning 3D UI, LangChain agents powered by Gemini 2.0 Flash, and persistent SQLite storage.

## Features

- **Gemini Live-Style Voice Bar**: Talk naturally using the Web Speech API. The AI agent processes your voice, searches, and speaks back its recommendation.
- **Procedural 3D Crystal Hero**: Built with React Three Fiber (`@react-three/fiber`), `drei`, and postprocessing effects (bloom, chromatic aberration). The crystal cluster smoothly rotates and tracks your cursor.
- **Interactive 3D Product Cards**: Search results are presented on glassmorphic cards that utilize 3D CSS perspective to dynamically tilt toward your cursor.
- **Real Shopify MCP Integration**: No more mocked data. The LangChain agent (`searchProductsTool`) connects to live Shopify storefronts (boAt, Nobero, Minimalist, etc.) via JSON-RPC 2.0.
- **SQLite Database**: Searches, product caching, and purchase logs are stored efficiently in a local `trigr.db` using `better-sqlite3`.
- **Cinematic Purchase Animation**: Instantly buy the AI's top pick, triggering a full-screen GSAP animation overlay with particles.
- **Buttery Smooth UX**: Features Lenis smooth scrolling, GSAP stagger animations, and custom cursors for a high-end feel.

## Tech Stack

- **Frontend**: React 18, Vite, Three.js (`@react-three/fiber` v8, `drei` v9), GSAP, Lenis, Vanilla CSS.
- **Backend**: Node.js, Express, LangChain (`@langchain/google-genai`), `better-sqlite3`.
- **AI Model**: Google Gemini 2.0 Flash.

## Run it locally

We use `bun` (or `npm`) to manage dependencies. Requires Node 22+ / Bun.

```bash
# 1. Backend
cd backend
bun install
# Ensure you have your Gemini API key in backend/.env
# GEMINI_API_KEY="AIzaSy..."
bun run dev        # http://localhost:4000

# 2. Frontend (new terminal)
cd frontend
bun install
bun run dev         # http://localhost:5173
```

Open `http://localhost:5173`. The Vite dev server proxies `/api/*` to the Express backend automatically.

## Project Structure

```
trigr/
  backend/
    server.js               # Express entry point
    agent/
      trigrAgent.js         # LangChain Agent logic & fallback
      mcpTools.js           # Real Shopify MCP JSON-RPC endpoints
    db/
      schema.js             # SQLite init & table definitions
    routes/
      agent.js              # /api/agent/* endpoints
  frontend/
    src/App.jsx             # Page assembly & Lenis setup
    src/components/         # 3D Scene, VoiceBar, ProductCards, Animations
    src/styles.css          # Design tokens + premium styling
    src/api.js              # Fetch wrapper
```

## How the AI & MCP Works

When you ask Trigr for a product:
1. The frontend hits `POST /api/agent/search`.
2. The `trigrAgent` uses **Gemini 2.0 Flash** to understand the intent.
3. It triggers `searchProductsTool`, which fires parallel JSON-RPC `tools/call` POST requests to the MCP endpoints of real Shopify merchants.
4. The results are cached in SQLite and fed back to Gemini.
5. Gemini analyzes the payload, picks the best recommendation, and writes a natural `voiceResponse`.
6. The frontend renders the 3D product cards and speaks the AI's response aloud.

## Upcoming Roadmap
- Replace the simulated Prava purchase animation with actual API calls to create and charge real Prava mandates.
- Expand the MCP store list to support hundreds of independent merchants dynamically.
