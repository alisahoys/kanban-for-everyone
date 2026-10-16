import { initialData, type BoardData } from "@/lib/kanban";

export const demoUserId = "demo-user";
const legacyBoardKey = "pm-kanban-board-v1";
const migrationKey = "pm-kanban-api-migrated-v1";
const priorities = ["low", "medium", "high"];

const isCalendarDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

// The Next dev server (port 3000) talks to the backend on port 8000; the packaged app is same-origin.
export const userApiUrl = (path: string) => {
  const apiBase =
    window.location.port === "3000"
      ? `${window.location.protocol}//${window.location.hostname}:8000/api`
      : "/api";
  return `${apiBase}/users/${demoUserId}/${path}`;
};

export const boardSnapshot = (board: BoardData) =>
  JSON.stringify({
    project: board.project,
    columns: board.columns,
    cards: Object.fromEntries(
      Object.entries(board.cards).sort(([left], [right]) => left.localeCompare(right))
    ),
  });

const parseBoardData = (value: unknown): BoardData | null => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Partial<BoardData>;
  if (
    (candidate.project !== undefined &&
      (typeof candidate.project !== "object" ||
        candidate.project === null ||
        typeof candidate.project.name !== "string" ||
        typeof candidate.project.description !== "string")) ||
    !Array.isArray(candidate.columns) ||
    typeof candidate.cards !== "object" ||
    candidate.cards === null ||
    Array.isArray(candidate.cards)
  ) {
    return null;
  }

  if (
    candidate.columns.length !== initialData.columns.length ||
    candidate.columns.some(
      (column, index) =>
        !column ||
        column.id !== initialData.columns[index].id ||
        typeof column.title !== "string" ||
        !Array.isArray(column.cardIds) ||
        column.cardIds.some((cardId) => typeof cardId !== "string")
    )
  ) {
    return null;
  }

  const cards = candidate.cards as Record<string, unknown>;
  const referencedIds = candidate.columns.flatMap((column) => column.cardIds);
  const validCards =
    referencedIds.length === new Set(referencedIds).size &&
    referencedIds.length === Object.keys(cards).length &&
    referencedIds.every((id) => {
      const candidateCard = cards[id] as Record<string, unknown> | null;
      return (
        typeof candidateCard === "object" &&
        candidateCard !== null &&
        !Array.isArray(candidateCard) &&
        candidateCard.id === id &&
        typeof candidateCard.title === "string" &&
        typeof candidateCard.details === "string" &&
        (candidateCard.priority === undefined ||
          candidateCard.priority === null ||
          priorities.includes(String(candidateCard.priority))) &&
        (candidateCard.dueDate === undefined ||
          candidateCard.dueDate === null ||
          (typeof candidateCard.dueDate === "string" &&
            isCalendarDate(candidateCard.dueDate)))
      );
    });
  if (!validCards) {
    return null;
  }

  const normalizedCards = Object.fromEntries(
    referencedIds.map((id) => {
      const card = cards[id] as BoardData["cards"][string];
      return [id, { ...card, priority: card.priority ?? null, dueDate: card.dueDate ?? null }];
    })
  );

  return {
    project: candidate.project ?? initialData.project,
    columns: candidate.columns,
    cards: normalizedCards,
  };
};

const readLegacyBoard = (): BoardData | null => {
  const saved = window.localStorage.getItem(legacyBoardKey);
  if (!saved) {
    return null;
  }

  try {
    return parseBoardData(JSON.parse(saved));
  } catch {
    return null;
  }
};

const requestBoard = async (method: "GET" | "PUT", board?: BoardData) => {
  const response = await fetch(userApiUrl("board"), {
    method,
    cache: "no-store",
    headers: board ? { "Content-Type": "application/json" } : undefined,
    body: board ? JSON.stringify(board) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Board API request failed with status ${response.status}.`);
  }

  return (await response.json()) as BoardData;
};

export const replaceBoard = (board: BoardData) => requestBoard("PUT", board);

export const loadBoard = async (): Promise<BoardData> => {
  let board = await requestBoard("GET");

  if (window.localStorage.getItem(migrationKey) !== "true") {
    const legacyBoard = readLegacyBoard();
    if (
      legacyBoard &&
      boardSnapshot(board) === boardSnapshot(initialData) &&
      boardSnapshot(legacyBoard) !== boardSnapshot(initialData)
    ) {
      board = await replaceBoard(legacyBoard);
    }

    window.localStorage.setItem(migrationKey, "true");
    window.localStorage.removeItem(legacyBoardKey);
  }

  return board;
};
