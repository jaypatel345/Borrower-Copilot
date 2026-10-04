import type { ConfidenceLevel } from "@/lib/types/results";

export function ProgressBar({ fraction }: { fraction: number }) {
  return (
    <div className="h-1 w-full rounded-full bg-line">
      <div
        className="h-full rounded-full bg-accent transition-all duration-300"
        style={{ width: `${Math.round(fraction * 100)}%` }}
      />
    </div>
  );
}

export function ConfidenceBadge({
  level,
  missing,
}: {
  level: ConfidenceLevel;
  missing?: string[];
}) {
  const tone =
    level === "high"
      ? "bg-emerald-100 text-emerald-800"
      : level === "medium"
        ? "bg-amber-100 text-amber-800"
        : "bg-rose-100 text-rose-800";
  const label = level.charAt(0).toUpperCase() + level.slice(1);
  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
        {label} confidence
      </span>
      {missing && missing.length > 0 && (
        <span className="text-[11px] text-ink/45">Not told: {missing.join(", ")}</span>
      )}
    </span>
  );
}

export function Section({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      {eyebrow && (
        <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
          {eyebrow}
        </p>
      )}
      <h2 className="mb-3 text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export function StatRow({
  label,
  value,
  hint,
  strong,
}: {
  label: string;
  value: string;
  hint?: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line/70 py-2 last:border-0">
      <span className="text-sm text-ink/60">{label}</span>
      <span className={`text-right ${strong ? "text-base font-semibold" : "text-sm font-medium"}`}>
        {value}
        {hint && <span className="block text-[11px] font-normal text-ink/45">{hint}</span>}
      </span>
    </div>
  );
}

export function Why({ sentence, factors }: { sentence: string; factors?: { label: string; value: string }[] }) {
  return (
    <div className="mt-4 rounded-xl bg-mist p-3">
      <p className="text-[13px] leading-snug text-ink/80">
        <span className="font-semibold">Why: </span>
        {sentence}
      </p>
      {factors && factors.length > 0 && (
        <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
          {factors.map((f, i) => (
            <li key={i} className="text-[11px] text-ink/55">
              {f.label}: <span className="font-medium text-ink/75">{f.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "outline";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const styles =
    variant === "primary"
      ? "bg-accent text-white hover:bg-accent-dark disabled:opacity-40 disabled:hover:bg-accent"
      : variant === "outline"
        ? "border border-line bg-white text-ink"
        : "text-ink/60 hover:text-ink";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${styles}`}
    >
      {children}
    </button>
  );
}

/** Thin top bar with the product name (no logo). Used on every screen. */
export function SiteHeader({
  onHome,
  right,
}: {
  onHome?: () => void;
  right?: React.ReactNode;
}) {
  const name = (
    <span className="text-[15px] font-semibold tracking-tight text-ink">Borrower Copilot</span>
  );
  return (
    <header className="flex h-14 items-center justify-between gap-4">
      {onHome ? (
        <button onClick={onHome} aria-label="Borrower Copilot home">
          {name}
        </button>
      ) : (
        name
      )}
      {right}
    </header>
  );
}

/** Narrow single-column shell for the question flow and results. */
export function AppShell({
  onHome,
  children,
}: {
  onHome?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-mist">
      <div className="border-b border-line bg-white">
        <div className="mx-auto max-w-screen px-5">
          <SiteHeader onHome={onHome} />
        </div>
      </div>
      <div className="mx-auto max-w-screen px-5 pb-12 pt-6">{children}</div>
    </div>
  );
}

export { tenureLabel, tenureRangeLabel } from "@/lib/calculations/money";
