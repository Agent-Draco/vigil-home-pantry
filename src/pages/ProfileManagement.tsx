import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mail, User, Home, Merge, Trash2, LogOut, AlertTriangle, Check, X, Bell } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MergeRequest {
  id: string;
  requester_household_id: string;
  target_household_id: string;
  requester_id: string;
  status: string;
  created_at: string;
}

const ProfileManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, household, signOut, refetch } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [newEmail, setNewEmail] = useState("");
  const [mergeInviteCode, setMergeInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [incomingMergeRequests, setIncomingMergeRequests] = useState<MergeRequest[]>([]);
  const [outgoingMergeRequests, setOutgoingMergeRequests] = useState<MergeRequest[]>([]);
  const [householdCreatorId, setHouseholdCreatorId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.display_name) setDisplayName(profile.display_name);
  }, [profile?.display_name]);

  useEffect(() => {
    if (household?.id) {
      fetchHouseholdCreator();
      fetchMergeRequests();

      // Subscribe to realtime merge request changes
      const channel = supabase
        .channel('merge-requests')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'merge_requests' }, () => {
          fetchMergeRequests();
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [household?.id, user?.id]);

  const fetchHouseholdCreator = async () => {
    if (!household?.id) return;
    const { data } = await supabase
      .from("households")
      .select("creator_id")
      .eq("id", household.id)
      .maybeSingle();
    setHouseholdCreatorId((data as any)?.creator_id || null);
  };

  const fetchMergeRequests = async () => {
    if (!household?.id || !user?.id) return;

    // Incoming: requests targeting this household
    const { data: incoming } = await supabase
      .from("merge_requests")
      .select("*")
      .eq("target_household_id", household.id)
      .eq("status", "pending");
    setIncomingMergeRequests((incoming as MergeRequest[]) || []);

    // Outgoing: requests from this household
    const { data: outgoing } = await supabase
      .from("merge_requests")
      .select("*")
      .eq("requester_household_id", household.id)
      .eq("status", "pending");
    setOutgoingMergeRequests((outgoing as MergeRequest[]) || []);
  };

  const handleUpdateName = async () => {
    if (!user || !displayName.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim() })
        .eq("id", user.id);
      if (error) throw error;
      await refetch();
      toast({ title: "Name updated", description: "Your display name has been changed." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;
      toast({
        title: "Verification email sent",
        description: "Check your new email address to confirm the change.",
      });
      setNewEmail("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMergeRequest = async () => {
    if (!mergeInviteCode.trim() || !household?.id || !user?.id) return;
    setLoading(true);
    try {
      // Find the target household by invite code
      const { data: targetHousehold, error: findError } = await supabase
        .from("households")
        .select("id, name, creator_id")
        .eq("invite_code", mergeInviteCode.trim().toUpperCase())
        .maybeSingle();

      if (findError) throw findError;
      if (!targetHousehold) throw new Error("No household found with that invite code.");
      if (targetHousehold.id === household.id) throw new Error("You can't merge with your own household.");

      // Check if user is the creator of their household
      if (householdCreatorId !== user.id) {
        throw new Error("Only the household creator can initiate a merge request.");
      }

      // Check for existing pending request
      const { data: existing } = await supabase
        .from("merge_requests")
        .select("id")
        .eq("requester_household_id", household.id)
        .eq("target_household_id", targetHousehold.id)
        .eq("status", "pending")
        .maybeSingle();

      if (existing) throw new Error("A merge request to this household is already pending.");

      const { error } = await supabase
        .from("merge_requests")
        .insert({
          requester_household_id: household.id,
          target_household_id: targetHousehold.id,
          requester_id: user.id,
        });

      if (error) throw error;

      toast({
        title: "Merge request sent!",
        description: `Waiting for ${targetHousehold.name}'s creator to approve.`,
      });
      setMergeInviteCode("");
      await fetchMergeRequests();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveMerge = async (requestId: string, requesterHouseholdId: string) => {
    if (!household?.id || !user?.id) return;

    // Only the creator of the target household can approve
    if (householdCreatorId !== user.id) {
      toast({ title: "Error", description: "Only the household creator can approve merge requests.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Move all members from requester household to this household
      const { error: moveError } = await supabase
        .from("profiles")
        .update({ household_id: household.id })
        .eq("household_id", requesterHouseholdId);
      if (moveError) throw moveError;

      // Update merge request status
      const { error: statusError } = await supabase
        .from("merge_requests")
        .update({ status: "approved" })
        .eq("id", requestId);
      if (statusError) throw statusError;

      // Delete the old (now empty) household
      await supabase.from("households").delete().eq("id", requesterHouseholdId);

      toast({ title: "Households merged!", description: "All members and data have been combined." });
      await refetch();
      await fetchMergeRequests();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRejectMerge = async (requestId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("merge_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);
      if (error) throw error;
      toast({ title: "Merge request rejected" });
      await fetchMergeRequests();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHousehold = async () => {
    if (!household?.id || !user?.id) return;

    if (householdCreatorId !== user.id) {
      toast({ title: "Error", description: "Only the household creator can delete the household.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Clear household_id from all members' profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ household_id: null })
        .eq("household_id", household.id);
      if (profileError) throw profileError;

      // Delete the household (cascade will delete merge_requests)
      const { error: deleteError } = await supabase
        .from("households")
        .delete()
        .eq("id", household.id);
      if (deleteError) throw deleteError;

      toast({ title: "Household deleted", description: "You can now create or join a new household." });
      await refetch();
      navigate("/onboarding", { replace: true });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleLeaveHousehold = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ household_id: null })
        .eq("id", user.id);
      if (error) throw error;

      toast({ title: "Left household", description: "You can now join or create a new household." });
      await refetch();
      navigate("/onboarding", { replace: true });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const isCreator = householdCreatorId === user?.id;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-6"
        >
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Profile & Household</h1>
            <p className="text-sm text-muted-foreground">Manage your account and household settings</p>
          </div>
        </motion.div>

        {/* Incoming Merge Requests Notification */}
        {incomingMergeRequests.length > 0 && (
          <GlassCard className="mb-4 border-2 border-primary/30" delay={0.05}>
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Incoming Merge Requests</h3>
            </div>
            <div className="space-y-3">
              {incomingMergeRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3 bg-background/50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium">Household wants to merge with yours</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(req.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {isCreator && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApproveMerge(req.id, req.requester_household_id)}
                        disabled={loading}
                        className="bg-primary"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRejectMerge(req.id)}
                        disabled={loading}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Edit Display Name */}
        <GlassCard className="mb-4" delay={0.1}>
          <div className="flex items-center gap-2 mb-3">
            <User className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Display Name</h3>
          </div>
          <div className="flex gap-2">
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
            />
            <Button onClick={handleUpdateName} disabled={loading || !displayName.trim()}>
              Save
            </Button>
          </div>
        </GlassCard>

        {/* Change Email */}
        <GlassCard className="mb-4" delay={0.15}>
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Change Email</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Current: {user?.email || "Not set"}
          </p>
          <div className="flex gap-2">
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="New email address"
            />
            <Button onClick={handleChangeEmail} disabled={loading || !newEmail.trim()}>
              Change
            </Button>
          </div>
        </GlassCard>

        {/* Household Info */}
        <GlassCard className="mb-4" delay={0.2}>
          <div className="flex items-center gap-2 mb-3">
            <Home className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Household</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Name</span>
              <span className="text-sm font-medium">{household?.name || "None"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Invite Code</span>
              <span className="text-sm font-mono font-medium">{household?.invite_code || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Role</span>
              <span className="text-sm font-medium">{isCreator ? "Creator" : "Member"}</span>
            </div>
          </div>
        </GlassCard>

        {/* Merge Households */}
        <GlassCard className="mb-4" delay={0.25}>
          <div className="flex items-center gap-2 mb-3">
            <Merge className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Merge Households</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Combine two households into one. Both creators must approve. Enter the other household's invite code.
          </p>
          {!isCreator ? (
            <p className="text-sm text-amber-500">Only the household creator can initiate merges.</p>
          ) : (
            <div className="flex gap-2">
              <Input
                value={mergeInviteCode}
                onChange={(e) => setMergeInviteCode(e.target.value)}
                placeholder="e.g. ABCD-1234"
                className="font-mono"
              />
              <Button onClick={handleSendMergeRequest} disabled={loading || !mergeInviteCode.trim()}>
                Request
              </Button>
            </div>
          )}

          {/* Outgoing requests */}
          {outgoingMergeRequests.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Pending outgoing requests:</p>
              {outgoingMergeRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                  <span className="text-xs text-muted-foreground">Awaiting approval</span>
                  <span className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Leave / Delete Household */}
        <GlassCard className="mb-4" delay={0.3}>
          <div className="flex items-center gap-2 mb-3">
            <Trash2 className="w-5 h-5 text-destructive" />
            <h3 className="font-semibold text-foreground">Leave or Delete Household</h3>
          </div>
          <div className="space-y-3">
            {!isCreator && (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleLeaveHousehold}
                disabled={loading}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Leave Household
              </Button>
            )}

            {isCreator && (
              <>
                {!showDeleteConfirm ? (
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Household
                  </Button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                      <p className="text-sm font-medium text-destructive">Are you sure?</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      This will permanently delete <strong>{household?.name}</strong> and remove all members. 
                      Inventory data in the external system will remain but become inaccessible.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setShowDeleteConfirm(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={handleDeleteHousehold}
                        disabled={loading}
                      >
                        {loading ? "Deleting..." : "Confirm Delete"}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default ProfileManagement;
