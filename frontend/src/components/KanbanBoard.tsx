"use client";

import { useMemo, useRef, useState } from "react";
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
import { createId, moveCard, type BoardData } from "@/lib/kanban";
import { useBoardSync } from "@/hooks/useBoardSync";

type KanbanBoardProps = {
  onSignOut: () => void;
};

export const KanbanBoard = ({ onSignOut }: KanbanBoardProps) => {
  const sync = useBoardSync();
  const board = sync.board;
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const dragStartColumns = useRef<BoardData["columns"] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const cardsById = useMemo(() => board?.cards ?? {}, [board?.cards]);

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
          className="text-sm text-[var(--muted)]"
        >
          {sync.loadError || "Loading your board..."}
        </p>
        {sync.loadError ? (
          <div className="flex gap-3">
            <button
              className="rounded-full bg-[var(--mauve)] px-4 py-2 text-sm font-semibold text-white"
              onClick={sync.retryLoad}
              type="button"
            >
              Retry
            </button>
            <button
              className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--ink)]"
              onClick={onSignOut}
              type="button"
            >
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
      const activeId = String(active.id);
      const overId = String(over.id);
      const overColumn = prev.columns.find(
        (column) =>
          column.id === overId || column.cardIds.includes(overId)
      );

      if (!overColumn) {
        return prev;
      }

      const columns = moveCard(prev.columns, activeId, overId);
      return columns === prev.columns ? prev : { ...prev, columns };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCardId(null);

    if (!event.over) {
      const originalColumns = dragStartColumns.current;
      if (originalColumns) {
        sync.updateBoard((prev) => ({ ...prev, columns: originalColumns }));
      }
    }

    dragStartColumns.current = null;
  };

  const handleDragCancel = () => {
    const originalColumns = dragStartColumns.current;
    if (originalColumns) {
      sync.updateBoard((prev) => ({ ...prev, columns: originalColumns }));
    }
    dragStartColumns.current = null;
    setActiveCardId(null);
  };

  const handleRenameColumn = (columnId: string, title: string) => {
    sync.updateBoard((prev) => ({
      ...prev,
      columns: prev.columns.map((column) =>
        column.id === columnId ? { ...column, title } : column
      ),
    }));
  };

  const handleAddCard = (columnId: string, title: string, details: string) => {
    const id = createId("card");
    sync.updateBoard((prev) => ({
      ...prev,
      cards: {
        ...prev.cards,
        [id]: { id, title, details: details || "No details yet." },
      },
      columns: prev.columns.map((column) =>
        column.id === columnId
          ? { ...column, cardIds: [...column.cardIds, id] }
          : column
      ),
    }));
  };

  const handleEditCard = (cardId: string, title: string, details: string) => {
    sync.updateBoard((prev) => ({
      ...prev,
      cards: {
        ...prev.cards,
        [cardId]: { ...prev.cards[cardId], title, details },
      },
    }));
  };

  const handleDeleteCard = (columnId: string, cardId: string) => {
    sync.updateBoard((prev) => {
      return {
        ...prev,
        cards: Object.fromEntries(
          Object.entries(prev.cards).filter(([id]) => id !== cardId)
        ),
        columns: prev.columns.map((column) =>
          column.id === columnId
            ? {
                ...column,
                cardIds: column.cardIds.filter((id) => id !== cardId),
              }
            : column
        ),
      };
    });
  };

  const activeCard = activeCardId ? cardsById[activeCardId] : null;

  return (
    <div
      className={
        activeCardId
          ? "kanban-drag-active relative overflow-hidden"
          : "relative overflow-hidden"
      }
      data-dragging={activeCardId !== null}
    >
      <div className="pointer-events-none absolute left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(242,213,221,0.55)_0%,_rgba(242,213,221,0.12)_55%,_transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(213,154,170,0.30)_0%,_rgba(213,154,170,0.08)_55%,_transparent_75%)]" />

      <main className="relative mx-auto flex min-h-screen max-w-[1500px] flex-col gap-10 px-6 pb-16 pt-12">
        <header className="flex flex-col gap-6 rounded-[32px] border border-[var(--border)] bg-white/80 p-8 shadow-[var(--shadow)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted)]">
                Single Board Kanban
              </p>
              <h1 className="mt-3 font-display text-4xl font-semibold text-[var(--ink)]">
                Kanban Studio
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
                Keep momentum visible. Rename columns, drag cards between stages,
                and capture quick notes without getting buried in settings.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--muted)]">
                  Focus
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--mauve)]">
                  One board. Five columns. Zero clutter.
                </p>
              </div>
              <button
                className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--mauve)] hover:text-[var(--berry)]"
                disabled={signingOut}
                onClick={() => void handleSignOut()}
                type="button"
              >
                {signingOut ? "Saving..." : "Sign out"}
              </button>
            </div>
          </div>
          <div className="flex min-h-5 items-center gap-3 text-xs text-[var(--muted)]">
            <p role={sync.saveStatus === "error" ? "alert" : "status"}>
              {sync.saveStatus === "saving"
                ? "Saving changes..."
                : sync.saveStatus === "error"
                  ? "Could not save your changes."
                  : "All changes saved."}
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
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {board.columns.map((column) => (
              <div
                key={column.id}
                className="flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink)]"
              >
                <span className="h-2 w-2 rounded-full bg-[var(--primary-accent)]" />
                {column.title}
              </div>
            ))}
          </div>
        </header>

        <div className="grid items-start gap-6 min-[1400px]:grid-cols-[minmax(0,1fr)_360px]">
          <ChatSidebar
            beforeSend={sync.saveNow}
            onBoardUpdate={(nextBoard) => sync.updateBoard(() => nextBoard)}
          />
          <section className="min-w-0 overflow-x-auto pb-2 min-[1400px]:col-start-1 min-[1400px]:row-start-1">
            <DndContext
              id="kanban-board-dnd"
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5 min-[1400px]:min-w-[960px]">
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
                    className="w-[260px]"
                  >
                    <KanbanCardPreview card={activeCard} />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </section>
        </div>
      </main>
    </div>
  );
};
