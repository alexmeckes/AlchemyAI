import { FastifyInstance, FastifyRequest } from 'fastify';
import { ClaudeClient } from '../claude/client';
import { generateRecipeHash } from '../engine/recipe-hash';
import { CraftRequest, Recipe, ReactionStep, PotionResult } from '../types/game';

// In-memory recipe cache for MVP
const recipeCache = new Map<string, Recipe>();

export async function craftRoutes(fastify: FastifyInstance) {
  const claudeClient = new ClaudeClient();

  fastify.post('/api/craft', async (request: FastifyRequest<{ Body: CraftRequest }>, reply) => {
    const { materials, incantation } = request.body;

    // Validate input
    if (!materials || !Array.isArray(materials) || materials.length === 0) {
      return reply.code(400).send({ error: 'Materials are required' });
    }
    if (!incantation || typeof incantation !== 'string') {
      return reply.code(400).send({ error: 'Incantation is required' });
    }

    // Generate recipe hash
    const recipeHash = generateRecipeHash(materials, incantation);

    // Check cache
    const cachedRecipe = recipeCache.get(recipeHash);
    if (cachedRecipe) {
      // Return cached recipe in streaming format
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': request.headers.origin || '*',
        'Access-Control-Allow-Credentials': 'true',
      });

      reply.raw.write(`data: ${JSON.stringify({ type: 'complete', recipe: cachedRecipe, cached: true })}\n\n`);
      reply.raw.end();
      return;
    }

    try {
      // Generate new recipe with Claude
      const stream = await claudeClient.generateRecipe(
        materials.map(m => `${m.quantity}${m.unit} ${m.name}`),
        incantation
      );

      // Set up SSE headers
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': request.headers.origin || '*',
        'Access-Control-Allow-Credentials': 'true',
      });

      let fullResponse = '';

      // Stream the response
      for await (const messageStreamEvent of stream) {
        if (messageStreamEvent.type === 'content_block_delta' && 'text' in messageStreamEvent.delta) {
          const chunk = messageStreamEvent.delta.text;
          fullResponse += chunk;

          // Send chunk to client
          reply.raw.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
        }
      }

      // Parse the complete response
      try {
        // Extract JSON from the response
        const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }

        const recipeData = JSON.parse(jsonMatch[0]);

        // Create recipe object
        const recipe: Recipe = {
          hash: recipeHash,
          materials,
          incantation,
          steps: recipeData.steps,
          result: recipeData.result,
          timestamp: new Date().toISOString()
        };

        // Cache the recipe
        recipeCache.set(recipeHash, recipe);

        // Send final recipe
        reply.raw.write(`data: ${JSON.stringify({ type: 'complete', recipe, cached: false })}\n\n`);
      } catch (parseError) {
        reply.raw.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to parse recipe' })}\n\n`);
      }

      reply.raw.end();
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to generate recipe' });
    }
  });

  // Get cached recipes (for debugging)
  fastify.get('/api/recipes', async () => {
    return Array.from(recipeCache.values());
  });
}