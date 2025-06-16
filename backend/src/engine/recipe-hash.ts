import { createHash } from 'crypto';
import { Material } from '../types/game';

export function generateRecipeHash(materials: Material[], incantation: string): string {
  // Sort materials by name for consistency
  const sortedMaterials = [...materials].sort((a, b) => a.name.localeCompare(b.name));
  
  // Normalize incantation (lowercase, trim)
  const normalizedIncantation = incantation.toLowerCase().trim();
  
  // Create deterministic string representation
  const recipeString = JSON.stringify({
    materials: sortedMaterials,
    incantation: normalizedIncantation
  });
  
  // Generate SHA-256 hash
  return createHash('sha256').update(recipeString).digest('hex');
}