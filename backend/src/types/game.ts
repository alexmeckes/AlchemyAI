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

export interface DialogueMessage {
  id: string;
  speaker: 'player' | 'npc';
  content: string;
  timestamp: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  requester: string;
  objectives: QuestObjective[];
  reward: string;
  status: 'unopened' | 'pending' | 'active' | 'completed';
  dialogue: DialogueMessage[];
  initialMessage: string;
}

export interface QuestObjective {
  type: 'effect' | 'rarity' | 'ingredient' | 'byproduct';
  description: string;
  target: string | number;
  completed: boolean;
}

export interface DialogueRequest {
  questId: string;
  message: string;
}

export interface DialogueResponse {
  message: string;
  questAccepted?: boolean;
}

export interface OpenMessageRequest {
  questId: string;
}