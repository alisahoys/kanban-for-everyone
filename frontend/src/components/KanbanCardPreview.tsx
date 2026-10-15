import type { Card } from "@/lib/kanban";

type KanbanCardPreviewProps = {
  card: Card;
};

export const KanbanCardPreview = ({ card }: KanbanCardPreviewProps) => (
  <article className="rounded-2xl border border-transparent bg-white px-4 py-4 shadow-[0_18px_32px_rgba(67,51,58,0.16)]">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h4 className="font-display text-base font-semibold text-[var(--ink)]">
          {card.title}
        </h4>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          {card.details}
        </p>
      </div>
    </div>
  </article>
);
