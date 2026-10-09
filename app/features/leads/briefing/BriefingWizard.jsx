/**
 * Assistente de briefing em 5 etapas.
 *
 * Fluxo de envio (TanStack Query → useMutation):
 *   1. valida tudo no navegador (mesmo esquema zod do servidor);
 *   2. sobe os anexos direto para o Storage (se houver Supabase);
 *   3. envia o JSON para a action da rota /briefing, que repassa à Edge
 *      Function `create-lead` (ou grava no modo demonstração).
 */
import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { ProgressBar, WizardStepper } from "../../../components/ui/Stepper.jsx";
import { Alert } from "../../../components/ui/Feedback.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { uuidv4 } from "../../../utils/uuid.js";
import { briefingSchema, issuesToFieldErrors, stepForPath, validateStep } from "../lead.schema.js";
import {
  briefingReducer,
  clearDraft,
  createInitialValues,
  hasMeaningfulDraft,
  loadDraft,
  sanitizeValues,
  saveDraft,
  STEP_NAMES,
  TOTAL_STEPS,
  validateFiles,
} from "./briefing.state.js";
import { BriefingSuccess } from "./BriefingSuccess.jsx";
import { StepAbout } from "./StepAbout.jsx";
import { StepReview } from "./StepReview.jsx";
import { StepRoomDetails } from "./StepRoomDetails.jsx";
import { StepRooms } from "./StepRooms.jsx";
import { StepStyle } from "./StepStyle.jsx";
import { describeAttachments, uploadBriefingFiles } from "./upload.js";

