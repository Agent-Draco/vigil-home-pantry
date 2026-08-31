import { motion } from "framer-motion";
import { ShoppingCart, Plus, ChevronRight } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import type { ShoppingListItem } from "@/hooks/useShoppingList";

interface ShoppingListWidgetProps {
  items: ShoppingListItem[];
  onViewAll: () => void;
  loading?: boolean;
}

export const ShoppingListWidget = ({ items, onViewAll, loading }: ShoppingListWidgetProps) => {
  const displayItems = items.slice(0, 3);
  const remainingCount = items.length - 3;

  return (
    <section className="mb-8">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
        className="flex items-center justify-between mb-4"
      >
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Shopping List
        </h2>
        <button
          onClick={onViewAll}
          className="text-xs text-primary flex items-center gap-1 hover:opacity-80"
        >
          View all
          <ChevronRight className="w-3 h-3" />
        </button>
      </motion.div>

      {loading ? (
        <GlassCard className="py-8 text-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </GlassCard>
      ) : items.length === 0 ? (
        <GlassCard 
          className="py-6 text-center cursor-pointer hover:bg-secondary/50 transition-colors"
          onClick={onViewAll}
        >
          <ShoppingCart className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No items in shopping list</p>
          <p className="text-xs text-primary mt-1 flex items-center justify-center gap-1">
            <Plus className="w-3 h-3" />
            Add items
          </p>
        </GlassCard>
      ) : (
        <GlassCard className="divide-y divide-border/50">
          {displayItems.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="flex items-center justify-between py-3 px-1 first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">{item.item_name}</span>
              </div>
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                x{item.quantity}
              </span>
            </motion.div>
          ))}
          
          {remainingCount > 0 && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              onClick={onViewAll}
              className="w-full py-3 text-sm text-primary hover:opacity-80 flex items-center justify-center gap-1"
            >
              +{remainingCount} more item{remainingCount > 1 ? 's' : ''}
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          )}
        </GlassCard>
      )}
    </section>
  );
};
