import { supabase } from "@/integrations/supabase/client";

export interface AiScanResult {
  name?: string | null;
  mfg?: string | null;
  exp?: string | null;
  item_type?: "food" | "medicine" | null;
  category?: string | null;
  detected: boolean;
}

export interface AiNudgeResult {
  type: "recipe" | "expiry" | "medicine" | "shopping" | "waste";
  message: string;
  itemId: string;
}

async function invokeAi<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("ai-assistant", { body });
  if (error) {
    let message = error.message || "The AI request failed.";
    if (error.context instanceof Response) {
      try {
        const payload = await error.context.json() as { error?: string };
        message = payload.error || message;
      } catch {
        // Keep the SDK message when the response is not JSON.
      }
    }
    throw new Error(message);
  }
  return data as T;
}

export const scanProductWithAi = (image: string) => invokeAi<AiScanResult>({ action: "scan", image });

export const generateAiNudges = (inventory: unknown[], preferences: unknown) =>
  invokeAi<{ nudges: AiNudgeResult[] }>({ action: "nudges", inventory, preferences });

export const getAiPlanStatus = async () => {
  const { data, error } = await supabase.rpc("get_ai_plan_status");
  if (error) throw error;
  return data as {
    plan: { name: string; description: string; monthly_scan_limit: number; monthly_nudge_limit: number };
    usage: { scan_count: number; nudge_count: number; period_start: string };
    is_admin: boolean;
  };
};

export const redeemAiPlanCode = async (code: string) => {
  const { data, error } = await supabase.rpc("redeem_ai_plan_code", { _code: code });
  if (error) throw error;
  return data as { success: boolean; message: string; plan?: string };
};

export const createAiPlan = async (name: string, description: string, scanLimit: number, nudgeLimit: number) => {
  const { data, error } = await supabase.rpc("admin_create_ai_plan", {
    _name: name,
    _description: description,
    _scan_limit: scanLimit,
    _nudge_limit: nudgeLimit,
  });
  if (error) throw error;
  return data;
};

export const createAiPlanCode = async (code: string, planId: string, maxRedemptions: number, expiresAt?: string) => {
  const { data, error } = await supabase.rpc("admin_create_ai_code", {
    _code: code,
    _plan_id: planId,
    _max_redemptions: maxRedemptions,
    _expires_at: expiresAt ?? null,
  });
  if (error) throw error;
  return data as { id: string; code: string };
};