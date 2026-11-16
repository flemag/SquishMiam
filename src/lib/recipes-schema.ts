import { z } from "zod";

export const ingredientInput = z.object({
  nom: z.string().trim().min(1),
  quantite: z.number().positive().optional(),
  unite: z.string().trim().optional(),
});

export const recipeInput = z.object({
  title: z.string().trim().min(1),
  servings: z.number().int().min(1).max(12),
  minutes: z.number().int().positive().optional(),
  tags: z.array(z.string().trim()).default([]),
  ingredients: z.array(ingredientInput).min(1),
  steps: z.array(z.string().trim()).default([]),
});

export type RecipeInput = z.infer<typeof recipeInput>;
export type IngredientInput = z.infer<typeof ingredientInput>;
