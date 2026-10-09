import { LoaderCircle } from "lucide-react";
import { Link } from "react-router";
import { cn } from "../../utils/cn.js";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold uppercase tracking-[0.16em] whitespace-nowrap select-none transition-[color,background-color,border-color,opacity] duration-200 disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

const variants = {
  primary: "bg-walnut text-ink hover:bg-caramel",
  secondary: "border border-field text-bone hover:border-caramel hover:text-caramel",
  ghost: "text-mute hover:bg-panel-raised hover:text-bone",
  danger: "border border-clay/70 text-clay hover:bg-clay hover:text-ink",
  link: "px-0! h-auto! tracking-[0.14em] text-caramel underline-offset-[6px] hover:underline",
};

const sizes = {
  sm: "h-9 rounded-xs px-4 text-[0.8125rem]",
  md: "h-11 rounded-sm px-6 text-[0.875rem]",
  lg: "h-13 rounded-sm px-8 text-[0.9375rem]",
};

export function buttonClasses({ variant = "primary", size = "md", className } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({ variant, size, className, loading = false, disabled, children, type = "button", ...props }) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

/** Link com aparência de botão. Use `href` para links externos (abre em nova aba). */
export function ButtonLink({ to, href, variant, size, className, children, external, ...props }) {
  const classes = buttonClasses({ variant, size, className });
  if (href) {
    const isExternal = external ?? /^https?:\/\//.test(href);
    return (
      <a
        href={href}
        className={classes}
        {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        {...props}
      >
        {children}
      </a>
    );
  }
  return (
    <Link to={to} className={classes} {...props}>
      {children}
    </Link>
  );
}
