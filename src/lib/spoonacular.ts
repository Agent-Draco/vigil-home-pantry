// Spoonacular API integration for recipe suggestions
const HARDCODED_SPOONACULAR_API_KEY = "c215a07fd1a942f39c156779f2f59894";
const SPOONACULAR_API_KEY =
  (import.meta.env.VITE_SPOONACULAR_API_KEY as string | undefined) ||
  (HARDCODED_SPOONACULAR_API_KEY || undefined);
const SPOONACULAR_COMPLEX_SEARCH_ENDPOINT = "https://api.spoonacular.com/recipes/complexSearch";

export interface Recipe {
  id: number;
  title: string;
  image: string;
  imageType: string;
  usedIngredientCount: number;
  missedIngredientCount: number;
  likes: number;
  instructions?: string;
  analyzedInstructions?: Array<{
    name: string;
    steps: Array<{
      number: number;
      step: string;
      ingredients: Array<{
        id: number;
        name: string;
        localizedName: string;
        image: string;
      }>;
      equipment: Array<{
        id: number;
        name: string;
        localizedName: string;
        image: string;
      }>;
    }>;
  }>;
}

export interface SpoonacularPreferences {
  diet?: string | null;
  intolerances?: string[];
}

/**
 * Find recipes by ingredients using Spoonacular API
 */
export async function findRecipesByIngredients(
  ingredients: string[],
  preferences?: SpoonacularPreferences,
): Promise<Recipe[]> {
  try {
    if (!SPOONACULAR_API_KEY) {
      console.error("Missing Spoonacular API key");
      return [];
    }

    const url = new URL(SPOONACULAR_COMPLEX_SEARCH_ENDPOINT);
    url.searchParams.set("apiKey", SPOONACULAR_API_KEY);
    url.searchParams.set("number", "5");
    url.searchParams.set("addRecipeInformation", "true");
    url.searchParams.set("fillIngredients", "true");
    url.searchParams.set("instructionsRequired", "true");

    const includeIngredients = ingredients
      .map((i) => i.trim())
      .filter(Boolean)
      .slice(0, 5)
      .join(",");
    if (includeIngredients) url.searchParams.set("includeIngredients", includeIngredients);

    const diet = preferences?.diet?.trim();
    if (diet && diet !== "none") url.searchParams.set("diet", diet);

    const intolerances = (preferences?.intolerances ?? []).map((s) => s.trim()).filter(Boolean);
    if (intolerances.length) url.searchParams.set("intolerances", intolerances.slice(0, 10).join(","));

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Spoonacular API error: ${response.status}`);
    }

    const payload = (await response.json()) as any;
    const results: any[] = Array.isArray(payload?.results) ? payload.results : [];
    const mapped: Recipe[] = results
      .map((r) => {
        const image: string = typeof r?.image === "string" ? r.image : "";
        const imageType = typeof r?.imageType === "string" ? r.imageType : (image.split(".").pop() || "jpg");
        return {
          id: Number(r?.id),
          title: typeof r?.title === "string" ? r.title : "Recipe",
          image,
          imageType,
          usedIngredientCount: 0,
          missedIngredientCount: 0,
          likes: typeof r?.aggregateLikes === "number" ? r.aggregateLikes : 0,
          analyzedInstructions: Array.isArray(r?.analyzedInstructions) ? r.analyzedInstructions : undefined,
        } as Recipe;
      })
      .filter((r) => Number.isFinite(r.id));

    return mapped;
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return [];
  }
}

/**
 * Get recipe information including instructions
 */
export async function getRecipeInformation(recipeId: number): Promise<Recipe | null> {
  try {
    if (!SPOONACULAR_API_KEY) {
      console.error("Missing Spoonacular API key: set VITE_SPOONACULAR_API_KEY");
      return null;
    }
    const url = `https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${SPOONACULAR_API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Spoonacular API error: ${response.status}`);
    }

    const recipe: Recipe = await response.json();
    return recipe;
  } catch (error) {
    console.error('Error fetching recipe information:', error);
    return null;
  }
}
