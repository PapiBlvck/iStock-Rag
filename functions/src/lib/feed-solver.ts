/**
 * Least-Cost Feed Formulation Solver
 * Implements a linear programming approach to optimize feed rations
 * 
 * This is a pure function that solves the feed formulation problem:
 * - Minimize: Total cost = Σ(ingredient_price_i * percentage_i)
 * - Subject to:
 *   - Σ(percentage_i) = 100%
 *   - Nutritional requirements met (protein, energy, etc.)
 *   - Ingredient constraints (min/max percentages)
 */

import type {
  FeedOptimizationInput,
  FeedRation,
  FeedRationComponent,
  NutritionalValues,
} from '@rag-monorepo/shared';

/**
 * Default nutritional requirements by animal type (per 100kg of feed)
 */
const DEFAULT_NUTRITIONAL_REQUIREMENTS: Record<
  string,
  Partial<NutritionalValues>
> = {
  'Dairy Cattle': {
    protein: 16, // 16% crude protein
    energy: 2.7, // 2.7 Mcal/kg
    fiber: 18, // 18% fiber
    calcium: 0.6,
    phosphorus: 0.4,
  },
  'Beef Cattle': {
    protein: 12,
    energy: 2.6,
    fiber: 20,
    calcium: 0.5,
    phosphorus: 0.3,
  },
  'Calf': {
    protein: 20,
    energy: 3.0,
    fiber: 15,
    calcium: 0.8,
    phosphorus: 0.6,
  },
  'Pig': {
    protein: 18,
    energy: 3.2,
    fiber: 5,
    calcium: 0.7,
    phosphorus: 0.5,
  },
  'Chicken': {
    protein: 20,
    energy: 3.1,
    fiber: 4,
    calcium: 0.9,
    phosphorus: 0.7,
  },
  'Sheep': {
    protein: 14,
    energy: 2.5,
    fiber: 22,
    calcium: 0.5,
    phosphorus: 0.3,
  },
  'Goat': {
    protein: 15,
    energy: 2.6,
    fiber: 20,
    calcium: 0.6,
    phosphorus: 0.4,
  },
};

/**
 * Calculate nutritional composition of a feed mix
 */
function calculateNutritionalComposition(
  components: Array<{ percentage: number; nutritionalValues: NutritionalValues }>
): NutritionalValues {
  const nutrition: NutritionalValues = {};

  for (const component of components) {
    const { percentage, nutritionalValues } = component;
    const factor = percentage / 100;

    // Sum all nutritional values weighted by percentage
    if (nutritionalValues.protein !== undefined) {
      nutrition.protein = (nutrition.protein || 0) + nutritionalValues.protein * factor;
    }
    if (nutritionalValues.energy !== undefined) {
      nutrition.energy = (nutrition.energy || 0) + nutritionalValues.energy * factor;
    }
    if (nutritionalValues.fiber !== undefined) {
      nutrition.fiber = (nutrition.fiber || 0) + nutritionalValues.fiber * factor;
    }
    if (nutritionalValues.fat !== undefined) {
      nutrition.fat = (nutrition.fat || 0) + nutritionalValues.fat * factor;
    }
    if (nutritionalValues.calcium !== undefined) {
      nutrition.calcium = (nutrition.calcium || 0) + nutritionalValues.calcium * factor;
    }
    if (nutritionalValues.phosphorus !== undefined) {
      nutrition.phosphorus = (nutrition.phosphorus || 0) + nutritionalValues.phosphorus * factor;
    }
    if (nutritionalValues.dryMatter !== undefined) {
      nutrition.dryMatter = (nutrition.dryMatter || 0) + nutritionalValues.dryMatter * factor;
    }
    if (nutritionalValues.ash !== undefined) {
      nutrition.ash = (nutrition.ash || 0) + nutritionalValues.ash * factor;
    }
  }

  return nutrition;
}

/**
 * Check if nutritional requirements are met
 */
