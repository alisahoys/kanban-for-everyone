import { useState, type FormEvent } from "react";
import type { CardFields, CardPriority } from "@/lib/kanban";

const initialFormState = {
  title: "",
  details: "",
  priority: null as CardPriority | null,
  dueDate: "",
};

type NewCardFormProps = {
  onAdd: (fields: CardFields) => void;
};

export const NewCardForm = ({ onAdd }: NewCardFormProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formState, setFormState] = useState(initialFormState);

  const close = () => {
    setFormState(initialFormState);
    setIsOpen(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = formState.title.trim();
    if (!title) {
      return;
    }
    onAdd({
      title,
      details: formState.details.trim(),
      priority: formState.priority,
      dueDate: formState.dueDate || null,
    });
    close();
  };

  return (
    <div className="mt-4">
      {isOpen ? (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-xl border border-[var(--border)] bg-white/60 p-3"
        >
          <input
            autoFocus
            maxLength={200}
            value={formState.title}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, title: event.target.value }))
            }
            placeholder="Card title"
            className="field font-medium"
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
            className="field resize-none leading-6"
          />
          <div className="space-y-3">
            <label className="field-label">
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
                className="field"
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
                type="date"
                value={formState.dueDate}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, dueDate: event.target.value }))
                }
                className="field"
              />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button type="submit" className="btn btn-primary btn-sm">
              Add card
            </button>
            <button type="button" onClick={close} className="btn btn-ghost btn-sm">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full rounded-xl border border-dashed border-[var(--mauve)]/50 px-3 py-2 text-sm font-semibold text-[var(--berry)] transition hover:border-solid hover:bg-white/60"
        >
          <span aria-hidden="true">+ </span>Add a card
        </button>
      )}
    </div>
  );
};
