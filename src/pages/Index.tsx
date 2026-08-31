import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Header } from "@/components/Header";
import { GlassNav } from "@/components/GlassNav";
import { RemovalModeToggle } from "@/components/RemovalModeToggle";
import { SuccessFlash } from "@/components/SuccessFlash";
import { HomeView } from "@/components/views/HomeView";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useInventory } from "@/hooks/useInventory";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useExpiryNotifications } from "@/hooks/useExpiryNotifications";
import { quickAddPresets } from "@/components/QuickAddPreset";
import { Loader2 } from "lucide-react";
import { vigilSupabase } from "@/integrations/vigil/client";

// Lazy load less critical components for better initial load
const PopUpReminder = lazy(() => import("@/components/PopUpReminder").then(m => ({ default: m.PopUpReminder })));
const MedicineDoseReminder = lazy(() => import("@/components/MedicineDoseReminder").then(m => ({ default: m.MedicineDoseReminder })));
const RecipeDrawer = lazy(() => import("@/components/RecipeDrawer").then(m => ({ default: m.RecipeDrawer })));
const InventoryView = lazy(() => import("@/components/views/InventoryView").then(m => ({ default: m.InventoryView })));
const ShoppingListView = lazy(() => import("@/components/views/ShoppingListView").then(m => ({ default: m.ShoppingListView })));
const ScanView = lazy(() => import("@/components/views/ScanView").then(m => ({ default: m.ScanView })));
const FamilyView = lazy(() => import("@/components/views/FamilyView").then(m => ({ default: m.FamilyView })));
const SettingsView = lazy(() => import("@/components/views/SettingsView").then(m => ({ default: m.SettingsView })));
const CommView = lazy(() => import("@/components/views/CommView").then(m => ({ default: m.CommView })));
const NudgesView = lazy(() => import("@/components/views/NudgesView").then(m => ({ default: m.NudgesView })));
const FeedbackPage = lazy(() => import("@/pages/Feedback"));

const ViewLoader = () => (
  <div className="flex items-center justify-center py-20">
    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
  </div>
);

