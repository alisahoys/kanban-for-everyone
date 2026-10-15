import { useState } from "react";
import clsx from "clsx";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Card, CardPriority, Column } from "@/lib/kanban";
import { KanbanCard } from "@/components/KanbanCard";
import { NewCardForm } from "@/components/NewCardForm";

type KanbanColumnProps = {
  column: Column;
  cards: Card[];
  onRename: (columnId: string, title: string) => void;
  onAddCard: (
    columnId: string,
    title: string,
    details: string,
    priority: CardPriority | null,
    dueDate: string | null
  ) => void;
  onEditCard: (
    cardId: string,
    title: string,
    details: string,
    priority: CardPriority | null,
    dueDate: string | null
  ) => void;
  onDeleteCard: (columnId: string, cardId: string) => void;
};

export const KanbanColumn = ({
  column,
  cards,
  onRename,
  onAddCard,
  onEditCard,
  onDeleteCard,
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  // Holds an empty title while the user retypes it; the server rejects empty titles.
  const [emptyDraft, setEmptyDraft] = useState<string | null>(null);

  return (
    <section
      ref={setNodeRef}
      className={clsx(
        "kanban-column-surface flex min-h-[520px] flex-col rounded-3xl border border-[var(--border)] p-4 shadow-[var(--shadow)] transition",
        isOver && "ring-2 ring-[var(--primary-accent)]"
      )}
      data-testid={`column-${column.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="w-full">
          <div className="flex items-center gap-3">
            <div className="h-2 w-10 rounded-full bg-[var(--primary-accent)]" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              {cards.length} cards
            </span>
          </div>
          <input
            value={emptyDraft ?? column.title}
            maxLength={60}
            onChange={(event) => {
              const title = event.target.value;
              if (title.trim()) {
                setEmptyDraft(null);
                onRename(column.id, title);
              } else {
                setEmptyDraft(title);
              }
            }}
            onBlur={() => setEmptyDraft(null)}
            className="mt-3 w-full bg-transparent font-display text-lg font-semibold text-[var(--ink)] outline-none"
            aria-label="Column title"
          />
        </div>
      </div>
      <div className="mt-4 flex flex-1 flex-col gap-3">
        <SortableContext items={column.cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              onEdit={onEditCard}
              onDelete={(cardId) => onDeleteCard(column.id, cardId)}
            />
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-[var(--border)] px-3 py-6 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Drop a card here
          </div>
        )}
      </div>
      <NewCardForm
        onAdd={(title, details, priority, dueDate) =>
          onAddCard(column.id, title, details, priority, dueDate)
        }
      />
    </section>
  );
};
