export interface IngredientAttributes {
    luminescence: number;    // 0-5: How much light/glow it produces
    cooling: number;         // 0-5: Temperature reduction effect
    volatility: number;      // 0-5: Instability/chaos potential
    viscosity: number;       // 0-5: Thickness/binding strength
    heat_capacity: number;   // 0-5: Heat absorption/retention
    toxicity: number;        // 0-5: Dangerous/harmful effects
}

export interface Ingredient {
    id: string;
    name: string;
    description: string;
    attributes: IngredientAttributes;
    tags: string[];
    rarity: number; // 1-5
    color: string; // CSS color for visual theming
}

// Ingredient database
export const INGREDIENTS: Record<string, Ingredient> = {
    cobalt_echo: {
        id: 'cobalt_echo',
        name: 'Cobalt Echo',
        description: 'Resonant crystal that amplifies magical frequencies',
        attributes: {
            luminescence: 4,
            cooling: 1,
            volatility: 2,
            viscosity: 0,
            heat_capacity: 3,
            toxicity: 1
        },
        tags: ['crystal', 'resonant', 'amplifier'],
        rarity: 3,
        color: '#3b82f6'
    },
    lunar_sap: {
        id: 'lunar_sap',
        name: 'Lunar Sap',
        description: 'Ethereal liquid that flows only under moonlight',
        attributes: {
            luminescence: 3,
            cooling: 4,
            volatility: 1,
            viscosity: 4,
            heat_capacity: 2,
            toxicity: 0
        },
        tags: ['liquid', 'ethereal', 'binding'],
        rarity: 4,
        color: '#a855f7'
    },
    snow_ash: {
        id: 'snow_ash',
        name: 'Snow Ash',
        description: 'Paradoxical powder that burns cold and freezes hot',
        attributes: {
            luminescence: 1,
            cooling: 5,
            volatility: 3,
            viscosity: 0,
            heat_capacity: 1,
            toxicity: 2
        },
        tags: ['powder', 'paradoxical', 'coolant'],
        rarity: 2,
        color: '#06b6d4'
    },
    dragon_scale: {
        id: 'dragon_scale',
        name: 'Dragon Scale',
        description: 'Ancient scale that radiates primal fire energy',
        attributes: {
            luminescence: 2,
            cooling: 0,
            volatility: 4,
            viscosity: 1,
            heat_capacity: 5,
            toxicity: 3
        },
        tags: ['scale', 'fire', 'primal'],
        rarity: 5,
        color: '#dc2626'
    },
    moon_glass: {
        id: 'moon_glass',
        name: 'Moon Glass',
        description: 'Translucent crystal that captures and reflects moonbeams',
        attributes: {
            luminescence: 5,
            cooling: 2,
            volatility: 0,
            viscosity: 0,
            heat_capacity: 2,
            toxicity: 0
        },
        tags: ['crystal', 'light', 'pure'],
        rarity: 4,
        color: '#e5e7eb'
    },
    void_crystal: {
        id: 'void_crystal',
        name: 'Void Crystal',
        description: 'Dark crystal that absorbs light and magic equally',
        attributes: {
            luminescence: 0,
            cooling: 3,
            volatility: 5,
            viscosity: 2,
            heat_capacity: 4,
            toxicity: 4
        },
        tags: ['crystal', 'void', 'absorber'],
        rarity: 5,
        color: '#1f2937'
    },
    phoenix_feather: {
        id: 'phoenix_feather',
        name: 'Phoenix Feather',
        description: 'Eternally burning feather that never turns to ash',
        attributes: {
            luminescence: 4,
            cooling: 0,
            volatility: 3,
            viscosity: 1,
            heat_capacity: 5,
            toxicity: 1
        },
        tags: ['feather', 'fire', 'eternal'],
        rarity: 5,
        color: '#f59e0b'
    },
    shadow_moss: {
        id: 'shadow_moss',
        name: 'Shadow Moss',
        description: 'Living moss that thrives in darkness and dampens magic',
        attributes: {
            luminescence: 0,
            cooling: 3,
            volatility: 1,
            viscosity: 3,
            heat_capacity: 2,
            toxicity: 2
        },
        tags: ['moss', 'shadow', 'dampener'],
        rarity: 2,
        color: '#374151'
    }
}; 