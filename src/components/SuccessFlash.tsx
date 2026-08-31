import { motion, AnimatePresence } from "framer-motion";

interface SuccessFlashProps {
  isVisible: boolean;
}

export const SuccessFlash = ({ isVisible }: SuccessFlashProps) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] pointer-events-none bg-success"
        />
      )}
    </AnimatePresence>
  );
};
