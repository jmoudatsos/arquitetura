import { Pencil, Send } from "lucide-react";
import { forwardRef } from "react";
import { Link } from "react-router";
import { Button } from "../../../components/ui/Button.jsx";
import { CheckboxField, TextAreaField } from "../../../components/ui/Field.jsx";
import { Alert } from "../../../components/ui/Feedback.jsx";
import { getRoom, getStyle, ROOM_QUESTIONS } from "../briefing.options.js";
import { answerToText, formatBytes } from "../lead.format.js";
import { StepShell } from "./StepShell.jsx";

function SummaryBlock({ title, onEdit, children }) {
  return (
    <section className="rounded-sm border border-line bg-ink p-5">
      <header className="mb-3 flex items-center justify-between gap-4">
        <h3 className="eyebrow text-caramel">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-xs px-2 py-1 text-[0.9375rem] text-mute hover:text-caramel"
        >
          <Pencil className="size-3.5" aria-hidden="true" /> Editar <span className="sr-only">{title}</span>
        </button>
      </header>
      {children}
    </section>
  );
}

function Row({ label, children }) {
  if (children == null || children === "" || (Array.isArray(children) && children.length === 0)) return null;
  return (
    <div className="grid gap-1 py-1.5 sm:grid-cols-[13rem_1fr] sm:gap-4">
      <dt className="text-faint">{label}</dt>
      <dd className="text-bone">{children}</dd>
    </div>
  );
}

export const StepReview = forwardRef(function StepReview(
  { values, errors, files, set, goTo, onBack, onSubmit, submitting, submitStatus, formError },
  headingRef,
) {
  const style = getStyle(values.estiloPrincipal);
  return (
    <StepShell
      ref={headingRef}
      step={5}
      title="Resumo do seu briefing"
      description="Confira os pontos mapeados. Ao enviar, nossa equipe recebe as especificações para preparar a proposta preliminar."
      onBack={submitting ? undefined : onBack}
      backLabel="Voltar e ajustar"
      footerExtra={
        <Button onClick={onSubmit} size="lg" loading={submitting} disabled={submitting}>
          {!submitting && <Send className="size-4" aria-hidden="true" />}
          {submitting ? submitStatus || "Enviando…" : "Enviar briefing completo"}
        </Button>
      }
    >
      <div className="space-y-4">
        <SummaryBlock title="Cliente & imóvel" onEdit={() => goTo(1)}>
          <dl>
            <Row label="Nome">{values.nome}</Row>
            <Row label="WhatsApp">{values.whatsapp}</Row>
            <Row label="E-mail">{values.email}</Row>
            <Row label="Cidade / bairro">{values.cidade}</Row>
            <Row label="Imóvel">{[values.tipoImovel, values.statusImovel].filter(Boolean).join(" · ")}</Row>
            <Row label="Início previsto">{values.previsaoInicio}</Row>
            <Row label="Investimento">{values.investimentoPrevisto}</Row>
          </dl>
        </SummaryBlock>

        <SummaryBlock title={`Ambientes no escopo (${values.ambientesSelecionados.length})`} onEdit={() => goTo(3)}>
          <div className="space-y-4">
            {values.ambientesSelecionados.map((roomId) => {
              const answers = values.detalhesAmbientes[roomId] ?? {};
              const rows = (ROOM_QUESTIONS[roomId] ?? [])
                .map((question) => [question.label, answerToText(question, answers[question.id])])
                .filter(([, text]) => text);
              return (
                <div key={roomId}>
                  <p className="text-[1.1875rem] text-bone">{getRoom(roomId)?.title}</p>
                  {rows.length ? (
                    <dl className="mt-1">
                      {rows.map(([label, text]) => (
                        <Row key={label} label={label}>
                          {text}
                        </Row>
                      ))}
                    </dl>
                  ) : (
                    <p className="text-faint">Sem detalhes — vamos alinhar no levantamento.</p>
                  )}
                </div>
              );
            })}
          </div>
        </SummaryBlock>

        <SummaryBlock title="Identidade visual" onEdit={() => goTo(4)}>
          <dl>
            <Row label="Estilo">{style?.title ?? "Ainda não definido"}</Row>
            <Row label="Materiais">{values.materiaisGostados.join(", ")}</Row>
            <Row label="Links">{values.referencias.length ? `${values.referencias.length} link(s)` : null}</Row>
            <Row label="Arquivos">
              {files.length ? files.map((item) => `${item.file.name} (${formatBytes(item.file.size)})`).join(", ") : null}
            </Row>
          </dl>
        </SummaryBlock>

        <TextAreaField
          id="briefing-observacoesFinais"
          data-field="observacoesFinais"
          label="Alguma prioridade especial ou detalhe que queira frisar?"
          rows={3}
          maxLength={4000}
          placeholder="Ex.: priorizamos móveis duráveis, fáceis de limpar e com amortecimento nas portas."
          value={values.observacoesFinais}
          error={errors.observacoesFinais}
          onChange={(event) => set("observacoesFinais", event.target.value)}
        />

        <CheckboxField
          id="briefing-consentimento"
          data-field="consentimento"
          checked={values.consentimento}
          onChange={(event) => set("consentimento", event.target.checked)}
          error={errors.consentimento}
          label="Autorizo o uso destes dados para a elaboração da proposta e contato pelo WhatsApp/e-mail."
          description={
            <>
              Seus dados ficam restritos à nossa equipe. Veja a{" "}
              <Link to="/privacidade" target="_blank" className="text-caramel underline underline-offset-4">
                política de privacidade
              </Link>
              .
            </>
          }
        />

        {/* Honeypot anti-spam: invisível para pessoas, robôs costumam preencher. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor="briefing-website">Site</label>
          <input
            id="briefing-website"
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={values.website}
            onChange={(event) => set("website", event.target.value)}
          />
        </div>

        {formError && (
          <Alert tone="error" title="Não foi possível enviar">
            {formError}
          </Alert>
        )}
      </div>
    </StepShell>
  );
});
