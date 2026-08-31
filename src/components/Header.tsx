import { motion } from "framer-motion";
import { Bell, Plus, ArrowLeft } from "lucide-react";
import desmoLogo from "@/assets/asterisk.png";

interface HeaderProps {
  userName?: string;
  householdName?: string;
  notificationCount?: number;
  onBackToHouseholds?: () => void;
}

export const Header = ({ 
  userName = "Guest", 
  householdName = "My Kitchen",
  notificationCount = 0,
  onBackToHouseholds
}: HeaderProps) => {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="glass-nav fixed top-0 left-0 right-0 z-50 px-6 py-4"
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBackToHouseholds && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onBackToHouseholds}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
          )}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", bounce: 0.4 }}
            className="w-10 h-10 rounded-lg overflow-hidden bg-background/50 flex items-center justify-center p-1"
          >
            <img src={desmoLogo} alt="Desmo" className="w-full h-full object-contain" />
          </motion.div>
          <div>
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-sm text-muted-foreground"
            >
              Good morning
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="text-lg font-semibold text-foreground"
            >
              {householdName}
            </motion.h1>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="glass-button relative w-10 h-10 rounded-full flex items-center justify-center"
          >
            <Bell className="w-5 h-5 text-foreground" />
            {notificationCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-accent rounded-full text-xs font-bold flex items-center justify-center text-accent-foreground"
              >
                {notificationCount}
              </motion.span>
            )}
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="glass-button w-10 h-10 rounded-full flex items-center justify-center bg-primary text-primary-foreground"
          >
            <Plus className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
};
