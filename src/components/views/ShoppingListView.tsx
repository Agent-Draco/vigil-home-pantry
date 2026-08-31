import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ShoppingCart, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { ShoppingListItem } from "@/hooks/useShoppingList";

interface ShoppingListViewProps {
  shoppingList: ShoppingListItem[];
  onAddItem: (item: { item_name: string; quantity?: number }) => Promise<any>;
  onDeleteItem: (id: string) => Promise<boolean>;
  loading?: boolean;
}

export const ShoppingListView = ({
  shoppingList,
  onAddItem,
  onDeleteItem,
  loading
}: ShoppingListViewProps) => {
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    setAdding(true);
    await onAddItem({
      item_name: newItemName.trim(),
      quantity: newItemQuantity,
    });
    setNewItemName("");
    setNewItemQuantity(1);
    setAdding(false);
  };

  const handleDeleteItem = async (id: string) => {
    await onDeleteItem(id);
  };

  return (
    <section>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h2 className="text-xl font-semibold text-foreground">Shopping List</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Items to buy when restocking your inventory
        </p>
      </motion.div>

      {/* Add Item Form */}
      <GlassCard className="mb-6">
        <form onSubmit={handleAddItem} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="itemName">Item Name</Label>
            <Input
              id="itemName"
              type="text"
              placeholder="e.g., Organic Milk"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="itemQuantity">Quantity</Label>
            <Input
              id="itemQuantity"
              type="number"
              min="1"
              value={newItemQuantity}
              onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 1)}
            />
          </div>

          <Button
            type="submit"
            disabled={adding || !newItemName.trim()}
            className="w-full"
          >
            {adding ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Add to Shopping List
          </Button>
        </form>
      </GlassCard>

      {/* Shopping List Items */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : shoppingList.length === 0 ? (
          <GlassCard className="py-12 text-center">
            <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Your shopping list is empty
            </h3>
            <p className="text-sm text-muted-foreground">
              Add items you need to buy when restocking your inventory
            </p>
          </GlassCard>
        ) : (
          <AnimatePresence>
            {shoppingList.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: i * 0.05 }}
              >
                <GlassCard className="flex items-center justify-between p-4">
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">
                      {item.item_name}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Quantity: {item.quantity}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-2 rounded-full hover:bg-destructive/10 text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </GlassCard>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </section>
  );
};
