import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/GlassCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Home, Users, Loader2, ArrowRight } from "lucide-react";

const Onboarding = () => {
  const [mode, setMode] = useState<"choice" | "create" | "join">("choice");
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkHousehold();
  }, []);

  const checkHousehold = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("household_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.household_id) {
      navigate("/dashboard", { replace: true });
    }
  };

  const handleCreateHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your household",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create household
      const { data: household, error: householdError } = await supabase
        .from("households")
        .insert({ name: householdName.trim(), creator_id: user.id } as any)
        .select()
        .single();

      if (householdError) throw householdError;

      // Upsert profile with household_id
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({ id: user.id, household_id: household.id }, { onConflict: 'id' });
      if (profileError) throw profileError;

      // Add to household_members join table
      await supabase
        .from("household_members")
        .insert({ user_id: user.id, household_id: household.id } as any);

      toast({
        title: "Household created!",
        description: `Welcome to ${household.name}. Your invite code is ${household.invite_code}`,
      });

      navigate("/households", { replace: true });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      toast({
        title: "Code required",
        description: "Please enter an invite code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Find household by invite code
      const { data: household, error: findError } = await supabase
        .from("households")
        .select("id, name")
        .eq("invite_code", inviteCode.trim().toUpperCase())
        .maybeSingle();

      if (findError) throw findError;
      if (!household) {
        throw new Error("Invalid invite code. Please check and try again.");
      }

      // Upsert profile with household_id
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({ id: user.id, household_id: household.id }, { onConflict: 'id' });
      if (profileError) throw profileError;

      // Add to household_members join table
      await supabase
        .from("household_members")
        .insert({ user_id: user.id, household_id: household.id } as any);

      toast({
        title: "Joined household!",
        description: `Welcome to ${household.name}`,
      });

      navigate("/households", { replace: true });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/30 flex items-center justify-center"
          >
            <span className="text-4xl">🏠</span>
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground">
            {mode === "choice" && "Set Up Your Kitchen"}
            {mode === "create" && "Create Household"}
            {mode === "join" && "Join Household"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {mode === "choice" && "Create a new household or join an existing one"}
            {mode === "create" && "Name your kitchen inventory"}
            {mode === "join" && "Enter the invite code from your family"}
          </p>
        </div>

        {mode === "choice" && (
          <div className="space-y-4">
            <GlassCard
              onClick={() => setMode("create")}
              className="flex items-center gap-4 cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Home className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Create Household</h3>
                <p className="text-sm text-muted-foreground">Start a new kitchen inventory</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </GlassCard>

            <GlassCard
              onClick={() => setMode("join")}
              className="flex items-center gap-4 cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-accent-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Join Household</h3>
                <p className="text-sm text-muted-foreground">Enter an invite code</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </GlassCard>
          </div>
        )}

        {mode === "create" && (
          <GlassCard className="p-6">
            <form onSubmit={handleCreateHousehold} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="householdName">Household Name</Label>
                <Input
                  id="householdName"
                  type="text"
                  placeholder="The Smith Kitchen"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  autoFocus
                />
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Household"
                )}
              </motion.button>

              <button
                type="button"
                onClick={() => setMode("choice")}
                className="w-full py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Back
              </button>
            </form>
          </GlassCard>
        )}

        {mode === "join" && (
          <GlassCard className="p-6">
            <form onSubmit={handleJoinHousehold} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inviteCode">Invite Code</Label>
                <Input
                  id="inviteCode"
                  type="text"
                  placeholder="XXXX-XXXX"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="font-mono text-center text-lg tracking-wider"
                  autoFocus
                />
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  "Join Household"
                )}
              </motion.button>

              <button
                type="button"
                onClick={() => setMode("choice")}
                className="w-full py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Back
              </button>
            </form>
          </GlassCard>
        )}
      </motion.div>
    </div>
  );
};

export default Onboarding;
