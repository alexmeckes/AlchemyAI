export interface Material {
  name: string;
  quantity: number;
  unit: string;
}

export interface ReactionStep {
  type: 'heat' | 'mix' | 'transform' | 'byproduct';
  description: string;
  temperature?: number;
  item?: string;
  quantity?: number;
}

export interface PotionResult {
  name: string;
  rarity: number;
  effects: string[];
}

export interface Recipe {
  hash: string;
  materials: Material[];
  incantation: string;
  steps: ReactionStep[];
  result: PotionResult;
  timestamp: string;
}

export interface CraftRequest {
  materials: Material[];
  incantation: string;
}

export interface CraftResponse {
  recipe: Recipe;
  cached: boolean;
}