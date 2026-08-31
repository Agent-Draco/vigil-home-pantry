import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, DollarSign, Package, Tag, Upload } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { cn } from "@/lib/utils";

interface EbayListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  oldItemName: string;
  newItemName: string;
  onConfirm: (listingData: {
    title: string;
    description: string;
    price: string;
    category: string;
  }) => void;
}

export const EbayListingModal = ({
  isOpen,
  onClose,
  oldItemName,
  newItemName,
  onConfirm
}: EbayListingModalProps) => {
  const [title, setTitle] = useState(`${oldItemName} - Used`);
  const [description, setDescription] = useState(
    `Upgrading from ${oldItemName} to ${newItemName}. Item is in good condition and fully functional.`
  );
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Electronics");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      title,
      description,
      price,
      category,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-background rounded-lg max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-orange-500" />
                  <h2 className="text-lg font-semibold">Mock eBay Listing</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Replacement detected:</strong> You have a {oldItemName} that could be listed on eBay.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Listing Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter listing title"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g., Electronics, Cell Phones"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="price">Starting Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your item"
                    rows={3}
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-orange-500 hover:bg-orange-600"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    List on eBay
                  </Button>
                </div>
              </form>

              <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  <strong>Note:</strong> This is a mock implementation. In a real app, this would integrate with eBay's API.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
