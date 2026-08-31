import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface HouseholdMember {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export const useHouseholdMembers = (householdId: string | null) => {
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    if (!householdId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    try {
      // Get member user IDs from join table, then fetch profiles
      const { data: memberships, error: memError } = await supabase
        .from("household_members")
        .select("user_id")
        .eq("household_id", householdId);

      if (memError) throw memError;
      if (!memberships || memberships.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }

      const userIds = memberships.map((m: any) => m.user_id);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return {
    members,
    loading,
    refetch: fetchMembers,
  };
};
