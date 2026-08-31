import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getAppOverview from "./tools/get-app-overview";
import listMyHouseholds from "./tools/list-my-households";
import getHouseholdMembers from "./tools/get-household-members";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "remix-of-asterisk-portal",
  title: "Remix of AsteRISK - Portal",
  version: "0.1.0",
  instructions: "Read-only tools for understanding AsteRISK Portal and the signed-in user's household context.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getAppOverview, listMyHouseholds, getHouseholdMembers],
});