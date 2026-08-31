import { motion } from "framer-motion";
import { GlassCard } from "./GlassCard";
import { cn } from "@/lib/utils";
import {
  Package, Clock, Milk, Egg, Croissant, Beef, Drumstick, Apple, Carrot,
  Snowflake, Wine, Cookie, Droplet, Wheat, Fish, Calendar, Zap
} from "lucide-react";
import { getVisualStateConfig, getItemState } from "@/lib/rulesEngine";


interface InventoryItemProps {
  name: string;
  quantity: number;
  expiryDate?: Date;
  mfgDate?: Date;
  isInStock?: boolean;
  state?: string | null;
  category?: string | null;
  lastTap?: string | null;
  createdAt?: Date;
  onClick?: () => void;
  onOpen?: () => void;
  onTap?: () => void;
  onRescueMission?: () => void;
  delay?: number;
}

export const InventoryItem = ({
  name,
  quantity,
  expiryDate,
  mfgDate,
  isInStock = true,
  state,
  category,
  lastTap,
  onClick,
  onOpen,
  onTap,
  onRescueMission,
  delay = 0
}: InventoryItemProps) => {
  const visualState = getVisualStateConfig(state || getItemState(expiryDate));
  const isExpiring = visualState.variant === 'warning' || visualState.variant === 'destructive';

  const computedState = state || getItemState(expiryDate);
  const isAtRisk = computedState === 'critical' || computedState === 'expired';
  const isFood = (category || '').toLowerCase().includes('food');
  const showRescueMission = Boolean(onRescueMission) && isFood && isAtRisk;

  const getCategoryIcon = (categoryName?: string | null) => {
    if (!categoryName) return Package;

    const category = categoryName.toLowerCase();
    if (category.includes('dairy') || category.includes('milk')) return Milk;
    if (category.includes('egg')) return Egg;
    if (category.includes('bread') || category.includes('bakery')) return Croissant;
    if (category.includes('meat') || category.includes('beef')) return Beef;
    if (category.includes('chicken') || category.includes('poultry')) return Drumstick;
    if (category.includes('fruit') || category.includes('apple')) return Apple;
    if (category.includes('vegetable') || category.includes('carrot')) return Carrot;
    if (category.includes('frozen')) return Snowflake;
    if (category.includes('beverage') || category.includes('wine')) return Wine;
    if (category.includes('snack') || category.includes('cookie')) return Cookie;
    if (category.includes('liquid') || category.includes('oil')) return Droplet;
    if (category.includes('grain') || category.includes('wheat')) return Wheat;
    if (category.includes('fish') || category.includes('seafood')) return Fish;
    return Package;
  };

  const IconComponent = getCategoryIcon(category);

  const formatDate = (date?: Date) => {
    if (!date) return null;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysUntilExpiry = (expiry?: Date) => {
    if (!expiry) return null;
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilExpiry = getDaysUntilExpiry(expiryDate);

  const getLifetimeGlowClass = (mfg?: Date, exp?: Date) => {
    // Red glow: within a week of expiry (or expired)
    if (exp) {
      const expDays = getDaysUntilExpiry(exp);
      if (typeof expDays === "number" && expDays <= 7) return "glow-red";
    }

    if (!mfg || !exp) return undefined;
    const start = mfg.getTime();
    const end = exp.getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return undefined;

    const now = Date.now();
    const progress = (now - start) / (end - start);
    if (!Number.isFinite(progress)) return undefined;

    // Thresholds:
    // - 50%: green
    // - 75%: yellow
    // - 90%: orange
    // - red handled above (week before expiry)
    if (progress >= 0.9) return "glow-orange";
    if (progress >= 0.75) return "glow-yellow";
    if (progress >= 0.5) return "glow-green";
    return undefined;
  };

  const lifetimeGlow = getLifetimeGlowClass(mfgDate, expiryDate);

  return (
    <GlassCard
      isExpiring={isExpiring}
      onClick={onClick}
      delay={delay}
      className={cn(
        "relative overflow-hidden",
        lifetimeGlow,
        !isInStock && "opacity-60"
      )}
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <motion.div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
            visualState.iconBg
          )}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <IconComponent className={cn("w-6 h-6", visualState.iconColor)} />
        </motion.div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-foreground truncate pr-2">
              {name}
            </h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              {quantity > 1 && (
                <span className="text-sm text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">
                  {quantity}
                </span>
              )}
              {!isInStock && (
                <span className="text-xs text-muted-foreground bg-destructive/10 px-2 py-0.5 rounded-full">
                  Out
                </span>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {mfgDate && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Mfg: {formatDate(mfgDate)}</span>
              </div>
            )}
            {expiryDate && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Exp: {formatDate(expiryDate)}</span>
                {daysUntilExpiry !== null && daysUntilExpiry <= 7 && (
                  <span className={cn(
                    "ml-1 px-1.5 py-0.5 rounded text-xs font-medium",
                    daysUntilExpiry <= 0
                      ? "bg-destructive/20 text-destructive"
                      : daysUntilExpiry <= 1
                        ? "bg-warning/20 text-warning"
                        : "bg-secondary/50 text-muted-foreground"
                  )}>
                    {daysUntilExpiry <= 0 ? "Expired" : `${daysUntilExpiry}d`}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* State indicator */}
          {state && (
            <div className="flex items-center gap-1 mt-1">
              <div className={cn("w-2 h-2 rounded-full", visualState.dotColor)} />
              <span className="text-xs text-muted-foreground capitalize">
                {state.toLowerCase()}
              </span>
            </div>
          )}

          {showRescueMission && (
            <div className="mt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRescueMission?.();
                }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-xs font-semibold"
              >
                <Zap className="w-3.5 h-3.5" />
                Start Rescue Mission
              </button>
            </div>
          )}
        </div>

        {/* Pulse indicator for critical items */}
        {visualState.showPulse && (
          <motion.div
            className="absolute inset-0 border-2 border-primary/30 rounded-2xl"
            animate={{
              scale: [1, 1.02, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
      </div>
    </GlassCard>
  );
};
