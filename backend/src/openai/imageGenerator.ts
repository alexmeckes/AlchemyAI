import OpenAI from 'openai';
import { PotionResult } from '../types/game.js';

export class ImageGenerator {
    private openai: OpenAI | null = null;

    private getOpenAI(): OpenAI {
        if (!this.openai) {
            this.openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });
        }
        return this.openai;
    }
    async generatePotionIcon(potion: PotionResult): Promise<string | null> {
        try {
            // Create a detailed prompt for the potion icon
            const prompt = this.createPotionPrompt(potion);

            console.log(`Generating image for potion: ${potion.name}`);
            console.log(`Prompt: ${prompt}`);

            const response = await this.getOpenAI().images.generate({
                model: "dall-e-3",
                prompt: prompt,
                n: 1,
                size: "1024x1024",
                quality: "standard",
                style: "vivid"
            });

            const imageUrl = response.data?.[0]?.url;

            if (imageUrl) {
                console.log(`Successfully generated image for ${potion.name}: ${imageUrl}`);
                return imageUrl;
            } else {
                console.error(`No image URL returned for ${potion.name}`);
                return null;
            }
        } catch (error) {
            console.error(`Error generating image for ${potion.name}:`, error);
            return null;
        }
    }

    private createPotionPrompt(potion: PotionResult): string {
        // Extract color and visual cues from potion name and effects
        const name = potion.name.toLowerCase();
        const effects = potion.effects.join(', ').toLowerCase();
        const description = potion.description?.toLowerCase() || '';

        // Determine potion color based on effects and name
        let colorHint = '';
        if (name.includes('fire') || effects.includes('burn') || effects.includes('heat')) {
            colorHint = 'glowing red-orange';
        } else if (name.includes('ice') || name.includes('frost') || effects.includes('cold')) {
            colorHint = 'icy blue';
        } else if (name.includes('poison') || effects.includes('toxic')) {
            colorHint = 'sickly green';
        } else if (name.includes('heal') || effects.includes('heal') || effects.includes('restore')) {
            colorHint = 'warm golden';
        } else if (name.includes('shadow') || name.includes('dark') || effects.includes('stealth')) {
            colorHint = 'deep purple-black';
        } else if (name.includes('light') || name.includes('holy') || effects.includes('divine')) {
            colorHint = 'bright white-gold';
        } else if (name.includes('nature') || name.includes('earth') || effects.includes('growth')) {
            colorHint = 'vibrant green';
        } else if (name.includes('mind') || name.includes('mental') || effects.includes('clarity')) {
            colorHint = 'shimmering blue-purple';
        } else {
            // Default mystical colors based on rarity
            if (potion.rarity >= 4) {
                colorHint = 'iridescent rainbow';
            } else if (potion.rarity >= 3) {
                colorHint = 'deep mystical purple';
            } else {
                colorHint = 'magical blue';
            }
        }

        // Determine bottle style based on rarity
        let bottleStyle = '';
        if (potion.rarity >= 4) {
            bottleStyle = 'ornate crystal vial with gold filigree';
        } else if (potion.rarity >= 3) {
            bottleStyle = 'elegant glass bottle with silver accents';
        } else if (potion.rarity >= 2) {
            bottleStyle = 'decorative glass flask';
        } else {
            bottleStyle = 'simple round glass bottle';
        }

        // Add magical effects based on rarity
        let magicalEffects = '';
        if (potion.rarity >= 4) {
            magicalEffects = ', swirling magical aura, floating sparkles, ethereal glow';
        } else if (potion.rarity >= 3) {
            magicalEffects = ', glowing magical particles, soft mystical light';
        } else if (potion.rarity >= 2) {
            magicalEffects = ', gentle magical shimmer';
        } else {
            magicalEffects = ', subtle magical glow';
        }

        const prompt = `A fantasy potion icon in pixel art style: ${bottleStyle} filled with ${colorHint} liquid, cork stopper, ${magicalEffects}. Clear white background, 16-bit pixel art style, retro game aesthetic, professional game asset. The potion represents "${potion.name}" with effects: ${effects}. High quality pixel art, centered composition, perfect for a game inventory. DO NOT INCLUDE ANY TEXT, LETTERS, WORDS, OR LABELS IN THE IMAGE. Pure white background only.`;

        return prompt;
    }
}

// Export the class, not an instance
export default ImageGenerator; 