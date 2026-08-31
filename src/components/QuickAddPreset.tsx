import { motion } from "framer-motion";

interface QuickAddPresetProps {
  name: string;
  emoji: string;
  onClick: () => void;
  delay?: number;
}

export const QuickAddPreset = ({ name, emoji, onClick, delay = 0 }: QuickAddPresetProps) => {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay, ease: "easeOut" }}
      whileHover={{ scale: 1.08, y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="glass-button flex flex-col items-center gap-2 p-4 rounded-2xl min-w-[80px]"
    >
      <span className="text-2xl">{emoji}</span>
      <span className="text-xs font-medium text-foreground">{name}</span>
    </motion.button>
  );
};

export interface QuickAddPresetData {
  name: string;
  emoji: string;
  category: string;
}

export const quickAddPresets: QuickAddPresetData[] = [
  { name: "Milk", emoji: "🥛", category: "Dairy" },
  { name: "Eggs", emoji: "🥚", category: "Protein" },
  { name: "Bread", emoji: "🍞", category: "Bakery" },
  { name: "Butter", emoji: "🧈", category: "Dairy" },
  { name: "Cheese", emoji: "🧀", category: "Dairy" },
  { name: "Chicken", emoji: "🍗", category: "Meat" },
  { name: "Apples", emoji: "🍎", category: "Fruits" },
  { name: "Bananas", emoji: "🍌", category: "Fruits" },
  { name: "Salmon", emoji: "🐟", category: "Seafood" },
  { name: "Rice", emoji: "🍚", category: "Grains" },
  { name: "Yogurt", emoji: "🥄", category: "Dairy" },
  { name: "Orange Juice", emoji: "🍊", category: "Beverages" },
];
