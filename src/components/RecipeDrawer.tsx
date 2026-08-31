import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChefHat, Clock, Users, ExternalLink } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { findRecipesByIngredients } from "@/lib/spoonacular";
import { useAuth } from "@/hooks/useAuth";
import { useSpoonSureProfile } from "@/hooks/useSpoonSureProfile";
import { cn } from "@/lib/utils";

interface Recipe {
  id: number;
  title: string;
  image: string;
  imageType: string;
  usedIngredientCount: number;
  missedIngredientCount: number;
  likes: number;
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

interface RecipeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  ingredient: string;
}

export const RecipeDrawer = ({ isOpen, onClose, ingredient }: RecipeDrawerProps) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const { user } = useAuth();
  const { profile } = useSpoonSureProfile(user?.id ?? null);

  useEffect(() => {
    if (isOpen && ingredient) {
      fetchRecipes();
    }
  }, [isOpen, ingredient, profile?.diet, profile?.allergies]);

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const fetchedRecipes = await findRecipesByIngredients([ingredient], {
        diet: profile?.diet ?? null,
        intolerances: profile?.allergies ?? [],
      });
      setRecipes(fetchedRecipes);
    } catch (error) {
      console.error('Error fetching recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatInstructions = (instructions: Recipe['analyzedInstructions']) => {
    if (!instructions || instructions.length === 0) return null;

    return instructions[0].steps.map((step, index) => (
      <div key={index} className="flex gap-3 mb-3">
        <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
          {step.number}
        </span>
        <p className="text-sm text-muted-foreground leading-relaxed">{step.step}</p>
      </div>
    ));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-background border-l border-border z-50 overflow-y-auto"
          >
            <div className="sticky top-0 bg-background/80 backdrop-blur-sm border-b border-border p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Recipes with {ingredient}</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : recipes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ChefHat className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No recipes found for {ingredient}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recipes.map((recipe) => (
                    <GlassCard
                      key={recipe.id}
                      className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedRecipe(recipe)}
                    >
                      <div className="flex gap-3">
                        <img
                          src={recipe.image || `https://spoonacular.com/recipeImages/${recipe.id}-312x231.${recipe.imageType}`}
                          alt={recipe.title}
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder.svg';
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm leading-tight mb-1 line-clamp-2">
                            {recipe.title}
                          </h3>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              <span>{recipe.usedIngredientCount} used</span>
                            </div>
                            {recipe.missedIngredientCount > 0 && (
                              <div className="flex items-center gap-1">
                                <span>{recipe.missedIngredientCount} missing</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              )}
            </div>

            {/* Recipe Detail Modal */}
            <AnimatePresence>
              {selectedRecipe && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                  onClick={() => setSelectedRecipe(null)}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-xl font-semibold pr-4">{selectedRecipe.title}</h3>
                        <button
                          onClick={() => setSelectedRecipe(null)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <img
                        src={selectedRecipe.image || `https://spoonacular.com/recipeImages/${selectedRecipe.id}-636x393.${selectedRecipe.imageType}`}
                        alt={selectedRecipe.title}
                        className="w-full h-48 object-cover rounded-lg mb-4"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder.svg';
                        }}
                      />

                      <div className="space-y-4">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{selectedRecipe.usedIngredientCount} ingredients used</span>
                          </div>
                          {selectedRecipe.missedIngredientCount > 0 && (
                            <div className="flex items-center gap-1">
                              <span>{selectedRecipe.missedIngredientCount} ingredients missing</span>
                            </div>
                          )}
                        </div>

                        {selectedRecipe.analyzedInstructions && selectedRecipe.analyzedInstructions.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-3 flex items-center gap-2">
                              <ChefHat className="w-4 h-4" />
                              Instructions
                            </h4>
                            <div className="space-y-2">
                              {formatInstructions(selectedRecipe.analyzedInstructions)}
                            </div>
                          </div>
                        )}

                        <div className="pt-4 border-t">
                          <a
                            href={`https://spoonacular.com/recipes/${selectedRecipe.title.replace(/\s+/g, '-').toLowerCase()}-${selectedRecipe.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
                          >
                            <span>View full recipe on Spoonacular</span>
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
