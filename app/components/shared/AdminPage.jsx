import { cn } from "../../utils/cn.js";

/** Cabeçalho padrão das páginas do painel. */
export function AdminPageHeader({ title, description, actions, className }) {
  return (
    <header className={cn("mb-8 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div>
        <h1 className="text-[2.25rem] leading-tight text-bone">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[1.0625rem] text-mute">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function StatTile({ label, value, hint, tone = "default" }) {
  return (
    <div className="rounded-sm border border-line bg-panel p-5">
      <p className="eyebrow text-faint">{label}</p>
      <p className={cn("tabular mt-3 text-[2.75rem] leading-none", tone === "accent" ? "text-caramel" : "text-bone")}>{value}</p>
      {hint && <p className="mt-2 text-[0.9375rem] text-faint">{hint}</p>}
    </div>
  );
}

/** Meta das rotas do admin (nunca indexadas). */
export function adminMeta(title) {
  return [{ title: `${title} · Painel` }, { name: "robots", content: "noindex, nofollow" }];
}
