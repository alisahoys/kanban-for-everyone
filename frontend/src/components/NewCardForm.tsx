import { useState, type FormEvent } from "react";
import type { CardPriority } from "@/lib/kanban";

const initialFormState = {
  title: "",
  details: "",
  priority: null as CardPriority | null,
  dueDate: "",
};

type NewCardFormProps = {
  onAdd: (
    title: string,
    details: string,
    priority: CardPriority | null,
    dueDate: string | null
  ) => void;
};

export const NewCardForm = ({ onAdd }: NewCardFormProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formState, setFormState] = useState(initialFormState);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.title.trim()) {
      return;
    }
    onAdd(
      formState.title.trim(),
      formState.details.trim(),
      formState.priority,
      formState.dueDate || null
    );
    setFormState(initialFormState);
    setIsOpen(false);
  };

  return (
    <div className="mt-4">
      {isOpen ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            maxLength={200}
            value={formState.title}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, title: event.target.value }))
            }
            placeholder="Card title"
            className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium text-[var(--ink)] outline-none transition focus:border-[var(--mauve)]"
            required
          />
          <textarea
            maxLength={2000}
            value={formState.details}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, details: event.target.value }))
            }
            placeholder="Details"
            rows={3}
            className="w-full resize-none rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--muted)] outline-none transition focus:border-[var(--mauve)]"
          />
          <div className="space-y-3">
            <label className="grid gap-1 text-xs font-semibold text-[var(--muted)]">
              Priority
              <select
                aria-label="Priority"
                value={formState.priority ?? ""}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    priority: (event.target.value || null) as CardPriority | null,
                  }))
                }
                className="w-full min-w-0 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)]"
              >
                <option value="">No priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-semibold text-[var(--muted)]">
              Due date
              <input
                aria-label="Due date"
                type="date"
                value={formState.dueDate}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, dueDate: event.target.value }))
                }
                className="w-full min-w-0 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)]"
              />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="rounded-full bg-[var(--mauve)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110"
            >
              Add card
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setFormState(initialFormState);
              }}
              className="rounded-full border border-[var(--border)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)] transition hover:text-[var(--ink)]"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full rounded-full border border-dashed border-[var(--border)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--mauve)] transition hover:border-[var(--mauve)]"
        >
          Add a card
        </button>
      )}
    </div>
  );
};
