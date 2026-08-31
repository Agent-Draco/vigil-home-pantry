import { defineTool } from "@lovable.dev/mcp-js";

export default defineTool({
  name: "get_app_overview",
  title: "Get app overview",
  description: "Describe AsteRISK Portal's capabilities, routes, and agent data boundaries.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [{
      type: "text",
      text: JSON.stringify({
        name: "AsteRISK Portal",
        purpose: "Household inventory, expiry, shopping, medicine reminders, and waste reduction.",
        sections: ["Home", "Inventory", "Scan", "Shop", "Nudges", "Comm", "Feedback", "Settings"],
        dataBoundary: "Initial agent tools are read-only and expose app orientation plus authenticated household context, not inventory records.",
        contextUrl: "/ai-context.json",
      }),
    }],
  }),
});