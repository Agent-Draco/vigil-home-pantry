import { motion, AnimatePresence } from "framer-motion";
import { Minus, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

interface RemovalModeToggleProps {
  isActive: boolean;
  onToggle: () => void;
}

export const RemovalModeToggle = ({ isActive, onToggle }: RemovalModeToggleProps) => {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
      className="fixed bottom-32 right-4 z-40"
    >
      <motion.button
        onClick={onToggle}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "relative flex items-center gap-3 px-6 py-4 rounded-full transition-all duration-500",
          isActive 
            ? "bg-gradient-to-r from-warning to-warning/80 shadow-glow" 
            : "glass-card"
        )}
      >
        <AnimatePresence mode="wait">
          {isActive ? (
            <motion.div
              key="active"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3"
            >
              <Minus className="w-5 h-5 text-warning-foreground" />
              <span className="font-semibold text-warning-foreground">Removal Mode</span>
            </motion.div>
          ) : (
            <motion.div
              key="inactive"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3"
            >
              <ShoppingCart className="w-5 h-5 text-foreground" />
              <span className="font-medium text-foreground">Quick Remove</span>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Glow ring when active */}
        {isActive && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute inset-0 rounded-full border-2 border-warning/50 animate-pulse"
          />
        )}
      </motion.button>
    </motion.div>
  );
};
