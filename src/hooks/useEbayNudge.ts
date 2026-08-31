import { useState, useEffect } from "react";
import type { InventoryItem } from "./useInventory";

interface EbayNudgeResult {
  shouldShowNudge: boolean;
  oldItem: InventoryItem | null;
  newItem: InventoryItem | null;
}

/**
 * Hook to detect when a new electronic item is added that matches an existing item
 * This would trigger an eBay listing nudge
 */
export const useEbayNudge = (items: InventoryItem[]): EbayNudgeResult => {
  const [nudgeState, setNudgeState] = useState<EbayNudgeResult>({
    shouldShowNudge: false,
    oldItem: null,
    newItem: null,
  });

  useEffect(() => {
    // Get electronics items
    const electronics = items.filter(item => item.category === 'Electronics');

    if (electronics.length < 2) {
      setNudgeState({ shouldShowNudge: false, oldItem: null, newItem: null });
      return;
    }

    // Simple similarity check - in a real app, this would use more sophisticated matching
    const itemNames = electronics.map(item => item.name.toLowerCase());

    // Check for similar items (basic string matching)
    for (let i = 0; i < electronics.length; i++) {
      for (let j = i + 1; j < electronics.length; j++) {
        const item1 = electronics[i];
        const item2 = electronics[j];

        const name1 = item1.name.toLowerCase();
        const name2 = item2.name.toLowerCase();

        // Check for common electronic item patterns
        const isSimilar = checkItemSimilarity(name1, name2);

        if (isSimilar) {
          // Determine which is newer by created_at date
          const item1Date = new Date(item1.created_at).getTime();
          const item2Date = new Date(item2.created_at).getTime();
          const newItem = item1Date > item2Date ? item1 : item2;
          const oldItem = item1Date > item2Date ? item2 : item1;

          setNudgeState({
            shouldShowNudge: true,
            oldItem,
            newItem,
          });
          return;
        }
      }
    }

    setNudgeState({ shouldShowNudge: false, oldItem: null, newItem: null });
  }, [items]);

  return nudgeState;
};

/**
 * Basic similarity check for electronic items
 */
function checkItemSimilarity(name1: string, name2: string): boolean {
  // Remove common words and check for brand/model matches
  const cleanName1 = cleanItemName(name1);
  const cleanName2 = cleanItemName(name2);

  // Check if they share significant words
  const words1 = cleanName1.split(' ');
  const words2 = cleanName2.split(' ');

  const commonWords = words1.filter(word => words2.includes(word) && word.length > 2);

  // If they share 2+ significant words, consider them similar
  return commonWords.length >= 2;
}

/**
 * Clean item name for comparison
 */
function cleanItemName(name: string): string {
  return name
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\b(new|used|refurbished|gen|generation|pro|max|mini|plus|se)\b/gi, '') // Remove common modifiers
    .replace(/\s+/g, ' ')
    .trim();
}
