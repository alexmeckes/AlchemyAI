# Alchemy 4D AI Development Guide

## Project Overview

Alchemy 4D is a browser-based alchemy game where natural language creates potions through a deterministic chemistry engine powered by Claude for emergent discovery.

## Architecture Summary

- **Frontend**: React + TypeScript + Vite ’ Vercel
- **Backend**: Fastify + TypeScript ’ Render  
- **Storage**: localStorage (MVP), future PostgreSQL
- **Game Engine**: Deterministic simulation with Claude for new recipes

## Key Conventions

### Code Style
- TypeScript strict mode everywhere
- Functional React components only
- Explicit types for all game data structures
- Error boundaries for all external API calls

### Game Logic
- Recipe hashing: `SHA-256(sortedMaterials + normalizedIncantation)`
- Deterministic simulation: All randomness from seeded PRNG
- Claude integration: T=0.6 for emergence, T=0 for analysis
- Streaming responses for better UX

### File Organization
```
frontend/src/
  components/   # UI components
  lib/         # Game logic, API client
  types/       # Shared TypeScript types
  
backend/src/
  routes/      # API endpoints
  claude/      # Claude SDK integration
  engine/      # Deterministic simulation
```

## Common Commands

```bash
# Development
npm run dev          # Start both frontend and backend
npm run dev:frontend # Frontend only (port 5173)
npm run dev:backend  # Backend only (port 3001)

# Quality checks
npm run typecheck    # Type checking
npm run test         # Run tests
npm run lint         # Linting

# Deployment
git push main        # Auto-deploys to Vercel/Render
```

## Current Sprint Focus

**Sprint 0 (48h MVP)**
- [ ] Text-only client interface
- [ ] Basic /craft endpoint
- [ ] 3 reagents: cobalt_echo, lunar_sap, snow_ash
- [ ] 3 verbs: distil, bind, quench
- [ ] localStorage for inventory
- [ ] In-memory recipe cache

## API Endpoints

```typescript
POST /api/craft
{
  materials: Array<{name: string, quantity: number, unit: string}>,
  incantation: string
}
’ Stream<ReactionStep>

GET /api/inventory
’ {reagents: Record<string, number>, potions: Array<Potion>}

POST /api/inventory/update
{reagents: Record<string, number>}
```

## Game Data Structures

```typescript
interface Recipe {
  hash: string;
  materials: Material[];
  incantation: string;
  reactionGraph: ReactionGraph;
  seed: string;
}

interface ReactionStep {
  type: 'heat' | 'mix' | 'transform' | 'byproduct';
  description: string;
  temperature?: number;
  instability?: number;
}

interface Potion {
  name: string;
  rarity: number;
  effects: string[];
  recipeHash: string;
}
```

## Claude Integration Notes

1. **Recipe Discovery**: When recipe not in cache, call Claude with materials + incantation
2. **Streaming**: Use stream=true for real-time reaction visualization
3. **Caching**: Store successful recipes to avoid repeated API calls
4. **Error Handling**: Graceful fallbacks for API failures

## Testing Strategy

- Unit tests for deterministic engine
- Integration tests for API endpoints
- Recipe reproducibility tests
- Manual testing for game feel

## Environment Variables

Backend (.env):
- `ANTHROPIC_API_KEY` - Claude API key
- `PORT` - Server port (default 3001)
- `ALLOWED_ORIGINS` - CORS whitelist
- `NODE_ENV` - development/production

Frontend (.env.local):
- `VITE_API_URL` - Backend URL

## Debugging Tips

1. Check browser DevTools Network tab for API calls
2. Backend logs all Claude interactions
3. Use `localStorage.clear()` to reset game state
4. Recipe hashes are deterministic - same inputs = same hash

## Future Considerations

- WebSocket for real-time updates
- Redis for production recipe cache
- Reagent production system (habitats)
- Multiplayer brewing sessions
- WebGL visualization layer