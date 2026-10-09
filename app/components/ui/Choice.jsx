import { Check } from "lucide-react";
import { cn } from "../../utils/cn.js";

/**
 * Peças de escolha acessíveis (teclado + leitor de tela).
 * - role="radio"    → escolha única dentro de <ChoiceGroup type="radio">
 * - role="checkbox" → múltipla escolha
 */

export function ChoiceGroup({ type = "radio", labelledBy, label, className, children }) {
  return (
    <div
      role={type === "radio" ? "radiogroup" : "group"}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label}
      className={className}
    >
      {children}
    </div>
  );
}

export function CheckMark({ checked, shape = "square", className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-[1.125rem] shrink-0 items-center justify-center border transition-colors",
        shape === "circle" ? "rounded-full" : "rounded-[2px]",
        checked ? "border-walnut bg-walnut text-ink" : "border-field bg-transparent text-transparent",
        className,
      )}
    >
      <Check className="size-3" strokeWidth={3} />
    </span>
  );
}

/** Botão-pílula (opções curtas: tipo de imóvel, layout, colchão…). */
export function ChoicePill({ selected, onSelect, role = "radio", className, children, ...props }) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "min-h-11 rounded-sm border px-3 py-2.5 text-center text-[1rem] leading-tight transition-colors duration-150",
        selected
          ? "border-walnut bg-walnut/12 font-semibold text-caramel"
          : "border-line bg-ink text-mute hover:border-field hover:text-bone",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** Linha com caixa de seleção (múltipla escolha com textos longos). */
export function ChoiceCheck({ selected, onToggle, className, children, ...props }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onToggle}
      className={cn(
        "flex min-h-11 w-full items-center gap-3 rounded-sm border px-3.5 py-2.5 text-left text-[1rem] leading-snug transition-colors duration-150",
        selected
          ? "border-walnut bg-walnut/10 text-bone"
          : "border-line bg-ink text-mute hover:border-field hover:text-bone",
        className,
      )}
      {...props}
    >
      <CheckMark checked={selected} />
      <span>{children}</span>
    </button>
  );
}

/** Chip arredondado (materiais). */
export function ChoiceChip({ selected, onToggle, className, children, ...props }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onToggle}
      className={cn(
        "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 py-1.5 text-[0.9375rem] transition-colors duration-150",
        selected
          ? "border-walnut bg-walnut font-semibold text-ink"
          : "border-line bg-ink text-mute hover:border-field hover:text-bone",
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className="text-[0.95em] leading-none">
        {selected ? "✓" : "+"}
      </span>
      {children}
    </button>
  );
}
