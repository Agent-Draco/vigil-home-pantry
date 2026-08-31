import { useEffect, useState } from "react";

export interface SpoonSureProfileRecord {
  id: string;
  user_id: string;
  diet: string | null;
  allergies: string[];
  created_at: string;
  updated_at: string;
}

// Local storage key for SpoonSure profile
const STORAGE_KEY = 'spoonsure_profile';

export const useSpoonSureProfile = (userId: string | null) => {
  const [profile, setProfile] = useState<SpoonSureProfileRecord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }

    // Load profile from local storage (since table doesn't exist in DB)
    setLoading(true);
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
      if (stored) {
        setProfile(JSON.parse(stored));
      } else {
        setProfile(null);
      }
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const upsertProfile = async (updates: { diet?: string | null; allergies?: string[] }) => {
    if (!userId) return null;
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const existingProfile = profile;
      
      const newProfile: SpoonSureProfileRecord = {
        id: existingProfile?.id || crypto.randomUUID(),
        user_id: userId,
        diet: updates.diet ?? existingProfile?.diet ?? null,
        allergies: updates.allergies ?? existingProfile?.allergies ?? [],
        created_at: existingProfile?.created_at || now,
        updated_at: now,
      };
      
      localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(newProfile));
      setProfile(newProfile);
      return newProfile;
    } catch (err) {
      console.error('Error saving SpoonSure profile:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { profile, loading, upsertProfile };
};
