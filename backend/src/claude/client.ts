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
      max_tokens: 1000,
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

  private buildRecipePrompt(materials: string[], incantation: string): string {
    return `You are the alchemical engine for Alchemy 4D. Generate a reaction sequence for these materials and incantation.

Materials: ${materials.join(', ')}
Incantation: "${incantation}"

Create a step-by-step reaction in this JSON format:
{
  "steps": [
    {"type": "heat", "description": "Heat ramp to X°C", "temperature": X},
    {"type": "mix", "description": "Mixing action description"},
    {"type": "transform", "description": "Transformation description"},
    {"type": "byproduct", "description": "By-product created", "item": "item_name", "quantity": X}
  ],
  "result": {
    "name": "Potion Name",
    "rarity": 1-100,
    "effects": ["effect1", "effect2"]
  }
}

Be creative but consistent. The same materials and incantation should always produce similar results.`;
  }
}