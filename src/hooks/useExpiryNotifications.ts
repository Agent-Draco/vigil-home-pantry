import { useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import type { KitchenInventoryItem } from "@/hooks/useKitchenInventory";

interface ExpiryNotificationOptions {
  warningDays?: number; // Days before expiry to warn (default: 3)
  checkInterval?: number; // Interval in ms to check (default: 60000 - 1 minute)
}

export const useExpiryNotifications = (
  items: KitchenInventoryItem[],
  options: ExpiryNotificationOptions = {}
) => {
  const { toast } = useToast();
  const { warningDays = 3, checkInterval = 60000 } = options;

  const getExpiringItems = useCallback(() => {
    const now = new Date();
    return items.filter(item => {
      if (!item.expiry_date || item.is_out) return false;
      const expiryDate = new Date(item.expiry_date);
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiry <= warningDays && daysUntilExpiry > 0;
    });
  }, [items, warningDays]);

  const getExpiredItems = useCallback(() => {
    const now = new Date();
    return items.filter(item => {
      if (!item.expiry_date || item.is_out) return false;
      const expiryDate = new Date(item.expiry_date);
      return expiryDate.getTime() < now.getTime();
    });
  }, [items]);

  // Show notification on mount and when items change
  useEffect(() => {
    const expiring = getExpiringItems();
    const expired = getExpiredItems();

    if (expired.length > 0) {
      toast({
        title: "⚠️ Expired Items",
        description: `${expired.length} item${expired.length > 1 ? "s have" : " has"} expired: ${expired.slice(0, 3).map(i => i.name).join(", ")}${expired.length > 3 ? "..." : ""}`,
        variant: "destructive",
      });
    } else if (expiring.length > 0) {
      toast({
        title: "🕐 Expiring Soon",
        description: `${expiring.length} item${expiring.length > 1 ? "s are" : " is"} expiring soon: ${expiring.slice(0, 3).map(i => i.name).join(", ")}${expiring.length > 3 ? "..." : ""}`,
      });
    }
  }, [items.length]); // Only run when items count changes

  // Periodic check for expiring items
  useEffect(() => {
    const interval = setInterval(() => {
      const expired = getExpiredItems();
      if (expired.length > 0) {
        toast({
          title: "⚠️ Items Have Expired",
          description: `Check your inventory - ${expired.length} item${expired.length > 1 ? "s" : ""} expired`,
          variant: "destructive",
        });
      }
    }, checkInterval);

    return () => clearInterval(interval);
  }, [getExpiredItems, checkInterval, toast]);

  return {
    expiringItems: getExpiringItems(),
    expiredItems: getExpiredItems(),
    expiringCount: getExpiringItems().length,
    expiredCount: getExpiredItems().length,
  };
};
