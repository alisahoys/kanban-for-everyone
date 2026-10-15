import { initialData, type BoardData } from "@/lib/kanban";

const jsonResponse = (board: BoardData) =>
  ({
    ok: true,
    status: 200,
    json: async () => structuredClone(board),
  }) as Response;

export const createMockBoardApi = (seed: BoardData = initialData) => {
  let savedBoard = structuredClone(seed);

  const fetchBoard = async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "PUT") {
      savedBoard = JSON.parse(String(init.body)) as BoardData;
    }
    return jsonResponse(savedBoard);
  };

  return {
    fetchBoard,
    getSavedBoard: () => savedBoard,
  };
};