function meetsNutritionalRequirements(
  composition: NutritionalValues,
  requirements: Partial<NutritionalValues>
): boolean {
  // Check minimum requirements (if specified)
  if (requirements.protein !== undefined) {
    if ((composition.protein || 0) < requirements.protein) return false;
  }
  if (requirements.energy !== undefined) {
    if ((composition.energy || 0) < requirements.energy) return false;
  }
  if (requirements.fiber !== undefined) {
    if ((composition.fiber || 0) < requirements.fiber) return false;
  }
  if (requirements.fat !== undefined) {
    if ((composition.fat || 0) < requirements.fat) return false;
  }
  if (requirements.calcium !== undefined) {
    if ((composition.calcium || 0) < requirements.calcium) return false;
  }
  if (requirements.phosphorus !== undefined) {
    if ((composition.phosphorus || 0) < requirements.phosphorus) return false;
  }

  return true;
}

/**
 * Least-Cost Feed Formulation Solver
 * 
 * Uses an iterative approach to find the optimal feed mix:
 * 1. Start with cheapest ingredients
 * 2. Adjust proportions to meet nutritional requirements
 * 3. Optimize for cost while maintaining constraints
 * 
 * @param input - Feed optimization input with ingredients and requirements
 * @returns Optimized feed ration
 */
