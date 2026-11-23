export const MAX_TOKENS = 10;
export const VALIDATIONS_FOR_BADGE = 3;

export type RecipeForValidation = {
  validationCount: number;
  validators: string[];
  authorId: string;
};

export function peutValider(recipe: RecipeForValidation, userId: string): boolean {
  // Pas publique si validationCount < 0 (convention)
  if (recipe.validationCount < 0) return false;
  // Pas l'auteur
  if (recipe.authorId === userId) return false;
  // Pas déjà validé par cet user
  if (recipe.validators.includes(userId)) return false;
  return true;
}

export function calculerJetonsApresValidation(currentTokens: number): number {
  return Math.min(currentTokens + 1, MAX_TOKENS);
}

export function estValidee(validationCount: number): boolean {
  return validationCount >= VALIDATIONS_FOR_BADGE;
}

export function peutPartager(recipe: { validatedAt: Date | null }): boolean {
  return recipe.validatedAt !== null;
}