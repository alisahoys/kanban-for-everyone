"use client";

import { useRef, useState } from "react";
import clsx from "clsx";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "@/components/KanbanColumn";
import { KanbanCardPreview } from "@/components/KanbanCardPreview";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ProjectDetailsEditor } from "@/components/ProjectDetailsEditor";
import { createId, moveCard, type BoardData, type CardFields } from "@/lib/kanban";
import { useBoardSync } from "@/hooks/useBoardSync";

type KanbanBoardProps = {
  onSignOut: () => void;
};

const saveStatusText = {
  saving: "Saving changes...",
  error: "Could not save your changes.",
  saved: "All changes saved.",
};

export const KanbanBoard = ({ onSignOut }: KanbanBoardProps) => {
  const sync = useBoardSync();
  const board = sync.board;
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [chatPending, setChatPending] = useState(false);
  const [aiChange, setAiChange] = useState<{
    applied: BoardData;
    previous: BoardData;
  } | null>(null);
  const dragStartColumns = useRef<BoardData["columns"] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const handleSignOut = async () => {
    if (board) {
      setSigningOut(true);
      try {
        await sync.saveNow();
      } catch {
        setSigningOut(false);
        return;
      }
    }
    onSignOut();
  };

  if (!board) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 py-12">
        <p
          role={sync.loadError ? "alert" : "status"}
          className="text-sm text-[var(--ink-soft)]"
        >
          {sync.loadError || "Loading your board..."}
        </p>
        {sync.loadError ? (
          <div className="flex gap-3">
            <button className="btn btn-primary" onClick={sync.retryLoad} type="button">
              Retry
            </button>
            <button className="btn btn-ghost" onClick={onSignOut} type="button">
              Sign out
            </button>
          </div>
        ) : null}
      </main>
    );
  }

  const handleDragStart = (event: DragStartEvent) => {
    dragStartColumns.current = board.columns;
    setActiveCardId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    sync.updateBoard((prev) => {
      const columns = moveCard(prev.columns, String(active.id), String(over.id));
      return columns === prev.columns ? prev : { ...prev, columns };
    });
  };

  const finishDrag = (restoreColumns: boolean) => {
    const originalColumns = dragStartColumns.current;
    if (restoreColumns && originalColumns) {
      sync.updateBoard((prev) => ({ ...prev, columns: originalColumns }));
    }
    dragStartColumns.current = null;
    setActiveCardId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => finishDrag(!event.over);

  const handleDragCancel = () => finishDrag(true);

  const handleRenameColumn = (columnId: string, title: string) => {
    sync.updateBoard((prev) => ({
      ...prev,
      columns: prev.columns.map((column) =>
        column.id === columnId ? { ...column, title } : column
      ),
    }));
  };

  const handleAddCard = (columnId: string, fields: CardFields) => {
    const id = createId("card");
    sync.updateBoard((prev) => ({
      ...prev,
      cards: {
        ...prev.cards,
        [id]: { id, ...fields, details: fields.details || "No details yet." },
      },
      columns: prev.columns.map((column) =>
        column.id === columnId
          ? { ...column, cardIds: [...column.cardIds, id] }
          : column
      ),
    }));
  };

  const handleEditCard = (cardId: string, fields: CardFields) => {
    sync.updateBoard((prev) => ({
      ...prev,
      cards: { ...prev.cards, [cardId]: { id: cardId, ...fields } },
    }));
  };

  const handleDeleteCard = (columnId: string, cardId: string) => {
    sync.updateBoard((prev) => ({
      ...prev,
      cards: Object.fromEntries(
        Object.entries(prev.cards).filter(([id]) => id !== cardId)
      ),
      columns: prev.columns.map((column) =>
        column.id === columnId
          ? { ...column, cardIds: column.cardIds.filter((id) => id !== cardId) }
          : column
      ),
    }));
  };

  const handleAiBoardUpdate = (nextBoard: BoardData) => {
    setAiChange({ applied: nextBoard, previous: board });
    sync.replaceFromServer(nextBoard);
  };

  const handleUndoAiChange = () => {
    if (aiChange) {
      sync.updateBoard(() => aiChange.previous);
      setAiChange(null);
    }
  };

  // Undo is offered only until the board changes again.
  const canUndoAiChange = aiChange !== null && aiChange.applied === board;
  const activeCard = activeCardId ? board.cards[activeCardId] : null;

  return (
    <div
      className={clsx(
        "project-floral-surface min-h-screen",
        activeCardId && "kanban-drag-active"
      )}
      data-dragging={activeCardId !== null}
    >
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-3">
          <p className="flex items-center gap-2 font-display text-sm font-semibold text-[var(--berry)]">
            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
              <rect x="1" y="2" width="4" height="12" rx="1.5" />
              <rect x="6" y="2" width="4" height="8" rx="1.5" opacity="0.7" />
              <rect x="11" y="2" width="4" height="5" rx="1.5" opacity="0.45" />
            </svg>
            Kanban Studio
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--ink-soft)]">
            <p
              className={clsx(
                "flex items-center gap-2",
                sync.saveStatus === "error" && "font-semibold text-[var(--berry)]"
              )}
              role={sync.saveStatus === "error" ? "alert" : "status"}
            >
              <span
                aria-hidden="true"
                className={clsx(
                  "h-1.5 w-1.5 rounded-full",
                  sync.saveStatus === "saved" && "bg-[var(--primary-accent)]",
                  sync.saveStatus === "saving" && "animate-pulse bg-[var(--mauve)]",
                  sync.saveStatus === "error" && "bg-[var(--berry)]"
                )}
              />
              {saveStatusText[sync.saveStatus]}
            </p>
            {sync.saveStatus === "error" ? (
              <button
                className="font-semibold text-[var(--berry)] underline"
                onClick={() => void sync.saveNow().catch(() => {})}
                type="button"
              >
                Retry save
              </button>
            ) : null}
            {chatPending ? (
              <p role="status">Board is locked while the assistant works.</p>
            ) : null}
            {canUndoAiChange ? (
              <button
                className="font-semibold text-[var(--berry)] underline"
                onClick={handleUndoAiChange}
                type="button"
              >
                Undo AI change
              </button>
            ) : null}
            <button
              className="btn btn-ghost btn-sm"
              disabled={signingOut}
              onClick={() => void handleSignOut()}
              type="button"
            >
              {signingOut ? "Saving..." : "Sign out"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1500px] flex-col gap-8 px-6 pb-16 pt-10">
        <div inert={chatPending}>
          <ProjectDetailsEditor
            project={board.project}
            onSave={(project) => sync.updateBoard((prev) => ({ ...prev, project }))}
          />
        </div>

        <div className="space-y-8">
          {/* Edits made while the assistant works would be overwritten by its reply. */}
          <section
            aria-busy={chatPending}
            className={
              chatPending
                ? "min-w-0 overflow-x-auto pb-2 opacity-60"
                : "min-w-0 overflow-x-auto pb-2"
            }
            data-testid="board-columns"
            inert={chatPending}
          >
            <DndContext
              id="kanban-board-dnd"
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <section className="board-reveal grid gap-4 sm:grid-cols-2 lg:min-w-[1180px] lg:grid-cols-5">
                {board.columns.map((column) => (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    cards={column.cardIds.map((cardId) => board.cards[cardId])}
                    onRename={handleRenameColumn}
                    onAddCard={handleAddCard}
                    onEditCard={handleEditCard}
                    onDeleteCard={handleDeleteCard}
                  />
                ))}
              </section>
              <DragOverlay
                dropAnimation={{
                  duration: 300,
                  easing: "cubic-bezier(0.2, 0, 0, 1)",
                }}
              >
                {activeCard ? (
                  <div
                    data-testid={`drag-overlay-${activeCard.id}`}
                    className="w-[240px] rotate-2"
                  >
                    <KanbanCardPreview card={activeCard} />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </section>
          <ChatSidebar
            beforeSend={sync.saveNow}
            onBoardUpdate={handleAiBoardUpdate}
            onSendingChange={setChatPending}
          />
        </div>
      </main>
    </div>
  );
};
