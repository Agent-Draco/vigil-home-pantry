import { useState } from "react";
import { motion } from "framer-motion";
import { Package, AlertTriangle, TrendingUp, Loader2 } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { QuickAddPreset, quickAddPresets } from "@/components/QuickAddPreset";
import { InventoryItem } from "@/components/InventoryItem";
import { ShoppingListWidget } from "@/components/ShoppingListWidget";
import { RecipeDrawer } from "@/components/RecipeDrawer";
import { AnimatePresence } from "framer-motion";
import type { InventoryItem as InventoryItemType } from "@/hooks/useInventory";
import type { ShoppingListItem } from "@/hooks/useShoppingList";
import { QuickAddFlow } from "@/components/QuickAddFlow";
import type { QuickAddPresetData } from "@/components/QuickAddPreset";
import type { SmartAddDraft } from "@/lib/smartAddParser";

interface HomeViewProps {
  inventory: InventoryItemType[];
  onItemClick: (id: string) => void;
  shoppingList?: ShoppingListItem[];
  onViewShoppingList?: () => void;
  shoppingListLoading?: boolean;
  loading?: boolean;
}

export const HomeView = ({ 
  inventory, 
  onItemClick, 
  onQuickAdd, 
  shoppingList = [],
  onViewShoppingList,
  shoppingListLoading,
  loading
}: HomeViewProps) => {
  const [isRecipeOpen, setIsRecipeOpen] = useState(false);
  const [recipeIngredient, setRecipeIngredient] = useState("");
  const [quickAddPreset, setQuickAddPreset] = useState<QuickAddPresetData | null>(null);
  const [mockItems, setMockItems] = useState<InventoryItemType[]>([]);
  const visibleInventory = [...mockItems, ...inventory];

  const expiringCount = visibleInventory.filter((item) => {
    if (!item.expiry_date) return false;
    const days = Math.ceil(
      (new Date(item.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return days <= 3 && days > 0;
  }).length;

  const inStockCount = visibleInventory.filter(item => !item.is_out).length;
  const outOfStockCount = visibleInventory.filter(item => item.is_out).length;

  const handleMockAdd = (draft: SmartAddDraft) => {
    const now = new Date().toISOString();
    setMockItems((items) => [{
      id: `mock-${Date.now()}`, name: draft.name, quantity: 1, unit: "pcs", category: draft.category,
      barcode: null, expiry_date: draft.expiryDate || null, mfg_date: draft.manufacturingDate || null,
      is_out: false, added_by: null, created_at: now, updated_at: now, household_id: "mock",
    }, ...items]);
    setQuickAddPreset(null);
  };

  return (
    <>
      {/* Stats Section */}
      <section className="mb-8">
        <motion.h2
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider"
        >
          Overview
        </motion.h2>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Items"
            value={inventory.length}
            icon={Package}
            delay={0}
          />
          <StatsCard
            title="Expiring Soon"
            value={expiringCount}
            icon={AlertTriangle}
            variant="warning"
            delay={0.1}
          />
          <StatsCard
            title="In Stock"
            value={inStockCount}
            icon={TrendingUp}
            variant="success"
            delay={0.2}
          />
          <StatsCard
            title="Out of Stock"
            value={outOfStockCount}
            icon={Package}
            variant={outOfStockCount > 0 ? "warning" : "default"}
            delay={0.3}
          />
        </div>
      </section>

      {/* Quick Add Section */}
      <section className="mb-8">
        <motion.h2
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider"
        >
          Quick Add
        </motion.h2>
        
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {quickAddPresets.map((preset, i) => (
            <div key={preset.name}>
              <QuickAddPreset
                name={preset.name}
                emoji={preset.emoji}
                onClick={() => {
                  setQuickAddPreset(preset);
                  onQuickAdd?.(preset);
                }}
                delay={0.3 + i * 0.05}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Shopping List Widget */}
      {onViewShoppingList && (
        <ShoppingListWidget
          items={shoppingList}
          onViewAll={onViewShoppingList}
          loading={shoppingListLoading}
        />
      )}

      {/* Recent Items */}
      <section>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-between mb-4"
        >
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Recent Items
          </h2>
          <span className="text-xs text-muted-foreground">
            {visibleInventory.length} items
          </span>
        </motion.div>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {visibleInventory.slice(0, 5).map((item, i) => (
                <div key={item.id}>
                  <InventoryItem
                    name={item.name}
                    quantity={item.quantity}
                    expiryDate={item.expiry_date ? new Date(item.expiry_date) : undefined}
                    mfgDate={item.mfg_date ? new Date(item.mfg_date) : undefined}
                    category={item.category}
                    isInStock={!item.is_out}
                    createdAt={new Date(item.created_at)}
                    onClick={() => onItemClick(item.id)}
                    onRescueMission={() => {
                      setRecipeIngredient(item.name);
                      setIsRecipeOpen(true);
                    }}
                    delay={0.5 + i * 0.1}
                  />
                </div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      <RecipeDrawer
        isOpen={isRecipeOpen}
        onClose={() => setIsRecipeOpen(false)}
        ingredient={recipeIngredient}
      />
      <QuickAddFlow preset={quickAddPreset} onClose={() => setQuickAddPreset(null)} onAdd={handleMockAdd} />
    </>
  );
};
