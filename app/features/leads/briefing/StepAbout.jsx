import { forwardRef } from "react";
import { ChoiceGroup, ChoicePill } from "../../../components/ui/Choice.jsx";
import { SelectField, TextField } from "../../../components/ui/Field.jsx";
import { maskPhoneInput } from "../../../utils/phone.js";
import { BUDGET_RANGES, PROPERTY_STATUSES, PROPERTY_TYPES, START_FORECASTS } from "../briefing.options.js";
import { GroupError, GroupLabel, StepShell } from "./StepShell.jsx";

function PillGroup({ field, label, options, value, error, onChange }) {
  const labelId = `briefing-${field}-label`;
  return (
    <div data-field={field}>
      <GroupLabel id={labelId} required>
        {label}
      </GroupLabel>
      <ChoiceGroup labelledBy={labelId} className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {options.map((option) => (
          <ChoicePill
            key={option}
            selected={value === option}
            onSelect={() => onChange(option)}
            aria-describedby={error ? `${labelId}-error` : undefined}
          >
            {option}
          </ChoicePill>
        ))}
      </ChoiceGroup>
      <GroupError id={`${labelId}-error`} message={error} />
    </div>
  );
}

export const StepAbout = forwardRef(function StepAbout({ values, errors, set, onNext, prefilled }, headingRef) {
  return (
    <StepShell
      ref={headingRef}
      step={1}
      title="Sobre você & seu imóvel"
      description="Começamos conhecendo quem conduz o projeto e as características gerais da obra — isso orienta prazos e as próximas perguntas."
      onNext={onNext}
      nextLabel="Avançar para ambientes"
    >
      {prefilled && (
        <p className="-mt-2 mb-6 rounded-sm border border-walnut/40 bg-walnut/8 px-4 py-3 text-[1rem] text-mute">
          Trouxemos o que você já informou na página inicial. Complete os dados abaixo.
        </p>
      )}
      <div className="space-y-7">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="briefing-nome"
            data-field="nome"
            label="Nome completo"
            required
            autoComplete="name"
            placeholder="Ex.: Mariana Albuquerque"
            value={values.nome}
            maxLength={120}
            error={errors.nome}
            onChange={(event) => set("nome", event.target.value)}
          />
          <TextField
            id="briefing-whatsapp"
            data-field="whatsapp"
            label="WhatsApp / telefone"
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(48) 99999-0000"
            value={values.whatsapp}
            error={errors.whatsapp}
            onChange={(event) => set("whatsapp", maskPhoneInput(event.target.value))}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="briefing-email"
            data-field="email"
            label="E-mail (opcional)"
            type="email"
            autoComplete="email"
            placeholder="voce@email.com"
            value={values.email}
            maxLength={160}
            error={errors.email}
            onChange={(event) => set("email", event.target.value)}
          />
          <TextField
            id="briefing-cidade"
            data-field="cidade"
            label="Cidade & bairro do imóvel"
            autoComplete="address-level2"
            placeholder="Ex.: Florianópolis / Itacorubi"
            value={values.cidade}
            maxLength={120}
            error={errors.cidade}
            onChange={(event) => set("cidade", event.target.value)}
          />
        </div>

        <PillGroup
          field="tipoImovel"
          label="Tipo de imóvel"
          options={PROPERTY_TYPES}
          value={values.tipoImovel}
          error={errors.tipoImovel}
          onChange={(value) => set("tipoImovel", value)}
        />

        <PillGroup
          field="statusImovel"
          label="Momento do espaço"
          options={PROPERTY_STATUSES}
          value={values.statusImovel}
          error={errors.statusImovel}
          onChange={(value) => set("statusImovel", value)}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            id="briefing-previsaoInicio"
            data-field="previsaoInicio"
            label="Previsão para início da execução"
            required
            placeholder="Selecione…"
            options={START_FORECASTS}
            value={values.previsaoInicio}
            error={errors.previsaoInicio}
            onChange={(event) => set("previsaoInicio", event.target.value)}
          />
          <SelectField
            id="briefing-investimentoPrevisto"
            data-field="investimentoPrevisto"
            label="Investimento em marcenaria"
            required
            placeholder="Selecione…"
            options={BUDGET_RANGES}
            value={values.investimentoPrevisto}
            error={errors.investimentoPrevisto}
            onChange={(event) => set("investimentoPrevisto", event.target.value)}
          />
        </div>
      </div>
    </StepShell>
  );
});
