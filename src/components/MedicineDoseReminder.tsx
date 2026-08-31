import { motion, AnimatePresence } from "framer-motion";
import { Pill, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MedicineDoseReminderProps {
  isVisible: boolean;
  medicine: any;
  onTaken: () => void;
  onNotTaken: () => void;
  onDismiss: () => void;
}

export const MedicineDoseReminder = ({
  isVisible,
  medicine,
  onTaken,
  onNotTaken,
  onDismiss,
}: MedicineDoseReminderProps) => {
  if (!isVisible || !medicine) return null;

  const nextDoseLabel = (() => {
    if (!medicine.medicine_next_dose_at) return "Now";
    const d = new Date(medicine.medicine_next_dose_at);
    if (Number.isNaN(d.getTime())) return "Now";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  })();

  const doseLabel = (() => {
    if (!medicine.medicine_is_dosaged) return "";
    const amt = medicine.medicine_dose_amount ?? 1;
    const unit = medicine.medicine_dose_unit ?? "dose";
    return `${amt} ${unit}`;
  })();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
        onClick={(e) => e.target === e.currentTarget && onDismiss()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 24 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-background rounded-3xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden border border-border"
        >
          <div className="px-6 py-5 bg-primary/10 border-b border-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
                <Pill className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-foreground text-lg">Medicine Reminder</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Due: {nextDoseLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={onDismiss}
                className="p-2 rounded-full hover:bg-secondary/60 text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="px-6 py-6 text-center">
            <h4 className="text-xl font-bold text-foreground mb-2">{medicine.name}</h4>
            {doseLabel && <p className="text-sm text-muted-foreground">Dose: {doseLabel}</p>}
          </div>

          <div className="px-6 pb-6 space-y-3">
            <Button onClick={onTaken} className="w-full h-12 text-base font-semibold" size="lg">
              Yes, I took it
            </Button>
            <Button onClick={onNotTaken} variant="outline" className="w-full h-11">
              No (remind me in 1 hour)
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
