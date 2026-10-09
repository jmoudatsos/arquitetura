import { ChevronLeft, ChevronRight } from "lucide-react";
import { forwardRef } from "react";
import { Button } from "../../../components/ui/Button.jsx";
import { Card } from "../../../components/ui/Layout.jsx";

/** Moldura de cada etapa: cabeçalho, conteúdo e navegação. */
export const StepShell = forwardRef(function StepShell(
  { step, title, description, children, onBack, backLabel = "Voltar", onNext, nextLabel, nextDisabled, footerExtra },
  headingRef,
) {
  return (
    <Card className="animate-rise-in p-6 sm:p-10">
      <header className="mb-8 border-b border-line pb-6">
        <p className="eyebrow text-caramel">Etapa {String(step).padStart(2, "0")}</p>
        <h2 ref={headingRef} tabIndex={-1} className="mt-2 text-[2rem] leading-tight text-bone outline-none sm:text-[2.5rem]">
          {title}
        </h2>
        {description && <p className="mt-3 max-w-2xl text-[1.0625rem] leading-relaxed text-mute">{description}</p>}
      </header>

      {children}

      <footer className="mt-10 flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        {onBack ? (
          <Button variant="ghost" onClick={onBack} className="self-start">
            <ChevronLeft className="size-4" aria-hidden="true" /> {backLabel}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {footerExtra}
          {onNext && (
            <Button onClick={onNext} disabled={nextDisabled} size="lg" className="group">
              {nextLabel}
              <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Button>
          )}
        </div>
      </footer>
    </Card>
  );
});

/** Rótulo de grupo de opções (para aria-labelledby). */
export function GroupLabel({ id, children, hint, required }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <p id={id} className="label-caps text-mute">
        {children}
        {required && (
          <span className="ml-1 text-caramel" aria-hidden="true">
            *
          </span>
        )}
      </p>
      {hint && <p className="text-[0.9375rem] text-faint">{hint}</p>}
    </div>
  );
}

export function GroupError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 text-[0.9375rem] text-clay" role="alert">
      {message}
    </p>
  );
}
