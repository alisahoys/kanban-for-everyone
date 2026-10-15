import { useState, useSyncExternalStore, type FormEvent } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import type { Card, CardPriority } from "@/lib/kanban";

type KanbanCardProps = {
  card: Card;
  onEdit: (
    cardId: string,
    title: string,
    details: string,
    priority: CardPriority | null,
    dueDate: string | null
  ) => void;
  onDelete: (cardId: string) => void;
};

type EditableField = "title" | "details";

const localDateKey = () => {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

const subscribeToLocalDate = () => () => {};
const serverDateKey = () => "";

const formatDueDate = (date: string) => {
  const [year, month, day] = date.split("-");
  const monthName = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ][Number(month) - 1];
  return `${monthName} ${Number(day)}, ${year}`;
};

export const KanbanCard = ({ card, onEdit, onDelete }: KanbanCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });
  const [isEditing, setIsEditing] = useState(false);
  const [editingField, setEditingField] = useState<EditableField>("title");
  const [title, setTitle] = useState(card.title);
  const [details, setDetails] = useState(card.details);
  const [priority, setPriority] = useState<CardPriority | null>(card.priority);
  const [dueDate, setDueDate] = useState(card.dueDate ?? "");
  const today = useSyncExternalStore(
    subscribeToLocalDate,
    localDateKey,
    serverDateKey
  );

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

    onEdit(card.id, updatedTitle, details.trim(), priority, dueDate || null);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTitle(card.title);
    setDetails(card.details);
    setPriority(card.priority);
    setDueDate(card.dueDate ?? "");
    setIsEditing(false);
  };

  const startEditing = (field: EditableField) => {
    setTitle(card.title);
    setDetails(card.details);
    setPriority(card.priority);
    setDueDate(card.dueDate ?? "");
    setEditingField(field);
    setIsEditing(true);
  };

  const overdue = Boolean(today && card.dueDate && card.dueDate < today);

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
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-[var(--muted)]">
              Priority
              <select
                aria-label="Card priority"
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)]"
                onChange={(event) =>
                  setPriority((event.target.value || null) as CardPriority | null)
                }
                value={priority ?? ""}
              >
                <option value="">No priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className="block text-xs font-semibold text-[var(--muted)]">
              Due date
              <input
                aria-label="Due date"
                className="mt-1 w-full min-w-0 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)]"
                onChange={(event) => setDueDate(event.target.value)}
                type="date"
                value={dueDate}
              />
            </label>
          </div>
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
            {card.priority || card.dueDate ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {card.priority ? (
                  <span
                    className={clsx(
                      "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
                      card.priority === "high" && "bg-[var(--mauve)] text-white",
                      card.priority === "medium" && "bg-[var(--blush)] text-[var(--berry)]",
                      card.priority === "low" && "bg-[var(--background)] text-[var(--muted)]"
                    )}
                  >
                    {card.priority} priority
                  </span>
                ) : null}
                {card.dueDate ? (
                  <time
                    className={clsx(
                      "text-xs font-medium",
                      overdue ? "text-[var(--berry)]" : "text-[var(--muted)]"
                    )}
                    dateTime={card.dueDate}
                  >
                    {overdue ? "Overdue: " : "Due "}{formatDueDate(card.dueDate)}
                  </time>
                ) : null}
              </div>
            ) : null}
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
