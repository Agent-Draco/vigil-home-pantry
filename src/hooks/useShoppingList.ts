import { useState, useEffect, useCallback } from "react";
import { vigilSupabase } from "@/integrations/vigil/client";
import { useToast } from "@/hooks/use-toast";

export interface ShoppingListItem {
  id: string;
  item_name: string;
  quantity: number;
  household_id: string;
  inserted_at?: string;
  created_at?: string;
}

/**
 * Shopping list hook - uses the Vigil Supabase project's shopping_list table
 */
export const useShoppingList = (householdId: string | null) => {
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const upsertItemById = useCallback((item: ShoppingListItem) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((existing) => existing.id === item.id);

      if (existingIndex === -1) {
        return [item, ...prev];
      }

      return prev.map((existing) =>
        existing.id === item.id ? { ...existing, ...item } : existing
      );
    });
  }, []);

  const fetchItems = useCallback(async () => {
    if (!householdId) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await vigilSupabase
        .from("shopping_list")
        .select("*")
        .eq("household_id", householdId)
        .order("inserted_at", { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      console.error("Error fetching shopping list:", error);
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Real-time subscription
  useEffect(() => {
    if (!householdId) return;

    const channel = vigilSupabase
      .channel("shopping-list-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shopping_list",
          filter: `household_id=eq.${householdId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            upsertItemById(payload.new as ShoppingListItem);
          } else if (payload.eventType === "UPDATE") {
            upsertItemById(payload.new as ShoppingListItem);
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
  }, [householdId, upsertItemById]);

  const addItem = async (item: { item_name: string; quantity?: number }) => {
    if (!householdId) return null;

    try {
      const { data, error } = await vigilSupabase
        .from("shopping_list")
        .insert({
          household_id: householdId,
          item_name: item.item_name,
          quantity: item.quantity || 1,
        })
        .select()
        .single();

      if (error) throw error;

      // Optimistically add to local state so UI updates without reload
      if (data) {
        upsertItemById(data as ShoppingListItem);
      }

      toast({
        title: "Added to shopping list",
        description: `${item.item_name} added`,
      });

      return data as ShoppingListItem;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await vigilSupabase
        .from("shopping_list")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Optimistically remove from local state so UI updates without reload
      setItems((prev) => prev.filter((item) => item.id !== id));

      toast({
        title: "Removed from shopping list",
        description: "Item removed",
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
  };

  const updateItem = async (id: string, updates: Partial<ShoppingListItem>) => {
    try {
      const { error } = await vigilSupabase
        .from("shopping_list")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
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

  return {
    items,
    loading,
    addItem,
    deleteItem,
    updateItem,
    refetch: fetchItems,
  };
};
