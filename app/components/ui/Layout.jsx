import { cn } from "../../utils/cn.js";

export function Container({ as: Tag = "div", className, children, ...props }) {
  return (
    <Tag className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10", className)} {...props}>
      {children}
    </Tag>
  );
}

export function Card({ as: Tag = "div", className, children, ...props }) {
  return (
    <Tag className={cn("rounded-sm border border-line bg-panel", className)} {...props}>
      {children}
    </Tag>
  );
}

export function Eyebrow({ as: Tag = "p", className, children }) {
  return <Tag className={cn("eyebrow text-caramel", className)}>{children}</Tag>;
}

/**
 * Cabeçalho de seção: sobretítulo + título + texto de apoio.
 * `as` define o nível do título (h1/h2/h3) para manter a hierarquia correta.
 */
export function SectionHeading({ eyebrow, title, lead, as: Heading = "h2", align = "left", className, children }) {
  return (
    <div className={cn(align === "center" && "mx-auto text-center", "max-w-3xl", className)}>
      {eyebrow && <Eyebrow className="mb-4">{eyebrow}</Eyebrow>}
      <Heading className="text-[2.25rem] leading-[1.05] text-bone sm:text-[2.75rem]">{title}</Heading>
      {lead && <p className="mt-5 text-[1.1875rem] leading-relaxed text-mute">{lead}</p>}
      {children}
    </div>
  );
}

const badgeTones = {
  neutral: "border-line text-mute",
  walnut: "border-walnut/60 text-caramel",
  sage: "border-sage/50 text-sage",
  clay: "border-clay/60 text-clay",
  solid: "border-walnut bg-walnut text-ink",
};

export function Badge({ tone = "neutral", className, children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.8125rem] leading-5 font-semibold tracking-[0.06em] whitespace-nowrap",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Divider({ className }) {
  return <hr className={cn("border-0 border-t border-line", className)} />;
}
