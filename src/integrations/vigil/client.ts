import { createClient } from "@supabase/supabase-js";

// External Vigil Supabase project credentials
const VIGIL_SUPABASE_URL = "https://fasrfnasdimaiueugtig.supabase.co";
const VIGIL_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhc3JmbmFzZGltYWl1ZXVndGlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1OTg5NDIsImV4cCI6MjA4NDE3NDk0Mn0.1d0ZGuUBom2eUio3uRB4ihYQQXKBYP9iKvgcF3ITwhE";

// Create a separate client for the Vigil Supabase project
export const vigilSupabase = createClient(VIGIL_SUPABASE_URL, VIGIL_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false, // Don't persist auth for external project
  },
});

// Type definitions for Vigil tables
export interface VigilSettings {
  id?: string;
  device_serial: string;
  household_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface VigilInventoryItem {
  id?: string;
  name: string;
  status: "in" | "opened" | "out";
  mfg?: string | null;
  exp?: string | null;
  household_id: string;
  created_at?: string;
  updated_at?: string;
}


