# Alchemy 4D

A browser-native, language-driven crafting sandbox where words are the only tool you need.

## Overview

Alchemy 4D is a text-based alchemy game where players use natural language incantations to create potions, grow reagents, and participate in a dynamic economy. Powered by Claude for emergent recipe discovery while maintaining deterministic reproducibility.

## Quick Start

1. Clone the repository
2. Install dependencies:
   ```bash
   cd frontend && npm install
   cd ../backend && npm install
   ```
3. Copy `.env.example` to `.env` in the backend directory and add your Anthropic API key
4. Run development servers:
   ```bash
   # From root directory
   npm run dev
   ```
5. Open http://localhost:5173

## Project Structure

- `frontend/` - React + Vite frontend (deploys to Vercel)
- `backend/` - Fastify API server (deploys to Render)
- `CLAUDE.md` - AI development guide and conventions

## Core Features

- **Language = Power**: Natural language commands drive all gameplay
- **Deterministic Recipes**: Once discovered, recipes are forever reproducible
- **Emergent Discovery**: New combinations generate unique results via Claude
- **Production Loops**: Grow and refine reagents in various habitats
- **Dynamic Economy**: Nightly price updates and seasonal regulations

## Tech Stack

- Frontend: React, TypeScript, Vite
- Backend: Fastify, TypeScript, Claude SDK
- Storage: localStorage (MVP), PostgreSQL (future)
- Deployment: Vercel (frontend), Render (backend)

## Development

See `CLAUDE.md` for AI-assisted development guidelines and conventions.

## License

MIT