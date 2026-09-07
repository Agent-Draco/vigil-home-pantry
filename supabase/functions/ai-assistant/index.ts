import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { generateText, Output } from "npm:ai";
import { z } from "npm:zod";
import { createLovableAiGatewayProvider } from "../_shared/ai-gateway.ts";

const ScanOutput = z.object({
  name: z.string().nullable(),
  mfg: z.string().nullable(),
  exp: z.string().nullable(),
  item_type: z.enum(["food", "medicine"]).nullable(),
  category: z.string().nullable(),
  detected: z.boolean(),
});

const NudgeOutput = z.object({
  nudges: z.array(z.object({
    type: z.enum(["recipe", "expiry", "medicine", "shopping", "waste"]),
    message: z.string().min(1).max(240),
    itemId: z.string(),
  })).max(12),
});

type RuntimeGlobals = typeof globalThis & { process?: { env?: Record<string, string | undefined> } };
const runtimeEnv = (name: string) => Deno.env.get(name) ?? (globalThis as RuntimeGlobals).process?.env?.[name];

function getClient(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length);
  const url = runtimeEnv("SUPABASE_URL") ?? runtimeEnv("VITE_SUPABASE_URL");
  const key = runtimeEnv("SUPABASE_ANON_KEY") ?? runtimeEnv("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) throw new Error("Backend authentication is not configured.");
  return { token, client: createClient(url, key, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }) };
}

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Only POST is supported.", 405);

  try {
    const auth = getClient(req);
    if (!auth) return errorResponse("Please sign in to use AI features.", 401);
    const { data: userData, error: userError } = await auth.client.auth.getUser(auth.token);
    if (userError || !userData.user) return errorResponse("Your session has expired. Please sign in again.", 401);

    const body = await req.json() as Record<string, unknown>;
    const action = body.action;
    if (action !== "scan" && action !== "nudges") return errorResponse("Unsupported AI action.", 400);

    const { data: quota, error: quotaError } = await auth.client.rpc("consume_ai_usage", { _feature: action === "scan" ? "scan" : "nudge" });
    if (quotaError) return errorResponse("AI usage limits are not ready yet. Please try again after the plan update is active.", 503);
    if (!quota?.allowed) return errorResponse(`Your ${quota.plan} plan has used all ${quota.limit} ${action} requests for this month. Ask terra.llc@outlook.com for an access code.`, 402);

    const key = runtimeEnv("LOVABLE_API_KEY");
    if (!key) return errorResponse("Lovable AI is not configured for this app.", 500);
    const gateway = createLovableAiGatewayProvider(key);

    if (action === "scan") {
      const image = typeof body.image === "string" ? body.image : "";
      if (!image || image.length > 8_000_000) return errorResponse("Please provide a smaller product image.", 400);
      const { output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        output: Output.object({ schema: ScanOutput }),
        maxOutputTokens: 500,
        messages: [{ role: "user", content: [
          { type: "text", text: "Read this product label. Return only what is clearly visible. Dates must be YYYY-MM-DD. Detect food versus medicine and a useful category." },
          { type: "image", image: `data:image/jpeg;base64,${image}` },
        ] }],
      });
      return new Response(JSON.stringify(output), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const inventory = Array.isArray(body.inventory) ? body.inventory.slice(0, 100) : [];
    const preferences = typeof body.preferences === "object" && body.preferences ? body.preferences : {};
    const { output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      output: Output.object({ schema: NudgeOutput }),
      maxOutputTokens: 900,
      prompt: `Create concise, practical kitchen nudges from this inventory. Prioritize food waste prevention, expiry timing, medicine safety reminders, and shopping gaps. Never invent dates, medical advice, or ingredients. Use exact item ids. Preferences: ${JSON.stringify(preferences)}. Inventory: ${JSON.stringify(inventory)}`,
    });
    return new Response(JSON.stringify(output), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    const status = typeof error === "object" && error !== null && "status" in error && typeof error.status === "number" ? error.status : 500;
    const message = error instanceof Error ? error.message : "The AI request could not be completed.";
    return errorResponse(message, status);
  }
});