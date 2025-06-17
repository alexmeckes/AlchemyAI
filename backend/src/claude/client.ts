import Anthropic from '@anthropic-ai/sdk';

export class ClaudeClient {
  private client: Anthropic;

  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is required');
    }

    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async generateRecipe(materials: string[], incantation: string) {
    const prompt = this.buildRecipePrompt(materials, incantation);

    const stream = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      temperature: 0.6,
      stream: true,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    return stream;
  }

  async generateDialogue(prompt: string) {
    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 300,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }]
    });

    return response;
  }

  async generateItemDescription(itemName: string, itemType: 'reagent' | 'potion' | 'byproduct', context?: string) {
    const prompt = this.buildDescriptionPrompt(itemName, itemType, context);

    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 200,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }]
    });

    return response;
  }

  async generateLocationResponse(locationId: string, command: string, context: any) {
    const prompt = this.buildLocationPrompt(locationId, command, context);

    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 400,
      temperature: 0.8,
      messages: [{ role: 'user', content: prompt }]
    });

    return response;
  }

  async generateDynamicReagent(locationId: string, context: any) {
    const prompt = this.buildReagentGenerationPrompt(locationId, context);

    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 300,
      temperature: 0.9, // High creativity for unique reagents
      messages: [{ role: 'user', content: prompt }]
    });

    return response;
  }

  private buildRecipePrompt(materials: string[], incantation: string): string {
    return `You are the alchemical engine for Alchemy 4D. Generate a reaction sequence for these materials and incantation.

Materials: ${materials.join(', ')}
Incantation: "${incantation}"

Create a step-by-step reaction in this JSON format with rich descriptions:
{
  "steps": [
    {"type": "heat", "description": "Heat ramp to X°C", "temperature": X},
    {"type": "mix", "description": "Mixing action description"},
    {"type": "transform", "description": "Transformation description"},
    {"type": "byproduct", "description": "By-product created", "item": "item_name", "quantity": X, "itemDescription": "Rich description of the byproduct item"}
  ],
  "result": {
    "name": "Potion Name",
    "rarity": 1-100,
    "effects": ["effect1", "effect2"],
    "description": "Rich, immersive description of the potion's appearance, aroma, texture, and mystical properties"
  }
}

For descriptions:
- Potion descriptions should be vivid and mystical, describing appearance, aroma, texture, and magical properties
- Byproduct descriptions should explain what the item is, its properties, and potential uses
- Make descriptions 1-2 sentences, evocative and immersive
- Consider the materials used and incantation when crafting descriptions

Be creative but consistent. The same materials and incantation should always produce similar results.`;
  }

  private buildDescriptionPrompt(itemName: string, itemType: 'reagent' | 'potion' | 'byproduct', context?: string): string {
    const typeDescriptions = {
      reagent: 'an alchemical reagent or ingredient',
      potion: 'a magical potion',
      byproduct: 'an alchemical byproduct or residue'
    };

    return `Generate a rich, immersive description for ${typeDescriptions[itemType]} called "${itemName}".

${context ? `Context: ${context}` : ''}

The description should be 1-2 sentences and include:
- Physical appearance (color, texture, form)
- Distinctive properties or characteristics
- Mystical or alchemical qualities
- Sensory details (smell, feel, etc.)

Make it evocative and fitting for a magical alchemy game. Return only the description text, no additional formatting.`;
  }

  private buildLocationPrompt(locationId: string, command: string, context: any): string {
    const locationData = {
      crystal_caves: {
        name: "Crystal Caves",
        personality: "ancient, resonant, musical",
        atmosphere: "deep underground caverns filled with singing crystals",
        knownReagents: context.discoveredReagents || [],
        hasUndiscovered: context.undiscoveredCount > 0
      },
      moonlit_grove: {
        name: "Moonlit Grove",
        personality: "ethereal, wise, nurturing",
        atmosphere: "mystical forest clearing bathed in eternal moonlight",
        knownReagents: context.discoveredReagents || [],
        hasUndiscovered: context.undiscoveredCount > 0
      },
      frozen_peaks: {
        name: "Frozen Peaks",
        personality: "harsh, challenging, unforgiving",
        atmosphere: "treacherous mountain heights where ice never melts",
        knownReagents: context.discoveredReagents || [],
        hasUndiscovered: context.undiscoveredCount > 0
      }
    };

    const location = locationData[locationId as keyof typeof locationData];
    if (!location) return "You find yourself in an unknown location.";

    const canGather = context.canGather;
    const timeUntil = context.timeUntilNext;

    return `You are an atmospheric narrator for an alchemical exploration game. The player is exploring the ${location.name}.

LOCATION: ${location.name}
ATMOSPHERE: ${location.atmosphere}
PERSONALITY: ${location.personality}
COMMAND: "${command}"

DISCOVERY SYSTEM:
- Player knows about: ${location.knownReagents.join(', ') || 'no reagents yet'}
- Unknown reagents remain: ${context.undiscoveredCount || 0}
- When describing exploration, you may HINT at unknown reagents without naming them
- Use phrases like "something glints", "a strange scent", "unusual formations"
- Be mysterious about undiscovered elements

GATHERING STATUS:
${canGather ?
        "- Location is ready for gathering" :
        `- Location needs ${timeUntil} before next gathering`}

INSTRUCTIONS:
1. Respond in 2-4 sentences with rich, atmospheric description
2. Match the location's personality (${location.personality})
3. If player uses exploration commands (examine, search, focus), hint at discoveries
4. NEVER directly name unknown reagents - be mysterious and suggestive
5. If they're searching and you hint at something, use words that might relate to unknown reagents
6. Keep responses immersive and encourage further exploration

Respond as the location itself, in first person if appropriate, or as an omniscient narrator.`;
  }

  private buildReagentGenerationPrompt(locationId: string, context: any): string {
    const locationData = {
      crystal_caves: {
        name: "Crystal Caves",
        themes: ["resonance", "harmony", "crystalline", "echo", "vibration", "mineral"],
        environment: "deep underground caverns with singing crystals"
      },
      moonlit_grove: {
        name: "Moonlit Grove",
        themes: ["lunar", "ethereal", "growth", "wisdom", "silver", "mystical"],
        environment: "mystical forest clearing bathed in eternal moonlight"
      },
      frozen_peaks: {
        name: "Frozen Peaks",
        themes: ["ice", "endurance", "purity", "frost", "crystal", "harsh"],
        environment: "treacherous mountain peaks covered in eternal ice"
      }
    };

    const location = locationData[locationId as keyof typeof locationData];
    if (!location) return '';

    return `You are generating a unique alchemical reagent discovered in the ${location.name}.

LOCATION CONTEXT:
- Environment: ${location.environment}
- Themes: ${location.themes.join(', ')}
- Discovery context: ${context.discoveryMethod || 'careful exploration'}

REQUIREMENTS:
1. Create a reagent name using underscore_format (e.g., "whisper_moss", "frost_tear")
2. Choose rarity: common, uncommon, rare, legendary
3. Determine unit type: ml, g, pieces, drops, crystals
4. Set base amount (common: 8-15, uncommon: 5-10, rare: 2-5, legendary: 1-3)
5. Write a mystical 1-2 sentence description

RESPOND IN THIS EXACT FORMAT:
NAME: [reagent_name]
RARITY: [rarity]
AMOUNT: [number]
UNIT: [unit]
DESCRIPTION: [mystical description]

Make it feel authentic to the ${location.name} environment and incorporate the themes: ${location.themes.join(', ')}.`;
  }
}