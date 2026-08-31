import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { vigilSupabase } from "@/integrations/vigil/client";
import { useToast } from "@/hooks/use-toast";

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  category: string | null;
  barcode: string | null;
  expiry_date: string | null;
  mfg_date: string | null;
  item_type?: string;
  medicine_is_dosaged?: boolean;
  medicine_dose_amount?: number | null;
  medicine_dose_unit?: string | null;
  medicine_dose_times?: string[] | null;
  medicine_timezone?: string | null;
  medicine_next_dose_at?: string | null;
  medicine_last_taken_at?: string | null;
  medicine_snooze_until?: string | null;
  is_out: boolean;
  added_by: string | null;
  created_at: string;
  updated_at: string;
  household_id: string;
  profile?: {
    display_name: string | null;
  } | null;
}

export const useInventory = (householdId: string | null) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const deleteItem = useCallback(async (id: string) => {
    try {
      // External DB uses 'uuid' as the primary identifier
      const { error } = await vigilSupabase
        .from("inventory_items")
        .delete()
        .eq("uuid", id);

      if (error) throw error;

      // Optimistically remove from local state so UI updates without reload
      setItems((prev) => prev.filter((item) => item.id !== id));

      toast({
        title: "Item removed",
        description: "Item deleted from inventory",
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  const fetchItems = useCallback(async () => {
    if (!householdId) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await vigilSupabase
        .from("inventory_items")
        .select("*")
        .eq("household_id", householdId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Map DB column names to UI-friendly names
      // External DB uses 'uuid' as the primary key while 'id' is often null
      const mappedItems: InventoryItem[] = (data || []).map((item: any) => ({
        ...item,
        id: item.uuid || item.id || item.uuid,
        mfg_date: item.manufacturing_date ?? null,
      }));

      setItems(mappedItems);
    } catch (error) {
      console.error("Error fetching inventory:", error);
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Cleanup expired items after 3 days
  useEffect(() => {
    const cleanupExpiredItems = async () => {
      if (!householdId || items.length === 0) return;

      const now = new Date();
      const expiredItems = items.filter(item => {
        if (!item.expiry_date) return false;
        const expiryDate = new Date(item.expiry_date);
        const daysExpired = Math.floor((now.getTime() - expiryDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysExpired > 3; // Keep for 3 days before disposal
      });

      if (expiredItems.length > 0) {
        const expiredIds = expiredItems.map(item => item.id);

        try {
          const { error } = await vigilSupabase
            .from("inventory_items")
            .delete()
            .in("id", expiredIds);

          if (error) throw error;

          setItems((prev) => prev.filter((item) => !expiredIds.includes(item.id)));

          toast({
            title: "Cleanup complete",
            description: `Removed ${expiredIds.length} expired item${expiredIds.length !== 1 ? 's' : ''}`,
          });
        } catch (error) {
          console.error("Error cleaning up expired items:", error);
        }
      }
    };

    // Run cleanup every hour
    const cleanupInterval = setInterval(cleanupExpiredItems, 60 * 60 * 1000);

    // Also run once on mount
    cleanupExpiredItems();

    return () => clearInterval(cleanupInterval);
  }, [householdId, items, toast]);

  // Real-time subscription
  useEffect(() => {
    if (!householdId) return;

    const channel = vigilSupabase
      .channel("inventory-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory_items",
          filter: `household_id=eq.${householdId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            fetchItems();
          } else if (payload.eventType === "UPDATE") {
            setItems((prev) =>
              prev.map((item) =>
                item.id === payload.new.id
                  ? { ...item, ...payload.new }
                  : item
              )
            );
          } else if (payload.eventType === "DELETE") {
            setItems((prev) =>
              prev.filter((item) => item.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      vigilSupabase.removeChannel(channel);
    };
  }, [householdId, fetchItems]);

  const addItem = async (item: {
    name: string;
    quantity?: number;
    unit?: string;
    category?: string;
    barcode?: string;
    expiry_date?: string;
    manufacturing_date?: string;
    item_type?: "food" | "medicine";
    medicine_is_dosaged?: boolean;
    medicine_dose_amount?: number;
    medicine_dose_unit?: string;
    medicine_dose_times?: string[];
    medicine_timezone?: string;
    medicine_next_dose_at?: string;
  }) => {
    if (!householdId) return null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    try {
      const { data, error } = await vigilSupabase
        .from("inventory_items")
        .insert({
          household_id: householdId,
          name: item.name,
          quantity: item.quantity || 1,
          unit: item.unit || "pcs",
          category: item.category,
          barcode: item.barcode,
          expiry_date: item.expiry_date,
          manufacturing_date: item.manufacturing_date,
          item_type: item.item_type || "food",
          medicine_is_dosaged: item.medicine_is_dosaged ?? false,
          medicine_dose_amount: item.medicine_dose_amount,
          medicine_dose_unit: item.medicine_dose_unit,
          medicine_dose_times: item.medicine_dose_times,
          medicine_timezone: item.medicine_timezone,
          medicine_next_dose_at: item.medicine_next_dose_at,
          added_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Item added",
        description: `${item.name} added to inventory`,
      });

      // Optimistically add to local state so UI updates without reload
      if (data) {
        setItems((prev) => [data as InventoryItem, ...prev]);
      }

      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const updateItem = async (id: string, updates: Partial<InventoryItem>) => {
    try {
      const { error } = await vigilSupabase
        .from("inventory_items")
        .update(updates)
        .eq("uuid", id);

      if (error) throw error;

      // Optimistically update local state
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, ...updates } as InventoryItem : item
        )
      );
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const decrementItem = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return false;

    if (item.quantity <= 1) {
      return updateItem(id, { quantity: 0, is_out: true });
    }

    return updateItem(id, { quantity: item.quantity - 1 });
  };

  return {
    items,
    loading,
    addItem,
    updateItem,
    decrementItem,
    deleteItem,
    refetch: fetchItems,
  };
};
