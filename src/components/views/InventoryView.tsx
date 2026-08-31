import { useState } from "react";
import { motion } from "framer-motion";
import { InventoryItem } from "@/components/InventoryItem";
import { RecipeDrawer } from "@/components/RecipeDrawer";
import type { InventoryItem as InventoryItemType } from "@/hooks/useInventory";

interface InventoryViewProps {
  inventory: InventoryItemType[];
  onItemClick: (id: string) => void;
  onOpenItem?: (id: string) => void;
  onTapItem?: (id: string) => void;
  loading?: boolean;
}

export const InventoryView = ({
  inventory,
  onItemClick,
  onOpenItem,
  onTapItem,
  loading
}: InventoryViewProps) => {
  const [isRecipeOpen, setIsRecipeOpen] = useState(false);
  const [recipeIngredient, setRecipeIngredient] = useState("");

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {inventory.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <InventoryItem
              name={item.name}
              quantity={item.quantity}
              expiryDate={item.expiry_date ? new Date(item.expiry_date) : undefined}
              mfgDate={item.mfg_date ? new Date(item.mfg_date) : undefined}
              category={item.category}
              isInStock={!item.is_out}
              createdAt={new Date(item.created_at)}
              onClick={() => onItemClick(item.id)}
              onOpen={onOpenItem ? () => onOpenItem(item.id) : undefined}
              onTap={onTapItem ? () => onTapItem(item.id) : undefined}
              onRescueMission={() => {
                setRecipeIngredient(item.name);
                setIsRecipeOpen(true);
              }}
              delay={i * 0.05}
            />
          </motion.div>
        ))}
      </div>

      <RecipeDrawer
        isOpen={isRecipeOpen}
        onClose={() => setIsRecipeOpen(false)}
        ingredient={recipeIngredient}
      />
    </>
  );
};
