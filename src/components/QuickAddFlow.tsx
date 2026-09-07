import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, FileImage, Loader2, ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseSmartAddImage, parseSmartAddText, type SmartAddDraft } from "@/lib/smartAddParser";
import type { QuickAddPresetData } from "@/components/QuickAddPreset";

interface QuickAddFlowProps {
  preset: QuickAddPresetData | null;
  onClose: () => void;
  onAdd: (draft: SmartAddDraft) => void;
}

export const QuickAddFlow = ({ preset, onClose, onAdd }: QuickAddFlowProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<SmartAddDraft | null>(null);
  const [reading, setReading] = useState(false);

  const handleTextParse = () => setDraft(parseSmartAddText(text || preset?.name || ""));

  const handleImage = async (file?: File) => {
    if (!file) return;
    setReading(true);
    try {
      setDraft(await parseSmartAddImage(file));
    } catch {
      setDraft(parseSmartAddText(file.name.replace(/[-_]/g, " ")));
    } finally {
      setReading(false);
    }
  };

  return (
    <AnimatePresence>
      {preset && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-4 sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div role="dialog" aria-modal="true" className="glass-card w-full max-w-md rounded-3xl p-6 shadow-2xl" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}>
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Quick add</p>
                <h2 className="mt-1 text-2xl font-semibold text-foreground">{preset.emoji} {preset.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">A preview of your pantry entry.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close quick add"><X className="h-5 w-5" /></Button>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground" htmlFor="quick-add-text">Label text</label>
                <Input id="quick-add-text" className="mt-2" value={text} onChange={(event) => setText(event.target.value)} placeholder={`Try: ${preset.name} | exp 2026-09-20`} />
                <Button className="mt-3 w-full" variant="secondary" onClick={handleTextParse}><ScanLine className="mr-2 h-4 w-4" />Read text</Button>
              </div>

              <button type="button" className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10" onClick={() => fileInputRef.current?.click()}>
                <FileImage className="h-5 w-5 text-primary" />
                <span><span className="block text-sm font-medium text-foreground">Read a product image</span><span className="block text-xs text-muted-foreground">Local text scan, no account connection needed</span></span>
                {reading && <Loader2 className="ml-auto h-4 w-4 animate-spin text-primary" />}
              </button>
              <input ref={fileInputRef} className="hidden" type="file" accept="image/*" onChange={(event) => void handleImage(event.target.files?.[0])} />

              {draft && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><Check className="h-4 w-4" /> Ready to add</div>
                  <p className="mt-2 font-medium text-foreground">{draft.name}</p>
                  <p className="text-xs text-muted-foreground">{draft.category}{draft.expiryDate ? ` · expires ${draft.expiryDate}` : " · expiry date to confirm"}</p>
                  <Button className="mt-4 w-full" onClick={() => onAdd(draft)}>Add to pantry</Button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};