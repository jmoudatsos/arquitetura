import { cn } from "../../utils/cn.js";

/**
 * Monograma do mockup: inicial em serifa + ícone de armário em traço fino.
 * A inicial vem do nome do estúdio (Admin › Configurações).
 */
export function LogoMark({ letter = "W", className }) {
  return (
    <svg viewBox="0 0 66 40" className={cn("h-9 w-auto text-caramel", className)} aria-hidden="true" focusable="false">
      <text
        x="0"
        y="33"
        fill="currentColor"
        fontFamily="'Cormorant Garamond Variable', 'Cormorant Garamond', Georgia, serif"
        fontSize="40"
        fontWeight="500"
      >
        {letter}
      </text>
      <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="square">
        <rect x="41" y="5" width="22" height="29" />
        <line x1="52" y1="5" x2="52" y2="34" />
        <line x1="41" y1="17" x2="63" y2="17" />
        <line x1="48.5" y1="9" x2="48.5" y2="13" />
        <line x1="55.5" y1="9" x2="55.5" y2="13" />
        <line x1="48.5" y1="21" x2="48.5" y2="27" />
        <line x1="55.5" y1="21" x2="55.5" y2="27" />
      </g>
    </svg>
  );
}

export function Logo({ name = "W Studio", tagline, showName = true, className }) {
  const letter = (name.trim()[0] || "W").toUpperCase();
  return (
    <span className={cn("inline-flex items-center gap-3.5", className)}>
      <LogoMark letter={letter} />
      {showName && (
        <span className="flex flex-col leading-none">
          <span className="text-[1.0625rem] font-semibold tracking-[0.26em] text-bone uppercase">{name}</span>
          {tagline && (
            <span className="mt-1.5 hidden text-[0.75rem] font-semibold tracking-[0.2em] text-faint uppercase lg:block">
              {tagline}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
