import { useState, type FormEvent } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import type { Card } from "@/lib/kanban";

type KanbanCardProps = {
  card: Card;
  onEdit: (cardId: string, title: string, details: string) => void;
  onDelete: (cardId: string) => void;
};

type EditableField = "title" | "details";

export const KanbanCard = ({ card, onEdit, onDelete }: KanbanCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });
  const [isEditing, setIsEditing] = useState(false);
  const [editingField, setEditingField] = useState<EditableField>("title");
  const [title, setTitle] = useState(card.title);
  const [details, setDetails] = useState(card.details);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const updatedTitle = title.trim();
    if (!updatedTitle) {
      return;
    }

    onEdit(card.id, updatedTitle, details.trim());
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTitle(card.title);
    setDetails(card.details);
    setIsEditing(false);
  };

  const startEditing = (field: EditableField) => {
    setTitle(card.title);
    setDetails(card.details);
    setEditingField(field);
    setIsEditing(true);
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={clsx(
        "rounded-2xl border border-transparent bg-white px-4 py-4 shadow-[0_12px_24px_rgba(67,51,58,0.08)]",
        "transition-all duration-300 ease-out",
        isDragging &&
          "scale-[0.98] opacity-60 shadow-[0_18px_32px_rgba(67,51,58,0.16)]"
      )}
      {...(!isEditing ? attributes : {})}
      {...(!isEditing ? listeners : {})}
      data-testid={`card-${card.id}`}
    >
      {isEditing ? (
        <form
          onSubmit={handleEdit}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              handleCancel();
            }
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              event.target instanceof HTMLTextAreaElement
            ) {
              event.preventDefault();
              event.currentTarget.requestSubmit();
            }
          }}
          className="space-y-3"
        >
          <label className="block text-xs font-semibold text-[var(--muted)]">
            Title
            <input
              autoFocus={editingField === "title"}
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--mauve)]"
              aria-label="Card title"
            />
          </label>
          <label className="block text-xs font-semibold text-[var(--muted)]">
            Details
            <textarea
              autoFocus={editingField === "details"}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              rows={3}
              className="mt-1 w-full resize-y rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm leading-6 text-[var(--ink)] outline-none focus:border-[var(--mauve)]"
              aria-label="Card details"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)] transition hover:text-[var(--ink)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-[var(--mauve)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--berry)]"
            >
              Save
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="font-display text-base font-semibold text-[var(--ink)]">
              <button
                type="button"
                onClick={() => startEditing("title")}
                className="text-left cursor-text active:cursor-default"
                aria-label={`Edit title: ${card.title}`}
              >
                {card.title}
              </button>
            </h4>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              <button
                type="button"
                onClick={() => startEditing("details")}
                className="block w-full text-left cursor-text active:cursor-default"
                aria-label={`Edit details: ${card.title}`}
              >
                {card.details}
              </button>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onDelete(card.id)}
              className="rounded-full border border-transparent px-2 py-1 text-xs font-semibold text-[var(--muted)] transition hover:border-[var(--border)] hover:text-[var(--ink)]"
              aria-label={`Delete ${card.title}`}
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </article>
  );
};
