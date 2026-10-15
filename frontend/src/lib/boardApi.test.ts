import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initialData, type BoardData } from "@/lib/kanban";
import { loadBoard } from "@/lib/boardApi";

const response = (board: BoardData, ok = true) =>
  ({
    ok,
    status: ok ? 200 : 500,
    json: async () => structuredClone(board),
  }) as Response;

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadBoard", () => {
  it("migrates an existing browser board when the server still has its seed", async () => {
    const legacyBoard = structuredClone(initialData);
    legacyBoard.cards["card-1"].title = "Browser edit";
    localStorage.setItem("pm-kanban-board-v1", JSON.stringify(legacyBoard));
    const saved: BoardData[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "PUT") {
          const board = JSON.parse(String(init.body)) as BoardData;
          saved.push(board);
          return response(board);
        }
        return response(initialData);
      })
    );

    const board = await loadBoard();

    expect(board.cards["card-1"].title).toBe("Browser edit");
    expect(saved).toHaveLength(1);
    expect(saved[0].cards["card-1"].title).toBe("Browser edit");
    expect(localStorage.getItem("pm-kanban-api-migrated-v1")).toBe("true");
    expect(localStorage.getItem("pm-kanban-board-v1")).toBeNull();
  });

  it("keeps the server board when it already contains changes", async () => {
    const serverBoard = structuredClone(initialData);
    serverBoard.cards["card-1"].title = "Server edit";
    const legacyBoard = structuredClone(initialData);
    legacyBoard.cards["card-1"].title = "Browser edit";
    localStorage.setItem("pm-kanban-board-v1", JSON.stringify(legacyBoard));
    const fetchMock = vi.fn(async () => response(serverBoard));
    vi.stubGlobal("fetch", fetchMock);

    const board = await loadBoard();

    expect(board.cards["card-1"].title).toBe("Server edit");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("pm-kanban-api-migrated-v1")).toBe("true");
    expect(localStorage.getItem("pm-kanban-board-v1")).toBeNull();
  });

  it("adds default project details when migrating an older saved board", async () => {
    const legacyBoard = structuredClone(initialData);
    delete (legacyBoard as Partial<typeof legacyBoard>).project;
    legacyBoard.cards["card-1"].title = "Browser edit";
    localStorage.setItem("pm-kanban-board-v1", JSON.stringify(legacyBoard));
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "PUT") {
          return response(JSON.parse(String(init.body)) as BoardData);
        }
        return response(initialData);
      })
    );

    const board = await loadBoard();

    expect(board.project).toEqual(initialData.project);
    expect(board.cards["card-1"].title).toBe("Browser edit");
  });
});