const cssEscape = (value) => (globalThis.CSS?.escape ? globalThis.CSS.escape(value) : value.replace(/["\\]/g, "\\$&"));

function focusFirstError(fieldErrors) {
  const first = Object.keys(fieldErrors)[0];
  if (!first || typeof document === "undefined") return;
  // Procura o campo exato e, se não houver, o "pai" (ex.: detalhesAmbientes.cozinha.eletros.forno → …eletros).
  const parts = first.split(".");
  for (let size = parts.length; size > 0; size -= 1) {
    const key = parts.slice(0, size).join(".");
    const element = document.querySelector(`[data-field="${cssEscape(key)}"]`);
    if (!element) continue;
    const target = element.matches("input, select, textarea, button")
      ? element
      : element.querySelector("input, select, textarea, button");
    target?.focus({ preventScroll: true });
    element.scrollIntoView?.({ behavior: "smooth", block: "center" });
    return;
  }
}

export function BriefingWizard({
  prefill = {},
  clientPrefill = {},
  utm = {},
  origin = "briefing",
  studioWhatsapp,
  demoMode = false,
}) {
  const [values, dispatch] = useReducer(briefingReducer, prefill, (initialPrefill) =>
    sanitizeValues({ ...createInitialValues(), ...initialPrefill }),
  );
  const [step, setStep] = useState(1);
  const [maxReached, setMaxReached] = useState(1);
  const [errors, setErrors] = useState({});
  const [activeRoom, setActiveRoom] = useState(null);
  const [files, setFiles] = useState([]);
  const [fileRejections, setFileRejections] = useState([]);
  const [formError, setFormError] = useState(null);
  const [submitIssue, setSubmitIssue] = useState(null);
  const [submitStatus, setSubmitStatus] = useState("");
  const [result, setResult] = useState(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [ready, setReady] = useState(false);

  const submissionIdRef = useRef(null);
  const headingRef = useRef(null);
  const topRef = useRef(null);
  const stepChangedRef = useRef(false);
  const fetcher = useFetcher();
  const hasPrefill = Object.keys(prefill).length > 0 || Object.keys(clientPrefill).length > 0;
  const [prefilledFromHome, setPrefilledFromHome] = useState(false);

  /*
   * Ao abrir: rascunho salvo + pré-preenchimento. O pré-preenchimento do card
   * da home (clientPrefill) só existe no navegador, então é aplicado aqui, depois
   * da hidratação — assim o HTML do servidor e o do cliente batem.
   */
  useEffect(() => {
    const draft = loadDraft();
    const usableDraft = draft && hasMeaningfulDraft(draft.values) ? draft : null;
    const merged = { ...(usableDraft?.values ?? {}), ...prefill, ...clientPrefill };
    if (Object.keys(merged).length) dispatch({ type: "hydrate", values: merged });
    if (usableDraft) {
      if (!hasPrefill) {
        setStep(usableDraft.step);
        setMaxReached(usableDraft.maxReached);
      }
      setDraftRestored(true);
    }
    setPrefilledFromHome(Boolean(clientPrefill.nome || clientPrefill.whatsapp));
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || result) return undefined;
    const timer = setTimeout(() => saveDraft({ values, step, maxReached }), 400);
    return () => clearTimeout(timer);
  }, [ready, result, values, step, maxReached]);

  /* ── foco e rolagem ao trocar de etapa (acessibilidade) ── */
  useEffect(() => {
    if (!stepChangedRef.current) return;
    stepChangedRef.current = false;
    topRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    headingRef.current?.focus({ preventScroll: true });
  }, [step, result]);

  const goToStep = useCallback((target) => {
    stepChangedRef.current = true;
    setDraftRestored(false);
    setStep(target);
    setMaxReached((current) => Math.max(current, target));
    setErrors({});
  }, []);

  const set = useCallback((field, value) => {
    dispatch({ type: "set", field, value });
    setErrors((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }, []);

  const actions = {
    set,
    setAnswer: (roomId, questionId, value) => dispatch({ type: "setAnswer", roomId, questionId, value }),
    toggleAnswer: (roomId, questionId, option) => dispatch({ type: "toggleAnswer", roomId, questionId, option }),
    setMatrix: (roomId, questionId, rowId, value) => dispatch({ type: "setMatrix", roomId, questionId, rowId, value }),
    toggleMaterial: (material) => dispatch({ type: "toggleMaterial", material }),
    addReference: (url) => dispatch({ type: "addReference", url }),
    removeReference: (index) => dispatch({ type: "removeReference", index }),
  };

  function next() {
    const stepErrors = validateStep(step, values);
    if (Object.keys(stepErrors).length) {
      setErrors(stepErrors);
      requestAnimationFrame(() => focusFirstError(stepErrors));
      return;
    }
    if (step === 2 && !values.ambientesSelecionados.includes(activeRoom)) {
      setActiveRoom(values.ambientesSelecionados[0] ?? null);
    }
    goToStep(Math.min(step + 1, TOTAL_STEPS));
  }

  function back() {
    goToStep(Math.max(step - 1, 1));
  }

  function jumpTo(target) {
    if (target === 3 && !values.ambientesSelecionados.includes(activeRoom)) {
      setActiveRoom(values.ambientesSelecionados[0] ?? null);
    }
    goToStep(target);
  }

  /* ── arquivos ── */
  function addFiles(fileList) {
    const incoming = Array.from(fileList ?? []);
    if (!incoming.length) return;
    const existing = files.map((item) => ({ name: item.file.name, size: item.file.size }));
    const { accepted, rejected } = validateFiles(existing, incoming);
    setFileRejections(rejected);
    if (accepted.length) {
      setFiles((current) => [...current, ...accepted.map((file) => ({ id: uuidv4(), file, status: "pending" }))]);
    }
  }

  function removeFile(id) {
    setFiles((current) => current.filter((item) => item.id !== id));
  }

  function setFileStatus(id, status) {
    setFiles((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
  }

  /* ── envio ── */
  function applyFieldErrors(fieldErrors, message) {
    setErrors(fieldErrors);
    const keys = Object.keys(fieldErrors);
    const firstStep = Math.min(...keys.map(stepForPath));
    setSubmitIssue(message ?? "Revise os campos destacados antes de enviar.");
    if (firstStep !== step) {
      if (firstStep === 3) {
        const roomKey = keys.find((key) => stepForPath(key) === 3)?.split(".")[1];
        setActiveRoom(values.ambientesSelecionados.includes(roomKey) ? roomKey : values.ambientesSelecionados[0]);
      }
      stepChangedRef.current = true;
      setStep(firstStep);
    }
    // Mantém os erros visíveis na etapa de destino.
    requestAnimationFrame(() => {
      setErrors(fieldErrors);
      focusFirstError(fieldErrors);
    });
  }

  const submission = useMutation({
    mutationFn: async () => {
      submissionIdRef.current ??= uuidv4();
      const submissionId = submissionIdRef.current;
      const payload = {
        ...values,
        submissionId,
        anexos: describeAttachments(files, submissionId),
        origem: origin,
        utm,
      };

      const parsed = briefingSchema.safeParse(payload);
      if (!parsed.success) {
        const error = new Error("validation");
        error.fieldErrors = issuesToFieldErrors(parsed.error);
        throw error;
      }

      if (files.length && !demoMode) setSubmitStatus("Enviando arquivos…");
      await uploadBriefingFiles(files, submissionId, setFileStatus);
      setSubmitStatus("Registrando briefing…");
      await fetcher.submit(payload, { method: "post", encType: "application/json" });
    },
    onMutate: () => {
      setFormError(null);
      setSubmitIssue(null);
    },
    onError: (error) => {
      if (error.fieldErrors) applyFieldErrors(error.fieldErrors);
      else setFormError(error.message || "Não foi possível enviar agora. Tente novamente.");
    },
    onSettled: () => setSubmitStatus(""),
  });

  // Resposta da action (servidor).
  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    const data = fetcher.data;
    if (data.ok) {
      clearDraft();
      stepChangedRef.current = true;
      setResult({ leadId: data.leadId, demo: data.demo });
    } else if (data.fieldErrors && Object.keys(data.fieldErrors).length) {
      applyFieldErrors(data.fieldErrors, data.message);
    } else {
      setFormError(data.message ?? "Não foi possível enviar agora. Tente novamente.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.state, fetcher.data]);

  function restart() {
    clearDraft();
    dispatch({ type: "reset" });
    submissionIdRef.current = null;
    setFiles([]);
    setFileRejections([]);
    setErrors({});
    setFormError(null);
    setSubmitIssue(null);
    setDraftRestored(false);
    setResult(null);
    setMaxReached(1);
    stepChangedRef.current = true;
    setStep(1);
  }

  const submitting = submission.isPending || fetcher.state !== "idle";

  if (result) {
    return (
      <div ref={topRef} className="scroll-mt-28">
        <BriefingSuccess
          name={values.nome}
          rooms={values.ambientesSelecionados}
          leadId={result.leadId}
          studioWhatsapp={studioWhatsapp}
          demo={result.demo}
          onRestart={restart}
        />
      </div>
    );
  }

  const stepProps = { ref: headingRef, values, errors };

  return (
    <div ref={topRef} className="scroll-mt-28">
      <ProgressBar value={(step / TOTAL_STEPS) * 100} label="Progresso do briefing" className="mb-8" />
      <WizardStepper steps={STEP_NAMES} current={step} maxReached={maxReached} onStepClick={jumpTo} className="mb-10" />

      {draftRestored && (
        <Alert tone="info" className="mb-6" title="Continuamos de onde você parou">
          Seu rascunho fica salvo neste navegador.{" "}
          <Button variant="link" size="sm" onClick={restart} className="align-baseline text-[1rem] normal-case">
            Recomeçar do zero
          </Button>
        </Alert>
      )}
      {submitIssue && (
        <Alert tone="error" className="mb-6">
          {submitIssue}
        </Alert>
      )}

      {step === 1 && <StepAbout {...stepProps} set={set} onNext={next} prefilled={prefilledFromHome} />}
      {step === 2 && (
        <StepRooms {...stepProps} toggleRoom={(roomId) => {
          dispatch({ type: "toggleRoom", roomId });
          setErrors({});
        }} onBack={back} onNext={next} />
      )}
      {step === 3 && (
        <StepRoomDetails
          {...stepProps}
          activeRoom={activeRoom}
          setActiveRoom={setActiveRoom}
          actions={actions}
          onBack={back}
          onNext={next}
        />
      )}
      {step === 4 && (
        <StepStyle
          {...stepProps}
          actions={actions}
          files={files}
          fileRejections={fileRejections}
          onAddFiles={addFiles}
          onRemoveFile={removeFile}
          demoMode={demoMode}
          onBack={back}
          onNext={next}
        />
      )}
      {step === 5 && (
        <StepReview
          {...stepProps}
          files={files}
          set={set}
          goTo={jumpTo}
          onBack={back}
          onSubmit={() => submission.mutate()}
          submitting={submitting}
          submitStatus={submitStatus}
          formError={formError}
        />
      )}
    </div>
  );
}
