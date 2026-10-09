import { CircleAlert, CircleCheck, Info, LoaderCircle } from "lucide-react";
import { cn } from "../../utils/cn.js";

const alertTones = {
  info: { classes: "border-line bg-panel text-mute", Icon: Info, iconClass: "text-caramel" },
  success: { classes: "border-sage/40 bg-sage/8 text-bone", Icon: CircleCheck, iconClass: "text-sage" },
  error: { classes: "border-clay/50 bg-clay/8 text-bone", Icon: CircleAlert, iconClass: "text-clay" },
  warning: { classes: "border-walnut/50 bg-walnut/8 text-bone", Icon: CircleAlert, iconClass: "text-caramel" },
};

export function Alert({ tone = "info", title, className, children, role }) {
  const { classes, Icon, iconClass } = alertTones[tone];
  return (
    <div
      role={role ?? (tone === "error" ? "alert" : "status")}
      className={cn("flex gap-3 rounded-sm border px-4 py-3 text-[1rem] leading-snug", classes, className)}
    >
      <Icon className={cn("mt-0.5 size-[1.125rem] shrink-0", iconClass)} aria-hidden="true" />
      <div className="min-w-0">
        {title && <p className="font-semibold text-bone">{title}</p>}
        {children && <div className={cn(title && "mt-1", "text-mute")}>{children}</div>}
      </div>
    </div>
  );
}

export function Spinner({ className, label = "Carregando" }) {
  return (
    <span role="status" className={cn("inline-flex items-center gap-2 text-mute", className)}>
      <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function EmptyState({ icon: Icon, title, children, action, className }) {
  return (
    <div className={cn("rounded-sm border border-dashed border-line px-6 py-14 text-center", className)}>
      {Icon && <Icon className="mx-auto mb-4 size-8 text-caramel" strokeWidth={1.25} aria-hidden="true" />}
      <p className="text-[1.375rem] text-bone">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-mute">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
