import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_households",
  title: "List my households",
  description: "List the households available to the signed-in AsteRISK user.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Sign in to view your households.");
    const userId = ctx.getUserId();
    if (!userId) throw new ToolError("The signed-in user could not be identified.");

    const client = supabaseForUser(ctx);
    const { data: memberships, error: membershipError } = await client
      .from("household_members")
      .select("household_id")
      .eq("user_id", userId);

    if (membershipError) throw new ToolError(`Could not load household memberships: ${membershipError.message}`);
    const householdIds = (memberships ?? []).map((membership) => membership.household_id);
    if (householdIds.length === 0) {
      return { content: [{ type: "text", text: JSON.stringify({ households: [] }) }] };
    }

    const { data: households, error: householdError } = await client
      .from("households")
      .select("id,name,invite_code,creator_id")
      .in("id", householdIds);

    if (householdError) throw new ToolError(`Could not load households: ${householdError.message}`);

    return {
      content: [{ type: "text", text: JSON.stringify({ households: households ?? [] }) }],
    };
  },
});