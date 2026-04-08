type StatusCardProps = {
  label: string;
  value: string;
  meta: string;
  accent?: "green" | "amber" | "slate" | "blue";
  compact?: boolean;
};

const accentClassMap = {
  green: "from-leaf/15 to-white",
  amber: "from-amber/20 to-white",
  slate: "from-ink/10 to-white",
  blue: "from-sky-100 to-white",
};

export function StatusCard({
  label,
  value,
  meta,
  accent = "green",
  compact = false,
}: StatusCardProps) {
  return (
    <article
      className={`rounded-[22px] border border-ink/10 bg-gradient-to-br ${accentClassMap[accent]} ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <p className={`${compact ? "text-xs" : "text-sm"} font-medium text-ink/60`}>{label}</p>
      <p className={`mt-3 ${compact ? "text-2xl" : "text-3xl"} font-semibold tracking-tight`}>
        {value}
      </p>
      <p className="mt-2 text-sm text-ink/65">{meta}</p>
    </article>
  );
}