const Index = () => {
  const { householdId } = useParams<{ householdId: string }>();
  const [activeTab, setActiveTab] = useState("home");
  const [removalMode, setRemovalMode] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [expiringItems, setExpiringItems] = useState([]);
  const [dueMedicineId, setDueMedicineId] = useState<string | null>(null);
  const [recipeIngredient, setRecipeIngredient] = useState<string | null>(null);
  const [commListings, setCommListings] = useState<
    Array<{ id: string; title: string; mode: "s-comm" | "b-comm"; lister_name?: string; quantity?: number; unit?: string | null }>
  >([]);
  const navigate = useNavigate();

  const { user, profile, households, loading: authLoading, signOut } = useAuth();
  
  // Find the current household from the route param
  const currentHousehold = households.find(h => h.id === householdId) || null;
  const effectiveHouseholdId = householdId || null;

  const { items: inventory, loading: inventoryLoading, addItem, deleteItem, updateItem, decrementItem } = useInventory(effectiveHouseholdId);
  const { items: shoppingList, loading: shoppingListLoading, addItem: addShoppingItem, deleteItem: deleteShoppingItem } = useShoppingList(effectiveHouseholdId);

  const { expiringCount, expiredCount } = useExpiryNotifications(inventory as any, {
    warningDays: 3,
    checkInterval: 300000,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    } else if (!authLoading && user && households.length === 0) {
      navigate("/households");
    } else if (!authLoading && user && householdId && !currentHousehold) {
      // Invalid household ID - redirect to selector
      navigate("/households");
    }
  }, [authLoading, user, households, householdId, currentHousehold, navigate]);

  // Check for expiring items and show reminder on initial load
  useEffect(() => {
    if (inventory.length > 0) {
      const now = new Date();
      const expiringSoon = inventory.filter(item => {
        if (!item.expiry_date || item.is_out) return false;
        const expiryDate = new Date(item.expiry_date);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry <= 3 && daysUntilExpiry >= 0;
      }).map(item => {
        const expiryDate = new Date(item.expiry_date!);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return { id: item.id, name: item.name, expiry_date: item.expiry_date!, daysUntilExpiry };
      });

      if (expiringSoon.length > 0 && !showReminder) {
        setExpiringItems(expiringSoon);
        setTimeout(() => setShowReminder(true), 1000);
      }
    }
  }, [inventory]);

  useEffect(() => {
    if (!showReminder) return;
    let cancelled = false;
    const fetchCommListings = async () => {
      try {
        const { data, error } = await vigilSupabase
          .from("listings")
          .select("id,title,mode,lister_name,quantity,unit")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(12);
        if (error) throw error;
        if (!cancelled) setCommListings(((data as any[]) || []) as any);
      } catch {
        if (!cancelled) setCommListings([]);
      }
    };
    void fetchCommListings();
    return () => { cancelled = true; };
  }, [showReminder]);

  const handleItemClick = async (id: string) => {
    if (removalMode) {
      const success = await deleteItem(id);
      if (success) {
        setShowFlash(true);
        setTimeout(() => setShowFlash(false), 300);
      }
    }
  };

  const handleQuickAdd = async (name: string) => {
    const preset = quickAddPresets.find(p => p.name === name);
    const today = new Date();
    const manufacturingDate = today.toISOString().split('T')[0];
    let expiryDate: string;
    const nameLower = name.toLowerCase();

    if (nameLower.includes('milk') || nameLower.includes('cheese') || nameLower.includes('yogurt') || nameLower.includes('butter')) {
      const expiry = new Date(today); expiry.setDate(today.getDate() + 10); expiryDate = expiry.toISOString().split('T')[0];
    } else if (nameLower.includes('chicken') || nameLower.includes('salmon') || nameLower.includes('meat')) {
      const expiry = new Date(today); expiry.setDate(today.getDate() + 4); expiryDate = expiry.toISOString().split('T')[0];
    } else if (nameLower.includes('bread')) {
      const expiry = new Date(today); expiry.setDate(today.getDate() + 4); expiryDate = expiry.toISOString().split('T')[0];
    } else if (nameLower.includes('rice') || nameLower.includes('grains')) {
      const expiry = new Date(today); expiry.setFullYear(today.getFullYear() + 1); expiryDate = expiry.toISOString().split('T')[0];
    } else if (nameLower.includes('juice') || nameLower.includes('beverages')) {
      const expiry = new Date(today); expiry.setDate(today.getDate() + 10); expiryDate = expiry.toISOString().split('T')[0];
    } else {
      const expiry = new Date(today); expiry.setDate(today.getDate() + 10); expiryDate = expiry.toISOString().split('T')[0];
    }

    await addItem({ name, category: preset?.category, manufacturing_date: manufacturingDate, expiry_date: expiryDate });
  };

  const handleAddItem = async (item: {
    name: string; barcode?: string; exp?: string; mfg?: string; item_type?: "food" | "medicine"; category?: string;
    medicine_is_dosaged?: boolean; medicine_dose_amount?: number; medicine_dose_unit?: string;
    medicine_dose_times?: string[]; medicine_timezone?: string; medicine_next_dose_at?: string;
  }) => {
    const result = await addItem({
      name: item.name, barcode: item.barcode, expiry_date: item.exp, manufacturing_date: item.mfg,
      item_type: item.item_type, category: item.category, medicine_is_dosaged: item.medicine_is_dosaged,
      medicine_dose_amount: item.medicine_dose_amount, medicine_dose_unit: item.medicine_dose_unit,
      medicine_dose_times: item.medicine_dose_times, medicine_timezone: item.medicine_timezone,
      medicine_next_dose_at: item.medicine_next_dose_at,
    });

    if (result) {
      const shoppingItem = shoppingList.find(s => s.item_name.toLowerCase() === item.name.toLowerCase());
      if (shoppingItem) await deleteShoppingItem(shoppingItem.id);
    }
    return result;
  };

  const computeNextDoseAt = (times: string[] | null | undefined, now = new Date()) => {
    if (!times || times.length === 0) return null;
    const sorted = [...times].sort();
    for (const t of sorted) {
      const [hhRaw, mmRaw] = t.split(":");
      const hh = parseInt(hhRaw, 10); const mm = parseInt(mmRaw, 10);
      if (Number.isNaN(hh) || Number.isNaN(mm)) continue;
      const candidate = new Date(now); candidate.setSeconds(0, 0); candidate.setHours(hh, mm, 0, 0);
      if (candidate.getTime() > now.getTime()) return candidate.toISOString();
    }
    const [hhRaw, mmRaw] = sorted[0].split(":");
    const hh = parseInt(hhRaw, 10); const mm = parseInt(mmRaw, 10);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    const next = new Date(now); next.setDate(now.getDate() + 1); next.setSeconds(0, 0); next.setHours(hh, mm, 0, 0);
    return next.toISOString();
  };

  useEffect(() => {
    if (dueMedicineId) return;
    if (!inventory || inventory.length === 0) return;
    const now = new Date();
    const due = inventory.find((it: any) => {
      if (it.is_out || it.item_type !== "medicine" || !it.medicine_is_dosaged || !it.medicine_next_dose_at) return false;
      const next = new Date(it.medicine_next_dose_at);
      if (Number.isNaN(next.getTime()) || next.getTime() > now.getTime()) return false;
      if (it.medicine_snooze_until) {
        const snooze = new Date(it.medicine_snooze_until);
        if (!Number.isNaN(snooze.getTime()) && snooze.getTime() > now.getTime()) return false;
      }
      return true;
    });
    if (due?.id) setDueMedicineId(due.id);
  }, [inventory, dueMedicineId]);

  const dueMedicine = dueMedicineId ? (inventory as any).find((it: any) => it.id === dueMedicineId) : null;
  const notificationCount = expiringCount + expiredCount;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !currentHousehold) return null;

  const renderView = () => {
    switch (activeTab) {
      case "home":
        return (
          <HomeView inventory={inventory} onItemClick={handleItemClick} onQuickAdd={handleQuickAdd}
            shoppingList={shoppingList} onViewShoppingList={() => setActiveTab("shopping")}
            shoppingListLoading={shoppingListLoading} loading={inventoryLoading} />
        );
      case "inventory":
        return <Suspense fallback={<ViewLoader />}><InventoryView inventory={inventory} onItemClick={handleItemClick} loading={inventoryLoading} /></Suspense>;
      case "shopping":
        return <Suspense fallback={<ViewLoader />}><ShoppingListView shoppingList={shoppingList} onAddItem={addShoppingItem} onDeleteItem={deleteShoppingItem} loading={shoppingListLoading} /></Suspense>;
      case "scan":
        return <Suspense fallback={<ViewLoader />}><ScanView onAddItem={handleAddItem} /></Suspense>;
      case "family":
        return <Suspense fallback={<ViewLoader />}><FamilyView household={currentHousehold} currentUserId={user?.id || null} /></Suspense>;
      case "nudges":
        return <Suspense fallback={<ViewLoader />}><NudgesView inventory={inventory} /></Suspense>;
      case "comm":
        return <Suspense fallback={<ViewLoader />}><CommView household={currentHousehold} currentUserId={user?.id || null} inventory={inventory} /></Suspense>;
      case "feedback":
        return <Suspense fallback={<ViewLoader />}><FeedbackPage /></Suspense>;
      case "settings":
        return <Suspense fallback={<ViewLoader />}><SettingsView profile={profile} household={currentHousehold} onSignOut={signOut} /></Suspense>;
      default:
        return null;
    }
  };

  return (
    <div className={cn("min-h-screen transition-colors duration-500", removalMode ? "removal-mode" : "bg-background")}>
      <SuccessFlash isVisible={showFlash} />
      <Header 
        userName={profile?.display_name || "User"} 
        householdName={currentHousehold.name}
        notificationCount={notificationCount}
        onBackToHouseholds={households.length > 1 ? () => navigate("/households") : undefined}
      />

      <MedicineDoseReminder
        isVisible={Boolean(dueMedicine)}
        medicine={dueMedicine}
        onTaken={async () => {
          if (!dueMedicine) return;
          const now = new Date();
          const nextDoseAt = computeNextDoseAt(dueMedicine.medicine_dose_times, now);
          await decrementItem(dueMedicine.id);
          await updateItem(dueMedicine.id, { medicine_last_taken_at: now.toISOString(), medicine_snooze_until: null, medicine_next_dose_at: nextDoseAt } as any);
          setDueMedicineId(null);
        }}
        onNotTaken={async () => {
          if (!dueMedicine) return;
          const snooze = new Date(); snooze.setHours(snooze.getHours() + 1);
          await updateItem(dueMedicine.id, { medicine_snooze_until: snooze.toISOString() } as any);
          setDueMedicineId(null);
        }}
        onDismiss={() => setDueMedicineId(null)}
      />
      
      <main className="pt-24 pb-44 px-4 max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {(activeTab === "home" || activeTab === "inventory") && (
        <RemovalModeToggle isActive={removalMode} onToggle={() => setRemovalMode(!removalMode)} />
      )}
      
      <GlassNav activeTab={activeTab} onTabChange={setActiveTab} />

      <Suspense fallback={null}>
        <PopUpReminder isVisible={showReminder} expiringItems={expiringItems} onDismiss={() => setShowReminder(false)}
          onAddToShoppingList={async (itemName) => { await addShoppingItem({ item_name: itemName, quantity: 1 }); setShowReminder(false); }}
          onSeeRecipes={(ingredient) => { setRecipeIngredient(ingredient); setShowReminder(false); }}
          commListings={commListings}
        />
        <RecipeDrawer isOpen={Boolean(recipeIngredient)} ingredient={recipeIngredient ?? ""} onClose={() => setRecipeIngredient(null)} />
      </Suspense>
    </div>
  );
};

export default Index;
