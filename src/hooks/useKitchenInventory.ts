import { useMemo } from "react";
import { useVigilInventory } from "@/hooks/useVigilInventory";

export interface KitchenInventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  barcode: string | null;
  expiry_date: string | null;
  mfg_date: string | null;
  is_out: boolean;
  added_by: string | null;
  created_at: string;
  updated_at: string;
  household_id: string;
  profile?: {
    display_name: string | null;
  } | null;
}

/**
 * Adapter hook: uses the external Vigil inventory table, but returns the same shape
 * the app UI already expects.
 */
export const useKitchenInventory = (householdId: string | null) => {
  const {
    items: vigilItems,
    loading,
    refetch,
    addItem: vigilAddItem,
    deleteItem: vigilDeleteItem,
  } = useVigilInventory(householdId);

  const items: KitchenInventoryItem[] = useMemo(() => {
    return vigilItems.map((it) => {
      const createdAt = it.created_at ?? new Date().toISOString();
      const updatedAt = it.updated_at ?? createdAt;

      return {
        id: String(it.id ?? ""),
        name: it.name,
        quantity: 1,
        unit: null,
        barcode: null,
        expiry_date: it.exp ?? null,
        mfg_date: it.mfg ?? null,
        is_out: it.status === "out",
        added_by: null,
        created_at: createdAt,
        updated_at: updatedAt,
        household_id: it.household_id,
        profile: null,
      };
    });
  }, [vigilItems]);

  const addItem = async (item: { name: string; barcode?: string; exp?: string; mfg?: string }) => {
    return await vigilAddItem({
      name: item.name,
      exp: item.exp,
      mfg: item.mfg,
    });
  };

  const deleteItem = async (id: string) => {
    return await vigilDeleteItem(id);
  };

  return {
    items,
    loading,
    addItem,
    deleteItem,
    refetch,
  };
};
