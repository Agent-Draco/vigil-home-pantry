import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChefHat, Package, AlertTriangle, ExternalLink } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { cn } from "@/lib/utils";
import { generateNudges } from "@/lib/rulesEngine";
import { RecipeDrawer } from "@/components/RecipeDrawer";

interface NudgeFeedProps {
  inventory: any[];
}

export const NudgeFeed = ({ inventory }: NudgeFeedProps) => {
  const [nudges, setNudges] = useState([]);
  const [isRecipeOpen, setIsRecipeOpen] = useState(false);
  const [recipeIngredient, setRecipeIngredient] = useState("");

  useEffect(() => {
    const newNudges = generateNudges(inventory);
    setNudges(newNudges);
  }, [inventory]);

  if (nudges.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        Nudges
      </h3>
      <AnimatePresence>
        {nudges.map((nudge, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: i * 0.1 }}
          >
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ChefHat className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground">{nudge.message}</p>
                </div>
                {nudge.type === "recipe" ? (
                  <button
                    type="button"
                    className="text-primary hover:text-primary/80"
                    onClick={() => {
                      const item = inventory.find((it) => it.id === nudge.itemId);
                      const ingredient = item?.name || "";
                      setRecipeIngredient(ingredient);
                      setIsRecipeOpen(Boolean(ingredient));
                    }}
                    aria-label="Open recipes"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                ) : (
                  <button type="button" className="text-primary/60 cursor-default" aria-label="Nudge">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                )}
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </AnimatePresence>

      <RecipeDrawer
        isOpen={isRecipeOpen}
        onClose={() => setIsRecipeOpen(false)}
        ingredient={recipeIngredient}
      />
    </div>
  );
};