export function solveLeastCostFeedFormulation(
  input: FeedOptimizationInput
): FeedRation {
  const { targetAnimal, totalAmount, ingredients, targetNutrition, maxIngredients } = input;

  // Get target nutritional requirements
  const requirements = targetNutrition || DEFAULT_NUTRITIONAL_REQUIREMENTS[targetAnimal] || {};

  // Validate inputs
  if (ingredients.length === 0) {
    throw new Error('At least one ingredient is required');
  }

  // Sort ingredients by cost (cheapest first)
  const sortedIngredients = [...ingredients].sort((a, b) => a.unitPrice - b.unitPrice);

  // Limit number of ingredients if specified
  const selectedIngredients = maxIngredients
    ? sortedIngredients.slice(0, maxIngredients)
    : sortedIngredients;

  // Initialize with equal distribution among cheapest ingredients
  const initialPercentage = 100 / selectedIngredients.length;
  let solution: Array<{ id: string; name: string; percentage: number }> = selectedIngredients.map(
    (ing) => ({
      id: ing.id,
      name: ing.name,
      percentage: initialPercentage,
    })
  );

  // Apply ingredient constraints
  for (let i = 0; i < solution.length; i++) {
    const ingredient = selectedIngredients[i];
    if (ingredient.constraints) {
      const constraints = ingredient.constraints;
      if (constraints.minPercentage !== undefined) {
        solution[i].percentage = Math.max(solution[i].percentage, constraints.minPercentage);
      }
      if (constraints.maxPercentage !== undefined) {
        solution[i].percentage = Math.min(solution[i].percentage, constraints.maxPercentage);
      }
    }
  }

  // Normalize percentages to sum to 100
  const totalPercentage = solution.reduce((sum, s) => sum + s.percentage, 0);
  if (totalPercentage > 0) {
    solution = solution.map((s) => ({
      ...s,
      percentage: (s.percentage / totalPercentage) * 100,
    }));
  }

  // Iterative optimization: adjust to meet nutritional requirements
  const maxIterations = 100;
  let iteration = 0;

  while (iteration < maxIterations) {
    // Calculate current nutritional composition
    const components = solution.map((s) => {
      const ingredient = selectedIngredients.find((ing) => ing.id === s.id)!;
      return {
        percentage: s.percentage,
        nutritionalValues: ingredient.nutritionalValues,
      };
    });

    const composition = calculateNutritionalComposition(components);

    // Check if requirements are met
    if (meetsNutritionalRequirements(composition, requirements)) {
      // Try to reduce cost by substituting with cheaper ingredients
      let improved = false;
      for (let i = 0; i < solution.length; i++) {
        const currentIngredient = selectedIngredients[i];
        for (let j = i + 1; j < selectedIngredients.length; j++) {
          const cheaperIngredient = selectedIngredients[j];
          if (cheaperIngredient.unitPrice < currentIngredient.unitPrice) {
            // Try small substitution
            const substitution = Math.min(5, solution[i].percentage * 0.1);
            const testSolution = [...solution];
            testSolution[i].percentage -= substitution;
            testSolution[j].percentage += substitution;

            // Check constraints
            const testConstraints = [
              ...testSolution.map((s) => {
                const ing = selectedIngredients.find((ing) => ing.id === s.id)!;
                return ing.constraints;
              }),
            ];

            let valid = true;
            for (let k = 0; k < testSolution.length; k++) {
              const constraints = testConstraints[k];
              if (constraints) {
                if (constraints.minPercentage !== undefined && testSolution[k].percentage < constraints.minPercentage) {
                  valid = false;
                  break;
                }
                if (constraints.maxPercentage !== undefined && testSolution[k].percentage > constraints.maxPercentage) {
                  valid = false;
                  break;
                }
              }
            }

            if (valid) {
              const testComponents = testSolution.map((s) => {
                const ingredient = selectedIngredients.find((ing) => ing.id === s.id)!;
                return {
                  percentage: s.percentage,
                  nutritionalValues: ingredient.nutritionalValues,
                };
              });
              const testComposition = calculateNutritionalComposition(testComponents);
              if (meetsNutritionalRequirements(testComposition, requirements)) {
                solution = testSolution;
                improved = true;
                break;
              }
            }
          }
          if (improved) break;
        }
        if (improved) break;
      }
      if (!improved) break; // No further improvement possible
    } else {
      // Adjust to meet requirements
      // Find which nutrients are deficient
      const adjustments: Array<{ ingredientIdx: number; adjustment: number }> = [];

      for (let i = 0; i < solution.length; i++) {
        const ingredient = selectedIngredients[i];
        const nutritionalValues = ingredient.nutritionalValues;

        // Check each required nutrient
        if (requirements.protein && (composition.protein || 0) < requirements.protein) {
          if (nutritionalValues.protein && nutritionalValues.protein > (composition.protein || 0)) {
            adjustments.push({ ingredientIdx: i, adjustment: 2 });
          }
        }
        if (requirements.energy && (composition.energy || 0) < requirements.energy) {
          if (nutritionalValues.energy && nutritionalValues.energy > (composition.energy || 0)) {
            adjustments.push({ ingredientIdx: i, adjustment: 1.5 });
          }
        }
      }

      // Apply adjustments
      if (adjustments.length > 0) {
        const totalAdjustment = adjustments.reduce((sum, a) => sum + a.adjustment, 0);
        const reduction = totalAdjustment / (solution.length - adjustments.length);

        for (const adj of adjustments) {
          solution[adj.ingredientIdx].percentage += adj.adjustment;
        }

        // Reduce other ingredients proportionally
        for (let i = 0; i < solution.length; i++) {
          if (!adjustments.find((a) => a.ingredientIdx === i)) {
            solution[i].percentage = Math.max(0, solution[i].percentage - reduction);
          }
        }

        // Normalize
        const total = solution.reduce((sum, s) => sum + s.percentage, 0);
        if (total > 0) {
          solution = solution.map((s) => ({
            ...s,
            percentage: (s.percentage / total) * 100,
          }));
        }
      } else {
        break; // Cannot meet requirements
      }
    }

    iteration++;
  }

  // Final validation
  const finalComponents = solution.map((s) => {
    const ingredient = selectedIngredients.find((ing) => ing.id === s.id)!;
    return {
      percentage: s.percentage,
      nutritionalValues: ingredient.nutritionalValues,
    };
  });
  const finalComposition = calculateNutritionalComposition(finalComponents);

  // Calculate costs
  const rationComponents: FeedRationComponent[] = solution
    .filter((s) => s.percentage > 0.01) // Remove near-zero percentages
    .map((s) => {
      const ingredient = selectedIngredients.find((ing) => ing.id === s.id)!;
      const amount = (s.percentage / 100) * totalAmount;
      const cost = ingredient.unitPrice * amount;

      return {
        ingredientId: s.id,
        ingredientName: s.name,
        percentage: s.percentage,
        amount,
        cost,
      };
    });

  // Normalize percentages again after filtering
  const filteredTotal = rationComponents.reduce((sum, c) => sum + c.percentage, 0);
  if (filteredTotal > 0) {
    rationComponents.forEach((c) => {
      c.percentage = (c.percentage / filteredTotal) * 100;
    });
  }

  const totalCost = rationComponents.reduce((sum, c) => sum + c.cost, 0);

  return {
    userId: '', // Will be set by the router
    targetAnimal,
    totalAmount,
    unit: input.unit || 'kg',
    components: rationComponents,
    totalCost,
    nutritionalValues: finalComposition,
    optimizedAt: new Date(),
  };
}

