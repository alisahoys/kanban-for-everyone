import type { Card, CardPriority } from "@/lib/kanban";

export const priorityEdge: Record<CardPriority | "none", string> = {
  high: "bg-[var(--berry)]",
  medium: "bg-[var(--mauve)]",
  low: "bg-[var(--primary-accent)]",
  none: "bg-[var(--border)]",
};

type KanbanCardPreviewProps = {
  card: Card;
};

export const KanbanCardPreview = ({ card }: KanbanCardPreviewProps) => (
  <article className="relative overflow-hidden rounded-xl border border-[var(--primary-accent)] bg-white py-3 pl-5 pr-3 shadow-[0_18px_32px_rgba(67,51,58,0.18)]">
    <span
      aria-hidden="true"
      className={`absolute inset-y-0 left-0 w-1.5 ${priorityEdge[card.priority ?? "none"]}`}
    />
    <h4 className="font-display text-[15px] font-semibold leading-snug text-[var(--ink)]">
      {card.title}
    </h4>
    <p className="mt-1.5 line-clamp-3 text-sm leading-6 text-[var(--ink-soft)]">
      {card.details}
    </p>
  </article>
);
