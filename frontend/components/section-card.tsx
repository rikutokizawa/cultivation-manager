import type { ReactNode } from "react";

type SectionCardProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function SectionCard({
  eyebrow,
  title,
  description,
  action,
  children,
  className = "",
}: SectionCardProps) {
  return (
    <section className={`panel rounded-[24px] p-5 shadow-soft sm:p-6 ${className}`}>
      <div className="mb-5 flex flex-col gap-4 border-b border-ink/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {eyebrow ? (
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-leaf/80">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="text-xl font-semibold">{title}</h2>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

