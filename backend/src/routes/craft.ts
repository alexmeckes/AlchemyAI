import { FastifyInstance, FastifyRequest } from 'fastify';
import { ClaudeClient } from '../claude/client';
import { generateRecipeHash } from '../engine/recipe-hash';
import { CraftRequest, Recipe, ReactionStep, PotionResult, Quest, QuestObjective, DialogueRequest, DialogueResponse, DialogueMessage, OpenMessageRequest } from '../types/game';

// In-memory recipe cache for MVP
const recipeCache = new Map<string, Recipe>();

// Initial quest for new players - now starts as unopened
const STARTER_QUEST: Quest = {
  id: 'starter_warming_elixir',
  title: 'Sealed Message from Master Aldric',
  description: 'You have received a sealed message. Click to open and read it.',
  requester: 'Master Aldric',
  objectives: [
    {
      type: 'effect',
      description: 'Create a potion with warming or temperature-related effects',
      target: 'warmth|heat|temperature|fire|thermal',
      completed: false
    }
  ],
  reward: '3x rare_ember_dust + Advanced Brewing Techniques',
  status: 'unopened',
  dialogue: [],
  initialMessage: 'Greetings, young alchemist! I am Master Aldric, keeper of the ancient arts. The village faces a harsh winter approaching, and our people desperately need warming potions to survive the bitter cold. The children are especially vulnerable. Would you be willing to help us in our time of need? I can guide you through the process if you accept this quest.'
};

// Simple quest storage (in-memory for MVP)
const activeQuests = new Map<string, Quest>();
activeQuests.set(STARTER_QUEST.id, STARTER_QUEST);

