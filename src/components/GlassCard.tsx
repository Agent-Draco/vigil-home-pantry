import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactNode, forwardRef } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  isExpiring?: boolean;
  onClick?: () => void;
  delay?: number;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(({ 
  children, 
  className, 
  isExpiring = false,
  onClick,
  delay = 0
}, ref) => {
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      whileHover={onClick ? { scale: 1.02, y: -2 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={cn(
        "glass-card p-5 transition-all duration-300",
        onClick && "cursor-pointer",
        isExpiring && "glow-warning border-warning/50",
        className
      )}
    >
      {children}
    </motion.div>
  );
});

GlassCard.displayName = "GlassCard";
