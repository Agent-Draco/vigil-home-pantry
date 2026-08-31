import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useShoppingList } from "./useShoppingList";

const { mockFrom, mockRemoveChannel } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRemoveChannel: vi.fn(),
}));

let realtimeCallback: ((payload: any) => void) | undefined;

vi.mock("@/integrations/vigil/client", () => ({
  vigilSupabase: {
    from: mockFrom,
    channel: vi.fn(() => ({
      on: vi.fn((_event: string, _filter: unknown, callback: (payload: any) => void) => {
        realtimeCallback = callback;
        return {
          subscribe: vi.fn(),
        };
      }),
    })),
    removeChannel: mockRemoveChannel,
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe("useShoppingList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    realtimeCallback = undefined;

    const orderMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectForFetch = vi.fn().mockReturnValue({ eq: eqMock });

    const singleMock = vi.fn().mockResolvedValue({
      data: {
        id: "item-1",
        item_name: "Milk",
        quantity: 1,
        household_id: "hh-1",
      },
      error: null,
    });

    const selectForInsert = vi.fn().mockReturnValue({ single: singleMock });
    const insertMock = vi.fn().mockReturnValue({ select: selectForInsert });

    mockFrom.mockImplementation((table: string) => {
      if (table === "shopping_list") {
        return {
          select: selectForFetch,
          insert: insertMock,
          delete: vi.fn(),
          update: vi.fn(),
        };
      }
      return {};
    });
  });

  it("deduplicates optimistic inserts when realtime INSERT arrives", async () => {
    const { result } = renderHook(() => useShoppingList("hh-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.addItem({ item_name: "Milk", quantity: 1 });
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].id).toBe("item-1");

    act(() => {
      realtimeCallback?.({
        eventType: "INSERT",
        new: {
          id: "item-1",
          item_name: "Milk",
          quantity: 1,
          household_id: "hh-1",
        },
      });
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].item_name).toBe("Milk");
  });
});
