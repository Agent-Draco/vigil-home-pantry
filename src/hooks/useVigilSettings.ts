import { useState, useEffect, useCallback } from "react";
import { vigilSupabase, VigilSettings } from "@/integrations/vigil/client";
import { useToast } from "@/hooks/use-toast";

const VIGIL_HOUSEHOLD_KEY = "vigil_household_id";

export const useVigilSettings = () => {
  const [settings, setSettings] = useState<VigilSettings | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load household ID from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(VIGIL_HOUSEHOLD_KEY);
    if (stored) {
      setHouseholdId(stored);
    }
    setLoading(false);
  }, []);

  const saveSettings = async (deviceSerial: string, newHouseholdId: string) => {
    setLoading(true);
    try {
      // Upsert vigil_settings in external Supabase
      const { data, error } = await vigilSupabase
        .from("vigil_settings")
        .upsert(
          { device_serial: deviceSerial, household_id: newHouseholdId },
          { onConflict: "device_serial" }
        )
        .select()
        .single();

      if (error) throw error;

      // Save household ID to localStorage
      localStorage.setItem(VIGIL_HOUSEHOLD_KEY, newHouseholdId);
      setHouseholdId(newHouseholdId);
      setSettings(data);

      toast({
        title: "Settings saved!",
        description: `Device ${deviceSerial} connected to household`,
      });

      return data;
    } catch (error: any) {
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = useCallback(async (deviceSerial: string) => {
    setLoading(true);
    try {
      const { data, error } = await vigilSupabase
        .from("vigil_settings")
        .select("*")
        .eq("device_serial", deviceSerial)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setSettings(data);
        localStorage.setItem(VIGIL_HOUSEHOLD_KEY, data.household_id);
        setHouseholdId(data.household_id);
      }

      return data;
    } catch (error: any) {
      console.error("Error fetching Vigil settings:", error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSettings = () => {
    localStorage.removeItem(VIGIL_HOUSEHOLD_KEY);
    setHouseholdId(null);
    setSettings(null);
  };

  return {
    settings,
    householdId,
    loading,
    saveSettings,
    fetchSettings,
    clearSettings,
  };
};