function checkQuestCompletion(recipe: Recipe): Quest[] {
  const completedQuests: Quest[] = [];

  for (const [questId, quest] of activeQuests.entries()) {
    if (quest.status !== 'active') continue;

    let allObjectivesComplete = true;

    for (const objective of quest.objectives) {
      if (objective.completed) continue;

      switch (objective.type) {
        case 'effect':
          const effectPattern = new RegExp(objective.target as string, 'i');
          const hasMatchingEffect = recipe.result.effects.some(effect =>
            effectPattern.test(effect)
          );
          if (hasMatchingEffect) {
            objective.completed = true;
          } else {
            allObjectivesComplete = false;
          }
          break;

        case 'rarity':
          if (recipe.result.rarity >= (objective.target as number)) {
            objective.completed = true;
          } else {
            allObjectivesComplete = false;
          }
          break;

        default:
          allObjectivesComplete = false;
      }
    }

    if (allObjectivesComplete) {
      quest.status = 'completed';
      completedQuests.push(quest);
    }
  }

  return completedQuests;
}

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
      // Check quest completion even for cached recipes
      const completedQuests = checkQuestCompletion(cachedRecipe);

      // Return cached recipe in streaming format
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': request.headers.origin || '*',
        'Access-Control-Allow-Credentials': 'true',
      });

      reply.raw.write(`data: ${JSON.stringify({
        type: 'complete',
        recipe: cachedRecipe,
        cached: true,
        completedQuests
      })}\n\n`);
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

        // Check quest completion
        const completedQuests = checkQuestCompletion(recipe);

        // Send final recipe
        reply.raw.write(`data: ${JSON.stringify({
          type: 'complete',
          recipe,
          cached: false,
          completedQuests
        })}\n\n`);
      } catch (parseError) {
        reply.raw.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to parse recipe' })}\n\n`);
      }

      reply.raw.end();
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to generate recipe' });
    }
  });

  // Open a sealed message with streaming text effect
  fastify.post('/api/open-message', async (request: FastifyRequest<{ Body: OpenMessageRequest }>, reply) => {
    const { questId } = request.body;

    if (!questId) {
      return reply.code(400).send({ error: 'Quest ID is required' });
    }

    const quest = activeQuests.get(questId);
    if (!quest) {
      return reply.code(404).send({ error: 'Quest not found' });
    }

    if (quest.status !== 'unopened') {
      return reply.code(400).send({ error: 'Message already opened' });
    }

    // Update quest status to pending
    quest.status = 'pending';
    quest.title = 'A Message from Master Aldric';
    quest.description = 'Master Aldric has sent you a message. Read it and respond to begin your alchemical journey.';

    // Set up SSE headers for streaming the message
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': request.headers.origin || '*',
      'Access-Control-Allow-Credentials': 'true',
    });

    // Stream the message character by character
    const message = quest.initialMessage;
    let currentText = '';

    for (let i = 0; i < message.length; i++) {
      currentText += message[i];

      // Send current text
      reply.raw.write(`data: ${JSON.stringify({
        type: 'typing',
        content: currentText,
        complete: i === message.length - 1
      })}\n\n`);

      // Wait between characters (faster for spaces, slower for punctuation)
      const char = message[i];
      let delay = 8; // Base delay - much faster
      if (char === ' ') delay = 4;
      if (char === '.' || char === '!' || char === '?') delay = 50;
      if (char === ',') delay = 25;

      await new Promise(resolve => setTimeout(resolve, delay));
    }

    reply.raw.end();
  });

  // Handle quest dialogue
  fastify.post('/api/dialogue', async (request: FastifyRequest<{ Body: DialogueRequest }>, reply) => {
    const { questId, message } = request.body;

    if (!questId || !message) {
      return reply.code(400).send({ error: 'Quest ID and message are required' });
    }

    const quest = activeQuests.get(questId);
    if (!quest) {
      return reply.code(404).send({ error: 'Quest not found' });
    }

    try {
      // Add player message to dialogue history
      const playerMessage: DialogueMessage = {
        id: `player_${Date.now()}`,
        speaker: 'player',
        content: message,
        timestamp: new Date().toISOString()
      };
      quest.dialogue.push(playerMessage);

      // Build context for Claude
      const dialogueHistory = quest.dialogue.map(msg =>
        `${msg.speaker === 'player' ? 'Player' : 'Master Aldric'}: ${msg.content}`
      ).join('\n');

      const prompt = `You are Master Aldric, an experienced alchemist master in a fantasy village. You are speaking with a young apprentice alchemist.

PERSONALITY TRAITS:
- Slightly gruff but caring underneath
- Has strong opinions about proper alchemy techniques
- Gets a bit impatient with overly cautious apprentices
- Occasionally mutters about "young folks these days"
- Proud of his knowledge but not arrogant
- Has a dry sense of humor
- Sometimes complains about his old bones or the weather
- Has been known to "test" his own alchemical brews a bit too enthusiastically
- Occasionally needs remedies for "morning clarity" and "head pounding"
- Might accidentally let slip that he's looking for hangover cures rather than warming potions
- Gets defensive when questioned about his drinking habits

QUEST CONTEXT:
- The village needs warming potions for the approaching winter (or so he claims...)
- You want the apprentice to create a potion with warming/temperature effects
- You can provide hints about using materials like cobalt_echo (resonant/metallic), lunar_sap (mystical/fluid), snow_ash (cold/powdery)
- You can suggest incantation words related to heat, warmth, temperature
- You might accidentally mention needing something for "the morning after" or "clearing the fog from one's head"

CONVERSATION HISTORY:
Initial message: ${quest.initialMessage}
${dialogueHistory}

INSTRUCTIONS:
- Stay in character as Master Aldric with his personality quirks
- ONLY use [QUEST_ACCEPTED] if the player explicitly says "yes", "I accept", "I'll help", or similar clear acceptance
- Answer questions, provide hints, and engage in conversation normally
- If they ask for hints, provide guidance but maybe grumble a bit about having to explain basics
- If they seem hesitant, show some impatience but still care about the village
- Keep responses SHORT and conversational - 1-2 sentences maximum
- Show personality through word choice and attitude
- Be concise and to the point

Respond as Master Aldric:`;

      const response = await claudeClient.generateDialogue(prompt);

      let npcResponse = '';
      if ('content' in response && Array.isArray(response.content)) {
        for (const block of response.content) {
          if (block.type === 'text') {
            npcResponse += block.text;
          }
        }
      }

      // Check if quest was accepted
      const questAccepted = npcResponse.includes('[QUEST_ACCEPTED]');
      const cleanResponse = npcResponse.replace('[QUEST_ACCEPTED]', '').trim();

      // Add NPC response to dialogue history
      const npcMessage: DialogueMessage = {
        id: `npc_${Date.now()}`,
        speaker: 'npc',
        content: cleanResponse,
        timestamp: new Date().toISOString()
      };
      quest.dialogue.push(npcMessage);

      // Update quest status if accepted
      if (questAccepted && quest.status === 'pending') {
        quest.status = 'active';
        quest.title = 'The Village Needs Warmth';
        quest.description = 'Create a warming potion to help the village survive the harsh winter. Master Aldric is counting on you!';
      }

      return reply.send({
        message: cleanResponse,
        questAccepted
      } as DialogueResponse);

    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to generate dialogue response' });
    }
  });

  // Get active quests
  fastify.get('/api/quests', async () => {
    return Array.from(activeQuests.values());
  });

  // Get cached recipes (for debugging)
  fastify.get('/api/recipes', async () => {
    return Array.from(recipeCache.values());
  });
}