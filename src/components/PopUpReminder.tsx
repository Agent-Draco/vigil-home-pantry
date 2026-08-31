import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const POPUP_HANDLED_KEY = "desmo_popup_handled_item_ids";

const getHandledSet = () => {
  try {
    const raw = localStorage.getItem(POPUP_HANDLED_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(parsed);
  } catch {
    return new Set<string>();
  }
};

const persistHandled = (id: string) => {
  const set = getHandledSet();
  set.add(id);
  localStorage.setItem(POPUP_HANDLED_KEY, JSON.stringify(Array.from(set)));
};

interface ExpiringItem {
  id: string;
  name: string;
  expiry_date: string;
  daysUntilExpiry: number;
}

interface PopUpReminderProps {
  isVisible: boolean;
  expiringItems: ExpiringItem[];
  onDismiss: () => void;
  onAddToShoppingList: (itemName: string) => void;
  onSeeRecipes?: (ingredient: string) => void;
  commListings?: Array<{
    id: string;
    title: string;
    mode: "s-comm" | "b-comm";
    lister_name?: string;
    quantity?: number;
    unit?: string | null;
  }>;
}

export const PopUpReminder = ({
  isVisible,
  expiringItems,
  onDismiss,
  onAddToShoppingList,
  onSeeRecipes,
  commListings = [],
}: PopUpReminderProps) => {
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  const visibleItems = (() => {
    const handled = getHandledSet();
    return expiringItems.filter((it) => !handled.has(it.id));
  })();

  useEffect(() => {
    if (isVisible && visibleItems.length > 0) {
      setCurrentItemIndex(0);
      setAddedItems(new Set());
    }
  }, [isVisible, visibleItems.length]);

  const currentItem = visibleItems[currentItemIndex];

  const handleNext = () => {
    if (currentItemIndex < visibleItems.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
    } else {
      onDismiss();
    }
  };

  const handleAddToList = () => {
    onAddToShoppingList(currentItem.name);
    persistHandled(currentItem.id);
    setAddedItems(prev => new Set(prev).add(currentItem.id));
    handleNext();
  };

  const handleSeeRecipes = () => {
    onSeeRecipes?.(currentItem.name);
    onDismiss();
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleDismissAll = () => {
    // Dismiss is considered an action (per TODO text). Skips are not persisted.
    for (let idx = currentItemIndex; idx < visibleItems.length; idx++) {
      persistHandled(visibleItems[idx].id);
    }
    onDismiss();
  };

  if (!isVisible || !currentItem) return null;

  const isExpired = currentItem.daysUntilExpiry <= 0;
  const isUrgent = currentItem.daysUntilExpiry <= 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
        onClick={(e) => e.target === e.currentTarget && onDismiss()}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 50 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-background rounded-3xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden border border-border"
        >
          {/* Header with urgency indicator */}
          <div className={`px-6 py-5 ${isExpired ? 'bg-destructive/15' : isUrgent ? 'bg-warning/15' : 'bg-warning/10'} border-b border-border`}>
            <div className="flex items-center gap-4">
              <motion.div 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className={`w-12 h-12 rounded-full flex items-center justify-center ${isExpired ? 'bg-destructive/20' : 'bg-warning/20'}`}
              >
                {isExpired ? (
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                ) : (
                  <Clock className="w-6 h-6 text-warning" />
                )}
              </motion.div>
              <div className="flex-1">
                <h3 className="font-bold text-foreground text-lg">
                  {isExpired ? "Item Expired!" : "Expiring Soon!"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {visibleItems.length > 1 ? (
                    `Item ${currentItemIndex + 1} of ${visibleItems.length}`
                  ) : (
                    "Review this item"
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            <motion.div 
              key={currentItem.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-center"
            >
              <h4 className="text-xl font-bold text-foreground mb-3">
                {currentItem.name}
              </h4>
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                isExpired 
                  ? 'bg-destructive/10 text-destructive' 
                  : isUrgent 
                    ? 'bg-warning/20 text-warning-foreground' 
                    : 'bg-secondary text-muted-foreground'
              }`}>
                <Clock className="w-4 h-4" />
                {isExpired 
                  ? "Already expired" 
                  : `${currentItem.daysUntilExpiry} day${currentItem.daysUntilExpiry !== 1 ? 's' : ''} left`
                }
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Would you like to add a replacement to your shopping list?
              </p>
            </motion.div>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 space-y-3">
            {onSeeRecipes && (
              <Button
                variant="outline"
                onClick={handleSeeRecipes}
                className="w-full h-11"
              >
                See some yummy recipes
              </Button>
            )}

            <Button
              onClick={handleAddToList}
              className="w-full h-12 text-base font-semibold"
              size="lg"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Add to Shopping List
            </Button>

            {commListings.length > 0 && (
              <div className="pt-2">
                <div className="text-xs font-semibold text-muted-foreground mb-2">
                  Community listings
                </div>
                <div className="space-y-2 max-h-28 overflow-y-auto">
                  {commListings.slice(0, 6).map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{l.title}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {(l.mode === "s-comm" ? "S-Comm" : "B-Comm")}{l.lister_name ? ` • ${l.lister_name}` : ""}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground flex-shrink-0">
                        {typeof l.quantity === "number" ? `${l.quantity}${l.unit ? ` ${l.unit}` : ""}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleSkip}
                className="flex-1 h-11"
              >
                Skip
              </Button>
              {visibleItems.length > 1 && currentItemIndex < visibleItems.length - 1 && (
                <Button
                  variant="outline"
                  onClick={handleNext}
                  className="flex-1 h-11"
                >
                  Next Item
                </Button>
              )}
            </div>

            {visibleItems.length > 1 && (
              <Button
                variant="ghost"
                onClick={handleDismissAll}
                className="w-full text-muted-foreground hover:text-foreground"
              >
                Dismiss All ({visibleItems.length - currentItemIndex} remaining)
              </Button>
            )}

            {/* Progress dots */}
            {visibleItems.length > 1 && (
              <div className="flex justify-center gap-1.5 pt-2">
                {visibleItems.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      idx === currentItemIndex 
                        ? 'bg-primary' 
                        : idx < currentItemIndex 
                          ? addedItems.has(visibleItems[idx].id) 
                            ? 'bg-success' 
                            : 'bg-muted-foreground/30'
                          : 'bg-muted-foreground/20'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
