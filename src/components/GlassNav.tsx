import { motion } from "framer-motion";
import { Home, Package, Users, Settings, Scan, ShoppingCart, Sparkles, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface GlassNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: "home", icon: Home, label: "Home" },
  { id: "inventory", icon: Package, label: "Inventory" },
  { id: "scan", icon: Scan, label: "Scan" },
  { id: "shopping", icon: ShoppingCart, label: "Shop" },
  { id: "nudges", icon: Sparkles, label: "Nudges" },
  { id: "comm", icon: Users, label: "Comm" },
  { id: "feedback", icon: MessageSquare, label: "Feedback" },
  { id: "settings", icon: Settings, label: "Settings" },
];

export const GlassNav = ({ activeTab, onTabChange }: GlassNavProps) => {
  // Split nav items into two rows
  const firstRow = navItems.slice(0, 4);
  const secondRow = navItems.slice(4);
  
  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-6"
    >
      <div className="glass-card mx-auto max-w-md flex flex-col gap-2 p-3">
        {/* First row */}
        <div className="flex items-center justify-around">
          {firstRow.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <motion.button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-300 flex-1",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-primary/10 rounded-xl"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon className="w-4 h-4 relative z-10" />
                <span className="text-xs font-medium relative z-10">{item.label}</span>
              </motion.button>
            );
          })}
        </div>
        
        {/* Second row */}
        <div className="flex items-center justify-around">
          {secondRow.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <motion.button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-300 flex-1",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-primary/10 rounded-xl"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon className="w-4 h-4 relative z-10" />
                <span className="text-xs font-medium relative z-10">{item.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.nav>
  );
};
