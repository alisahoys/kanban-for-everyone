import { useState, useSyncExternalStore, type FormEvent } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import type { Card, CardFields, CardPriority } from "@/lib/kanban";
import { priorityEdge } from "@/components/KanbanCardPreview";

type KanbanCardProps = {
  card: Card;
  onEdit: (cardId: string, fields: CardFields) => void;
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

    onEdit(card.id, {
      title: updatedTitle,
      details: details.trim(),
      priority,
      dueDate: dueDate || null,
    });
    setIsEditing(false);
  };

  // The draft is reset from the card each time editing starts.
  const handleCancel = () => setIsEditing(false);

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
        "group relative overflow-hidden rounded-xl border border-[var(--border)] bg-white py-3 pl-5 pr-3 shadow-[0_1px_2px_rgba(67,51,58,0.06)]",
        "transition-all duration-300 ease-out hover:border-[var(--primary-accent)] hover:shadow-[0_6px_16px_rgba(67,51,58,0.10)]",
        isDragging &&
          "scale-[0.98] opacity-60 shadow-[0_18px_32px_rgba(67,51,58,0.16)]"
      )}
      {...(!isEditing ? attributes : {})}
      {...(!isEditing ? listeners : {})}
      data-testid={`card-${card.id}`}
    >
      <span
        aria-hidden="true"
        className={clsx("absolute inset-y-0 left-0 w-1.5", priorityEdge[card.priority ?? "none"])}
      />
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
          <label className="field-label">
            Title
            <input
              autoFocus={editingField === "title"}
              required
              maxLength={200}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="field"
              aria-label="Card title"
            />
          </label>
          <div className="space-y-3">
            <label className="field-label">
              Priority
              <select
                aria-label="Card priority"
                className="field"
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
            <label className="field-label">
              Due date
              <input
                aria-label="Due date"
                className="field"
                onChange={(event) => setDueDate(event.target.value)}
                type="date"
                value={dueDate}
              />
            </label>
          </div>
          <label className="field-label">
            Details
            <textarea
              autoFocus={editingField === "details"}
              maxLength={2000}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              rows={3}
              className="field resize-y leading-6"
              aria-label="Card details"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={handleCancel} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              Save
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="font-display text-[15px] font-semibold leading-snug text-[var(--ink)]">
              <button
                type="button"
                onClick={() => startEditing("title")}
                className="text-left cursor-text active:cursor-default"
                aria-label={`Edit title: ${card.title}`}
              >
                {card.title}
              </button>
            </h4>
            <p className="mt-1.5 text-sm leading-6 text-[var(--ink-soft)]">
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
                      "rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                      card.priority === "high" && "bg-[var(--berry)] text-white",
                      card.priority === "medium" && "bg-[var(--blush)] text-[var(--berry)]",
                      card.priority === "low" &&
                        "border border-[var(--border)] bg-[var(--background)] text-[var(--ink-soft)]"
                    )}
                  >
                    {card.priority} priority
                  </span>
                ) : null}
                {card.dueDate ? (
                  <time
                    className={clsx(
                      "text-xs font-medium",
                      overdue
                        ? "rounded-full bg-[var(--blush)] px-2.5 py-0.5 font-semibold text-[var(--berry)]"
                        : "text-[var(--ink-soft)]"
                    )}
                    dateTime={card.dueDate}
                  >
                    {overdue ? "Overdue: " : "Due "}{formatDueDate(card.dueDate)}
                  </time>
                ) : null}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onDelete(card.id)}
            className="-mr-1 -mt-0.5 shrink-0 rounded-full p-1.5 text-[var(--muted)] transition hover:bg-[var(--blush)] hover:text-[var(--berry)] [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:focus-visible:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100"
            aria-label={`Delete ${card.title}`}
          >
            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
      )}
    </article>
  );
};
