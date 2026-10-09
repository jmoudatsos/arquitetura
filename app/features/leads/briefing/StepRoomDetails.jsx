import { ArrowRight } from "lucide-react";
import { forwardRef, useRef } from "react";
import { Button } from "../../../components/ui/Button.jsx";
import { ChoiceCheck, ChoiceGroup, ChoicePill } from "../../../components/ui/Choice.jsx";
import { TextAreaField } from "../../../components/ui/Field.jsx";
import { cn } from "../../../utils/cn.js";
import { getRoom, ROOM_QUESTIONS } from "../briefing.options.js";
import { ROOM_ICONS } from "./room-icons.js";
import { GroupError, GroupLabel, StepShell } from "./StepShell.jsx";

function errorFor(errors, roomId, questionId) {
  const prefix = `detalhesAmbientes.${roomId}.${questionId}`;
  const key = Object.keys(errors).find((k) => k === prefix || k.startsWith(`${prefix}.`));
  return key ? errors[key] : undefined;
}

function countAnswered(roomId, answers = {}) {
  return (ROOM_QUESTIONS[roomId] ?? []).filter((question) => {
    const value = answers[question.id];
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === "object") return Object.keys(value).length > 0;
    return typeof value === "string" ? value.trim() !== "" : value != null;
  }).length;
}

