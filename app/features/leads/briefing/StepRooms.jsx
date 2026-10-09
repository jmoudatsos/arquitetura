import { Check } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "../../../utils/cn.js";
import { ROOMS } from "../briefing.options.js";
import { ROOM_ICONS } from "./room-icons.js";
import { GroupError, StepShell } from "./StepShell.jsx";

export const StepRooms = forwardRef(function StepRooms({ values, errors, toggleRoom, onBack, onNext }, headingRef) {
  const selected = values.ambientesSelecionados;
  return (
    <StepShell
      ref={headingRef}
      step={2}
      title="Quais ambientes você deseja projetar?"
      description="Selecione os cômodos. As próximas etapas fazem perguntas específicas apenas para os ambientes marcados."
      onBack={onBack}
      onNext={onNext}
      nextLabel={selected.length ? `Detalhar ${selected.length} ambiente${selected.length > 1 ? "s" : ""}` : "Detalhar ambientes"}
    >
      <div data-field="ambientesSelecionados" role="group" aria-label="Ambientes" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ROOMS.map((room) => {
          const Icon = ROOM_ICONS[room.id];
          const isSelected = selected.includes(room.id);
          return (
            <button
              key={room.id}
              type="button"
              role="checkbox"
              aria-checked={isSelected}
              onClick={() => toggleRoom(room.id)}
              className={cn(
                "group flex flex-col justify-between rounded-sm border p-5 text-left transition-colors duration-150",
                isSelected ? "border-walnut bg-walnut/8" : "border-line bg-ink hover:border-field",
              )}
            >
              <span className="flex items-start justify-between">
                <span
                  className={cn(
                    "flex size-12 items-center justify-center rounded-sm border transition-colors",
                    isSelected ? "border-walnut bg-walnut text-ink" : "border-line text-caramel group-hover:border-field",
                  )}
                >
                  <Icon className="size-6" strokeWidth={1.4} aria-hidden="true" />
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full border transition-colors",
                    isSelected ? "border-walnut bg-walnut text-ink" : "border-field text-transparent",
                  )}
                >
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
              </span>
              <span className="mt-5 block text-[1.375rem] leading-tight text-bone">{room.title}</span>
              <span className="mt-2 block text-[1rem] leading-snug text-mute">{room.desc}</span>
              <span className="mt-5 flex items-center justify-between border-t border-line pt-3 text-[0.9375rem]">
                <span className="text-faint">{room.badge}</span>
                <span className={cn("font-semibold", isSelected ? "text-caramel" : "text-mute")}>
                  {isSelected ? "Selecionado" : "+ Adicionar"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <GroupError id="ambientes-error" message={errors.ambientesSelecionados} />
    </StepShell>
  );
});
