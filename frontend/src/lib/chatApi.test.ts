import { afterEach, describe, expect, it, vi } from "vitest";
import { initialData } from "@/lib/kanban";
import { sendBoardChat } from "@/lib/chatApi";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sendBoardChat", () => {
  it("posts the question and bounded conversation history and returns the response", async () => {
    const result = { message: "Task renamed.", board: structuredClone(initialData) };
    const fetchMock = vi.fn(async () =>
      ({ ok: true, json: async () => result }) as Response
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendBoardChat("Rename a task", [{ role: "user", content: "Earlier question" }])
    ).resolves.toEqual(result);

    expect(fetchMock).toHaveBeenCalledWith(
      window.location.port === "3000"
        ? `${window.location.protocol}//${window.location.hostname}:8000/api/users/demo-user/chat`
        : "/api/users/demo-user/chat",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        body: JSON.stringify({
          question: "Rename a task",
          history: [{ role: "user", content: "Earlier question" }],
        }),
      })
    );
  });

  it("surfaces the backend error detail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        ({
          ok: false,
          status: 503,
          json: async () => ({ detail: "OPENROUTER_API_KEY is not configured." }),
        }) as Response
      )
    );

    await expect(sendBoardChat("Hello", [])).rejects.toThrow(
      "OPENROUTER_API_KEY is not configured."
    );
  });
});
