import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_household_members",
  title: "Get household members",
  description: "List the members of a household the signed-in user belongs to.",
  inputSchema: { household_id: z.string().describe("The household id returned by list_my_households.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ household_id }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Sign in to view household members.");
    const userId = ctx.getUserId();
    if (!userId) throw new ToolError("The signed-in user could not be identified.");

    const client = supabaseForUser(ctx);
    const { data: membership, error: membershipError } = await client
      .from("household_members")
      .select("household_id")
      .eq("household_id", household_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (membershipError) throw new ToolError(`Could not verify household access: ${membershipError.message}`);
    if (!membership) throw new ToolError("You do not belong to that household.");

    const { data: members, error: membersError } = await client
      .from("household_members")
      .select("user_id")
      .eq("household_id", household_id);
    if (membersError) throw new ToolError(`Could not load household members: ${membersError.message}`);

    const memberIds = (members ?? []).map((member) => member.user_id);
    if (memberIds.length === 0) {
      return { content: [{ type: "text", text: JSON.stringify({ household_id, members: [] }) }] };
    }

    const { data: profiles, error: profilesError } = await client
      .from("profiles")
      .select("id,display_name")
      .in("id", memberIds);
    if (profilesError) throw new ToolError(`Could not load member profiles: ${profilesError.message}`);

    const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name]));
    const result = memberIds.map((memberId) => ({
      id: memberId,
      display_name: profileById.get(memberId) ?? null,
    }));

    return {
      content: [{ type: "text", text: JSON.stringify({ household_id, members: result }) }],
    };
  },
});