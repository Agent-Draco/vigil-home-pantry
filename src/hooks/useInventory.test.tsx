import { renderHook, waitFor } from "@testing-library/react";
import { useInventory } from "./useInventory";
import { vigilSupabase } from "@/integrations/vigil/client";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// Mock dependencies
vi.mock("@/integrations/vigil/client", () => ({
  vigilSupabase: {
    from: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(),
      })),
    })),
    removeChannel: vi.fn(),
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe("useInventory Cleanup Optimization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should perform a single bulk delete for expired items (optimized)", async () => {
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 5); // 5 days ago (expired > 3 days)
    const expiredStr = expiredDate.toISOString();

    const mockItems = [
      { id: "1", expiry_date: expiredStr, household_id: "hh1", created_at: "2023-01-01" },
      { id: "2", expiry_date: expiredStr, household_id: "hh1", created_at: "2023-01-01" },
      { id: "3", expiry_date: null, household_id: "hh1", created_at: "2023-01-01" }, // Not expired
    ];

    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const inMock = vi.fn().mockResolvedValue({ error: null });
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock, in: inMock });
    const orderMock = vi.fn().mockResolvedValue({ data: mockItems, error: null });

    // Mock the chain
    (vigilSupabase.from as any).mockImplementation((table: string) => {
      if (table === "inventory_items") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
               order: orderMock
            })
          }),
          delete: deleteMock,
          update: vi.fn().mockReturnThis(),
        };
      }
      return {};
    });

    renderHook(() => useInventory("hh1"));

    await waitFor(() => {
        // We expect inMock to be called 1 time with "id" and ["1", "2"]
        expect(inMock).toHaveBeenCalledTimes(1);
        expect(inMock).toHaveBeenCalledWith("id", ["1", "2"]);

        // We expect eqMock to NOT be called
        expect(eqMock).toHaveBeenCalledTimes(0);
    });
  });
});
