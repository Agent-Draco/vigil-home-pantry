import { useMemo } from "react";
import { motion } from "framer-motion";
import { NudgeFeed } from "@/components/NudgeFeed";
import { SpoonSureProfile } from "@/components/SpoonSureProfile";

interface NudgesViewProps {
  inventory: any[];
}

export const NudgesView = ({ inventory }: NudgesViewProps) => {
  const activeInventory = useMemo(() => inventory.filter((i) => !i?.is_out), [inventory]);

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Active Nudges</h1>
        <p className="text-muted-foreground">Recipe rescues, expiry alerts, and smart actions.</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
        <h2 className="font-semibold text-foreground mb-2">SpoonSure Profile</h2>
        <p className="text-sm text-muted-foreground mb-4">Personalize recipes (diet, allergies) for better rescue missions.</p>
        <SpoonSureProfile />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
        <NudgeFeed inventory={activeInventory} />
      </motion.div>
    </div>
  );
};
