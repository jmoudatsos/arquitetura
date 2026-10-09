import { Check } from "lucide-react";
import { cn } from "../../utils/cn.js";

/**
 * Indicador numerado do assistente de briefing.
 * Etapas já visitadas são clicáveis para voltar e ajustar.
 */
export function WizardStepper({ steps, current, maxReached, onStepClick, className }) {
  return (
    <nav aria-label="Etapas do briefing" className={className}>
      <ol className="flex items-start justify-between gap-1">
        {steps.map((name, index) => {
          const number = index + 1;
          const isCurrent = number === current;
          const isDone = number < current || (number <= maxReached && number !== current);
          const canClick = number <= maxReached && number !== current;
          return (
            <li key={name} className="relative flex flex-1 flex-col items-center">
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-[1.125rem] right-1/2 -z-0 h-px w-full",
                    number <= maxReached ? "bg-walnut/60" : "bg-line",
                  )}
                />
              )}
              <button
                type="button"
                onClick={() => canClick && onStepClick?.(number)}
                disabled={!canClick}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Etapa ${number}: ${name}${isDone ? " (concluída)" : ""}`}
                className={cn(
                  "relative z-10 flex size-9 items-center justify-center rounded-full border text-[0.9375rem] font-semibold tabular transition-colors",
                  isCurrent && "border-walnut bg-walnut text-ink ring-4 ring-walnut/20",
                  !isCurrent && isDone && "border-walnut/70 bg-ink text-caramel hover:bg-walnut hover:text-ink",
                  !isCurrent && !isDone && "border-line bg-ink text-faint",
                  !canClick && "cursor-default",
                )}
              >
                {isDone && !isCurrent ? <Check className="size-4" strokeWidth={2.5} /> : number}
              </button>
              <span
                className={cn(
                  "mt-2 hidden text-center text-[0.875rem] leading-tight sm:block",
                  isCurrent ? "font-semibold text-caramel" : "text-faint",
                )}
              >
                {name}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-center text-[0.9375rem] text-mute sm:hidden">
        Etapa {current} de {steps.length} · <span className="text-bone">{steps[current - 1]}</span>
      </p>
    </nav>
  );
}

/** Barra de progresso fina (topo do assistente). */
export function ProgressBar({ value, className, label }) {
  const percent = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label={label}
      className={cn("h-[3px] w-full overflow-hidden bg-line", className)}
    >
      <div className="h-full bg-walnut transition-[width] duration-500 ease-out" style={{ width: `${percent}%` }} />
    </div>
  );
}

/** Setas encadeadas do card "Iniciar seu projeto" (mockup: STEP 1 · SPACE › STEP 2 › STEP 3). */
export function ChevronSteps({ steps, current, onStepClick, className }) {
  return (
    <ol className={cn("flex gap-1", className)} aria-label="Etapas">
      {steps.map((step, index) => {
        const number = index + 1;
        const isCurrent = number === current;
        const isDone = number < current;
        const Tag = onStepClick ? "button" : "span";
        return (
          <li key={step.title} className="chevron-step min-w-0 flex-1" aria-current={isCurrent ? "step" : undefined}>
            <Tag
              {...(onStepClick ? { type: "button", onClick: () => onStepClick(number) } : {})}
              className={cn(
                "flex h-full min-h-12 w-full flex-col items-center justify-center px-1.5 py-1.5 text-center transition-colors sm:px-4",
                isCurrent && "bg-walnut text-ink",
                isDone && "bg-walnut/25 text-caramel",
                !isCurrent && !isDone && "bg-panel-raised text-mute",
                onStepClick && !isCurrent && "hover:bg-walnut/40 hover:text-bone",
              )}
            >
              <span className="text-[0.75rem] leading-tight font-semibold tracking-[0.12em] uppercase sm:tracking-[0.18em]">
                Etapa {number}
              </span>
              <span className="max-w-full truncate text-[0.78125rem] leading-tight font-semibold tracking-[0.03em] uppercase sm:text-[0.875rem] sm:tracking-[0.12em]">
                {step.shortTitle ? (
                  <>
                    <span className="sm:hidden">{step.shortTitle}</span>
                    <span className="hidden sm:inline">{step.title}</span>
                  </>
                ) : (
                  step.title
                )}
              </span>
            </Tag>
          </li>
        );
      })}
    </ol>
  );
}
