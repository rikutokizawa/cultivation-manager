type StatusCardProps = {
  label: string;
  value: string;
  meta: string;
  accent?: "green" | "amber" | "slate" | "blue";
  compact?: boolean;
};

const accentClassMap = {
  green: "shadow-[inset_0_0_0_1px_rgba(10,217,92,0.08)]",
  amber: "shadow-[inset_0_0_0_1px_rgba(250,97,56,0.08)]",
  slate: "shadow-[inset_0_0_0_1px_rgba(156,173,191,0.08)]",
  blue: "shadow-[inset_0_0_0_1px_rgba(147,197,253,0.08)]",
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
      className={`dashboard-card rounded-[8px] ${accentClassMap[accent]} ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <p className={`${compact ? "text-xs" : "text-sm"} font-medium text-white/72`}>{label}</p>
      <p className={`mt-2 ${compact ? "text-[26px]" : "text-3xl"} font-semibold tracking-tight text-white`}>
        {value}
      </p>
      <p className="mt-2 text-[12px] text-[#9cadbf]">{meta}</p>
    </article>
  );
}
