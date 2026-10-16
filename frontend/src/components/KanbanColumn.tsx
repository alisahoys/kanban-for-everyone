import { useState } from "react";
import clsx from "clsx";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Card, CardFields, Column } from "@/lib/kanban";
import { KanbanCard } from "@/components/KanbanCard";
import { NewCardForm } from "@/components/NewCardForm";

type KanbanColumnProps = {
  column: Column;
  cards: Card[];
  onRename: (columnId: string, title: string) => void;
  onAddCard: (columnId: string, fields: CardFields) => void;
  onEditCard: (cardId: string, fields: CardFields) => void;
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
        "kanban-column-surface flex min-h-[480px] flex-col rounded-2xl border border-[var(--border)] p-3 shadow-[var(--shadow)] transition",
        isOver && "ring-2 ring-[var(--primary-accent)]"
      )}
      data-testid={`column-${column.id}`}
    >
      <div className="flex items-center gap-2 px-1 pt-1">
        <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--mauve)]" />
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
          className="min-w-0 flex-1 rounded-md bg-transparent px-1 py-0.5 font-display text-base font-semibold text-[var(--ink)] outline-none transition hover:bg-white/50 focus:bg-white focus:ring-2 focus:ring-[var(--mauve)]/30"
          aria-label="Column title"
        />
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold tabular-nums text-[var(--ink-soft)]">
          {cards.length}
          <span className="sr-only"> cards</span>
        </span>
      </div>
      <div className="mt-3 flex flex-1 flex-col gap-2.5">
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
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[var(--mauve)]/40 px-3 py-6 text-center text-sm text-[var(--ink-soft)]">
            Drop a card here
          </div>
        )}
      </div>
      <NewCardForm onAdd={(fields) => onAddCard(column.id, fields)} />
    </section>
  );
};
