import { useState, useEffect, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  household_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface Household {
  id: string;
  name: string;
  invite_code: string;
  creator_id?: string | null;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch all households through the join table
      const { data: memberships, error: memberError } = await supabase
        .from("household_members")
        .select("household_id")
        .eq("user_id", userId);

      if (memberError) throw memberError;

      if (memberships && memberships.length > 0) {
        const householdIds = memberships.map((m: any) => m.household_id);
        const { data: householdData, error: householdError } = await supabase
          .from("households")
          .select("*")
          .in("id", householdIds);

        if (householdError) throw householdError;
        setHouseholds(householdData || []);
      } else {
        setHouseholds([]);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setHouseholds([]);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refetch = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  // For backward compatibility: first household as default
  const household = households.length > 0 ? households[0] : null;

  return {
    user,
    session,
    profile,
    household,
    households,
    loading,
    signOut,
    refetch,
    isAuthenticated: !!user,
    hasHousehold: households.length > 0,
  };
};
