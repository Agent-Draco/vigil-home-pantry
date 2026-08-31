import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Home, Plus, Users, ArrowRight, Loader2, Pencil, Check, X, LogOut } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, Household } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import asteriskLogo from "@/assets/asterisk.png";

const HouseholdSelector = () => {
  const { user, households, loading, refetch, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [mode, setMode] = useState<"list" | "create" | "join">("list");
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [loading, user, navigate]);

  // If user has exactly one household and isn't in create/join mode, go directly
  useEffect(() => {
    if (!loading && households.length === 1 && mode === "list") {
      navigate(`/household/${households[0].id}`, { replace: true });
    }
  }, [loading, households, mode, navigate]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdName.trim() || !user) return;
    setSubmitting(true);

    try {
      const { data: household, error: hErr } = await supabase
        .from("households")
        .insert({ name: householdName.trim(), creator_id: user.id } as any)
        .select()
        .single();
      if (hErr) throw hErr;

      const { error: mErr } = await supabase
        .from("household_members")
        .insert({ user_id: user.id, household_id: household.id } as any);
      if (mErr) throw mErr;

      await supabase
        .from("profiles")
        .update({ household_id: household.id })
        .eq("id", user.id);

      toast({ title: "Household created!", description: `Welcome to ${household.name}. Invite code: ${household.invite_code}` });
      await refetch();
      setHouseholdName("");
      setMode("list");
      navigate(`/household/${household.id}`, { replace: true });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || !user) return;
    setSubmitting(true);

    try {
      const codeInput = inviteCode.trim().toUpperCase();

      // First try permanent invite code
      let household: any = null;
      const { data: permHousehold, error: permError } = await supabase
        .from("households")
        .select("id, name, invite_code")
        .eq("invite_code", codeInput)
        .maybeSingle();
      if (permError) throw permError;

      if (permHousehold) {
        household = permHousehold;
      } else {
        // Try OTP code (4-digit numerical)
        const { data: invitation, error: invErr } = await supabase
          .from("household_invitations")
          .select("id, household_id, expires_at, used")
          .eq("code", codeInput)
          .eq("used", false)
          .maybeSingle();
        if (invErr) throw invErr;
        if (!invitation) throw new Error("Invalid invite code.");

        // Check expiry
        if (new Date(invitation.expires_at) < new Date()) {
          throw new Error("This code has expired. Please request a new one.");
        }

        // Mark as used
        await supabase
          .from("household_invitations")
          .update({ used: true } as any)
          .eq("id", invitation.id);

        // Get household details
        const { data: otpHousehold, error: hErr } = await supabase
          .from("households")
          .select("id, name, invite_code")
          .eq("id", invitation.household_id)
          .single();
        if (hErr) throw hErr;
        household = otpHousehold;
      }

      // Check if already a member
      const { data: existingMembership } = await supabase
        .from("household_members")
        .select("id")
        .eq("user_id", user.id)
        .eq("household_id", household.id)
        .maybeSingle();

      if (existingMembership) {
        toast({ title: "Already a member", description: `You're already in ${household.name}` });
        navigate(`/household/${household.id}`, { replace: true });
        return;
      }

      const { error: mErr } = await supabase
        .from("household_members")
        .insert({ user_id: user.id, household_id: household.id } as any);
      if (mErr) throw mErr;

      await supabase
        .from("profiles")
        .update({ household_id: household.id })
        .eq("id", user.id);

      toast({ title: "Joined household!", description: `Welcome to ${household.name}` });
      await refetch();
      setInviteCode("");
      setMode("list");
      navigate(`/household/${household.id}`, { replace: true });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeave = async (householdId: string, householdName: string) => {
    if (!user) return;
    try {
      // Remove from join table
      const { error } = await supabase
        .from("household_members")
        .delete()
        .eq("user_id", user.id)
        .eq("household_id", householdId);
      if (error) throw error;

      // If profile points to this household, clear it
      const { data: profileData } = await supabase
        .from("profiles")
        .select("household_id")
        .eq("id", user.id)
        .single();

      if (profileData?.household_id === householdId) {
        // Set to another household or null
        const remainingHouseholds = households.filter(h => h.id !== householdId);
        const newHouseholdId = remainingHouseholds.length > 0 ? remainingHouseholds[0].id : null;
        await supabase
          .from("profiles")
          .update({ household_id: newHouseholdId })
          .eq("id", user.id);
      }

      toast({ title: "Left household", description: `You left ${householdName}` });
      await refetch();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleRename = async (householdId: string) => {
    if (!renameValue.trim()) return;
    try {
      const { error } = await supabase
        .from("households")
        .update({ name: renameValue.trim() })
        .eq("id", householdId);
      if (error) throw error;
      toast({ title: "Renamed", description: "Household name updated" });
      setRenamingId(null);
      await refetch();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If 0 households, show onboarding-like create/join
  if (households.length === 0 && mode === "list") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/30 flex items-center justify-center">
              <span className="text-4xl">🏠</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Set Up Your Kitchen</h1>
            <p className="text-muted-foreground mt-2">Create a new household or join an existing one</p>
          </div>
          <div className="space-y-4">
            <GlassCard onClick={() => setMode("create")} className="flex items-center gap-4 cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Home className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Create Household</h3>
                <p className="text-sm text-muted-foreground">Start a new kitchen inventory</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </GlassCard>
            <GlassCard onClick={() => setMode("join")} className="flex items-center gap-4 cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-accent-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Join Household</h3>
                <p className="text-sm text-muted-foreground">Enter an invite or one-time code</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </GlassCard>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-nav fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={asteriskLogo} alt="Asterisk" className="w-10 h-10 object-contain" />
            <span className="text-xl font-semibold text-foreground">My Households</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={signOut}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign Out
          </motion.button>
        </div>
      </header>

      <main className="pt-24 pb-10 px-4 max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {mode === "list" && (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {households.map((h, i) => (
                <GlassCard key={h.id} delay={i * 0.05} className="flex items-center gap-4">
                  {renamingId === h.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="flex-1"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === "Enter") handleRename(h.id); if (e.key === "Escape") setRenamingId(null); }}
                      />
                      <button onClick={() => handleRename(h.id)} className="p-2 text-primary hover:bg-primary/10 rounded-lg"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setRenamingId(null)} className="p-2 text-muted-foreground hover:bg-muted/10 rounded-lg"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 cursor-pointer" onClick={() => navigate(`/household/${h.id}`)}>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Home className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{h.name}</h3>
                            <p className="text-xs text-muted-foreground">Code: {h.invite_code}</p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setRenamingId(h.id); setRenameValue(h.name); }}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/10 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Leave "${h.name}"? You'll need an invite to rejoin.`)) {
                            handleLeave(h.id, h.name);
                          }
                        }}
                        className="p-2 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        title="Leave household"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                      <ArrowRight className="w-5 h-5 text-muted-foreground" />
                    </>
                  )}
                </GlassCard>
              ))}

              <div className="grid grid-cols-2 gap-3 pt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setMode("create")}
                  className="py-4 rounded-2xl bg-primary/10 text-primary font-semibold flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create New
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setMode("join")}
                  className="py-4 rounded-2xl bg-accent/10 text-accent-foreground font-semibold flex items-center justify-center gap-2"
                >
                  <Users className="w-5 h-5" />
                  Join Existing
                </motion.button>
              </div>
            </motion.div>
          )}

          {mode === "create" && (
            <motion.div key="create" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <GlassCard className="p-6">
                <h2 className="text-xl font-bold text-foreground mb-4">Create Household</h2>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="householdName">Household Name</Label>
                    <Input id="householdName" placeholder="The Smith Kitchen" value={householdName} onChange={(e) => setHouseholdName(e.target.value)} autoFocus />
                  </div>
                  <motion.button type="submit" disabled={submitting} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</> : "Create Household"}
                  </motion.button>
                  <button type="button" onClick={() => setMode("list")} className="w-full py-2 text-muted-foreground hover:text-foreground transition-colors">Back</button>
                </form>
              </GlassCard>
            </motion.div>
          )}

          {mode === "join" && (
            <motion.div key="join" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <GlassCard className="p-6">
                <h2 className="text-xl font-bold text-foreground mb-4">Join Household</h2>
                <form onSubmit={handleJoin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="inviteCode">Invite Code or One-Time PIN</Label>
                    <Input id="inviteCode" placeholder="XXXX-XXXX or 4-digit PIN" value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} className="font-mono text-center text-lg tracking-wider" autoFocus />
                    <p className="text-xs text-muted-foreground">Enter either a permanent invite code or a 4-digit one-time PIN</p>
                  </div>
                  <motion.button type="submit" disabled={submitting} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Joining...</> : "Join Household"}
                  </motion.button>
                  <button type="button" onClick={() => setMode("list")} className="w-full py-2 text-muted-foreground hover:text-foreground transition-colors">Back</button>
                </form>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default HouseholdSelector;
