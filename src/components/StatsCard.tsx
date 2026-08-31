import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  variant?: "default" | "warning" | "success";
  delay?: number;
}

export const StatsCard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  variant = "default",
  delay = 0,
}: StatsCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      whileHover={{ scale: 1.02, y: -2 }}
      className={cn(
        "glass-card p-5 flex flex-col gap-3",
        variant === "warning" && "border-warning/30",
        variant === "success" && "border-success/30"
      )}
    >
      <div className="flex items-center justify-between">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          variant === "default" && "bg-primary/10",
          variant === "warning" && "bg-warning/20",
          variant === "success" && "bg-success/10"
        )}>
          <Icon className={cn(
            "w-5 h-5",
            variant === "default" && "text-primary",
            variant === "warning" && "text-warning",
            variant === "success" && "text-success"
          )} />
        </div>
        
        {trend && trendValue && (
          <span className={cn(
            "text-xs font-medium px-2 py-1 rounded-full",
            trend === "up" && "bg-success/10 text-success",
            trend === "down" && "bg-destructive/10 text-destructive",
            trend === "neutral" && "bg-muted text-muted-foreground"
          )}>
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
          </span>
        )}
      </div>
      
      <div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.2 }}
          className="text-2xl font-bold text-foreground"
        >
          {value}
        </motion.p>
        <p className="text-sm text-muted-foreground mt-0.5">{title}</p>
      </div>
    </motion.div>
  );
};
