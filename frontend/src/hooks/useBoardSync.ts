"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { boardSnapshot, loadBoard, replaceBoard } from "@/lib/boardApi";
import type { BoardData } from "@/lib/kanban";

type SaveStatus = "saved" | "saving" | "error";

export const useBoardSync = () => {
  const [board, setBoard] = useState<BoardData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const latestBoard = useRef<BoardData | null>(null);
  const lastSavedSnapshot = useRef<string | null>(null);
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve());
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    let active = true;

    loadBoard()
      .then((loadedBoard) => {
        if (!active) {
          return;
        }
        latestBoard.current = loadedBoard;
        lastSavedSnapshot.current = boardSnapshot(loadedBoard);
        setBoard(loadedBoard);
      })
      .catch(() => {
        if (active) {
          setLoadError("Could not load your board. Check the backend and try again.");
        }
      });

    return () => {
      active = false;
    };
  }, [loadAttempt]);

  const saveBoard = useCallback((nextBoard: BoardData) => {
    const snapshot = boardSnapshot(nextBoard);
    setSaveStatus("saving");
    const pendingSave = saveQueue.current
      .catch(() => undefined)
      .then(() => replaceBoard(nextBoard));
    saveQueue.current = pendingSave;

    return pendingSave.then(
      (savedBoard) => {
        lastSavedSnapshot.current = snapshot;
        setSaveStatus("saved");
        return savedBoard;
      },
      (error: unknown) => {
        setSaveStatus("error");
        throw error;
      }
    );
  }, []);

  useEffect(() => {
    if (!board) {
      return;
    }

    latestBoard.current = board;
    const snapshot = boardSnapshot(board);
    if (snapshot === lastSavedSnapshot.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      saveTimer.current = null;
      void saveBoard(board).catch(() => {});
    }, 250);
    saveTimer.current = timer;

    return () => {
      window.clearTimeout(timer);
      if (saveTimer.current === timer) {
        saveTimer.current = null;
      }
    };
  }, [board, saveBoard]);

  const updateBoard = useCallback(
    (updater: (current: BoardData) => BoardData) => {
      setBoard((current) => {
        if (!current) {
          return current;
        }
        const nextBoard = updater(current);
        latestBoard.current = nextBoard;
        return nextBoard;
      });
    },
    []
  );

  // Apply a board the server has already saved, without saving it again.
  const replaceFromServer = useCallback((serverBoard: BoardData) => {
    latestBoard.current = serverBoard;
    lastSavedSnapshot.current = boardSnapshot(serverBoard);
    setBoard(serverBoard);
  }, []);

  const saveNow = useCallback(async () => {
    const currentBoard = latestBoard.current;
    if (!currentBoard) {
      return;
    }

    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }

    if (boardSnapshot(currentBoard) !== lastSavedSnapshot.current) {
      await saveBoard(currentBoard);
    } else {
      await saveQueue.current;
    }
  }, [saveBoard]);

  return {
    board,
    loadError,
    saveStatus,
    updateBoard,
    replaceFromServer,
    saveNow,
    retryLoad: () => {
      setLoadError("");
      setLoadAttempt((attempt) => attempt + 1);
    },
  };
};