function Question({ roomId, question, value, error, actions, index }) {
  const labelId = `q-${roomId}-${question.id}`;
  const label = `${index + 1}. ${question.label}`;
  const fieldPath = `detalhesAmbientes.${roomId}.${question.id}`;

  if (question.type === "text") {
    return (
      <TextAreaField
        id={`briefing-${roomId}-${question.id}`}
        data-field={fieldPath}
        label={label}
        rows={3}
        maxLength={1500}
        placeholder={question.placeholder}
        value={value ?? ""}
        error={error}
        onChange={(event) => actions.setAnswer(roomId, question.id, event.target.value)}
      />
    );
  }

  if (question.type === "single") {
    return (
      <div data-field={fieldPath}>
        <GroupLabel id={labelId} hint="Escolha uma opção">
          {label}
        </GroupLabel>
        <ChoiceGroup labelledBy={labelId} className="grid grid-cols-2 gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]">
          {question.options.map((option) => (
            <ChoicePill key={option} selected={value === option} onSelect={() => actions.setAnswer(roomId, question.id, option)}>
              {option}
            </ChoicePill>
          ))}
        </ChoiceGroup>
        <GroupError id={`${labelId}-error`} message={error} />
      </div>
    );
  }

  if (question.type === "multi") {
    return (
      <div data-field={fieldPath}>
        <GroupLabel id={labelId} hint="Marque quantas quiser">
          {label}
        </GroupLabel>
        <ChoiceGroup type="checkbox" labelledBy={labelId} className="grid gap-2 sm:grid-cols-2">
          {question.options.map((option) => (
            <ChoiceCheck
              key={option}
              selected={(value ?? []).includes(option)}
              onToggle={() => actions.toggleAnswer(roomId, question.id, option)}
            >
              {option}
            </ChoiceCheck>
          ))}
        </ChoiceGroup>
        <GroupError id={`${labelId}-error`} message={error} />
      </div>
    );
  }

  // matrix
  return (
    <div data-field={fieldPath}>
      <GroupLabel id={labelId} hint={question.hint}>
        {label}
      </GroupLabel>
      <div className="divide-y divide-line rounded-sm border border-line bg-ink" aria-labelledby={labelId} role="group">
        {question.rows.map((row) => {
          const rowLabelId = `${labelId}-${row.id}`;
          return (
            <div key={row.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <span id={rowLabelId} className="text-[1.0625rem] text-bone">
                {row.label}
              </span>
              <ChoiceGroup labelledBy={rowLabelId} className="flex flex-wrap gap-1.5">
                {question.options.map((option) => (
                  <ChoicePill
                    key={option}
                    selected={value?.[row.id] === option}
                    onSelect={() => actions.setMatrix(roomId, question.id, row.id, option)}
                    className="min-h-9 px-3 py-1.5 text-[0.9375rem]"
                  >
                    {option}
                  </ChoicePill>
                ))}
              </ChoiceGroup>
            </div>
          );
        })}
      </div>
      <GroupError id={`${labelId}-error`} message={error} />
    </div>
  );
}

export const StepRoomDetails = forwardRef(function StepRoomDetails(
  { values, errors, activeRoom, setActiveRoom, actions, onBack, onNext },
  headingRef,
) {
  const rooms = values.ambientesSelecionados;
  const current = rooms.includes(activeRoom) ? activeRoom : rooms[0];
  const currentIndex = rooms.indexOf(current);
  const nextRoom = rooms[currentIndex + 1];
  const tabRefs = useRef({});

  function onTabKeyDown(event) {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    let index = currentIndex;
    if (event.key === "ArrowRight") index = (currentIndex + 1) % rooms.length;
    if (event.key === "ArrowLeft") index = (currentIndex - 1 + rooms.length) % rooms.length;
    if (event.key === "Home") index = 0;
    if (event.key === "End") index = rooms.length - 1;
    setActiveRoom(rooms[index]);
    tabRefs.current[rooms[index]]?.focus();
  }

  return (
    <StepShell
      ref={headingRef}
      step={3}
      title="Configuração específica de cada espaço"
      description="Responda o que já souber — nada aqui é obrigatório. O que ficar em aberto, resolvemos juntos no levantamento técnico."
      onBack={onBack}
      backLabel="Voltar aos ambientes"
      onNext={onNext}
      nextLabel="Avançar para estilo & materiais"
    >
      <div role="tablist" aria-label="Ambientes selecionados" className="-mt-2 mb-8 flex flex-wrap gap-2">
        {rooms.map((roomId) => {
          const Icon = ROOM_ICONS[roomId];
          const answered = countAnswered(roomId, values.detalhesAmbientes[roomId]);
          const total = ROOM_QUESTIONS[roomId]?.length ?? 0;
          const isActive = roomId === current;
          return (
            <button
              key={roomId}
              ref={(node) => {
                tabRefs.current[roomId] = node;
              }}
              type="button"
              role="tab"
              id={`tab-${roomId}`}
              aria-selected={isActive}
              aria-controls={`panel-${roomId}`}
              tabIndex={isActive ? 0 : -1}
              onKeyDown={onTabKeyDown}
              onClick={() => setActiveRoom(roomId)}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-sm border px-4 text-[0.9375rem] font-semibold tracking-[0.1em] uppercase transition-colors",
                isActive ? "border-walnut bg-walnut text-ink" : "border-line bg-ink text-mute hover:border-field hover:text-bone",
              )}
            >
              <Icon className="size-4" strokeWidth={1.6} aria-hidden="true" />
              {getRoom(roomId)?.shortTitle}
              <span className={cn("tabular text-[0.8125rem] tracking-normal", isActive ? "text-ink/75" : "text-faint")}>
                {answered}/{total}
              </span>
            </button>
          );
        })}
      </div>

      {current && (
        <div role="tabpanel" id={`panel-${current}`} aria-labelledby={`tab-${current}`} className="animate-fade-in space-y-9" key={current}>
          <h3 className="text-[1.75rem] leading-tight text-bone">{getRoom(current)?.title}</h3>
          {(ROOM_QUESTIONS[current] ?? []).map((question, index) => (
            <Question
              key={question.id}
              roomId={current}
              question={question}
              index={index}
              value={values.detalhesAmbientes[current]?.[question.id]}
              error={errorFor(errors, current, question.id)}
              actions={actions}
            />
          ))}
          {nextRoom && (
            <div className="flex justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setActiveRoom(nextRoom);
                  // Leva o foco (e a rolagem) de volta às abas, já no próximo ambiente.
                  tabRefs.current[nextRoom]?.focus();
                }}
              >
                Próximo: {getRoom(nextRoom)?.shortTitle} <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>
      )}
    </StepShell>
  );
});
