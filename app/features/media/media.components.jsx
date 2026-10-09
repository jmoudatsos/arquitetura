import { Check, ImagePlus, Upload } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { Button } from "../../components/ui/Button.jsx";
import { Dialog } from "../../components/ui/Dialog.jsx";
import { Alert, EmptyState } from "../../components/ui/Feedback.jsx";
import { cn } from "../../utils/cn.js";
import { MEDIA_RULES } from "./media.schema.js";

/** Valor salvo nos projetos/configurações para uma mídia da biblioteca. */
export function mediaSourceOf(media) {
  return media?.path || media?.url || "";
}

export function MediaThumb({ src, alt = "", className, children }) {
  return (
    <div className={cn("relative overflow-hidden rounded-xs border border-line bg-panel", className)}>
      {src ? (
        <img src={src} alt={alt} loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-faint">
          <ImagePlus className="size-6" aria-hidden="true" />
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * Formulário de upload (envia para a action de /admin/midia).
 * Funciona dentro de qualquer página do admin via fetcher.
 */
export function MediaUploadForm({ compact = false, onUploaded }) {
  const fetcher = useFetcher();
  const inputRef = useRef(null);
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState(null);
  const busy = fetcher.state !== "idle";
  const result = fetcher.data;

  useEffect(() => {
    if (fetcher.state === "idle" && result?.ok && result.intent === "upload") {
      onUploaded?.(result.uploaded ?? []);
      if (inputRef.current) inputRef.current.value = "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.state, result]);

  function submitFiles(fileList) {
    const files = Array.from(fileList ?? []);
    if (!files.length) return;
    if (files.length > MEDIA_RULES.maxFilesPerUpload) {
      setLocalError(`Envie no máximo ${MEDIA_RULES.maxFilesPerUpload} imagens por vez.`);
      return;
    }
    setLocalError(null);
    const formData = new FormData();
    formData.set("intent", "upload");
    for (const file of files) formData.append("files", file);
    fetcher.submit(formData, { method: "post", action: "/admin/midia", encType: "multipart/form-data" });
  }

  return (
    <div>
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          submitFiles(event.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border border-dashed text-center transition-colors",
          compact ? "px-4 py-5" : "px-6 py-10",
          dragging ? "border-caramel bg-walnut/10" : "border-field hover:border-caramel hover:bg-panel",
          busy && "pointer-events-none opacity-60",
        )}
      >
        <Upload className="size-6 text-caramel" aria-hidden="true" />
        <span className="text-bone">{busy ? "Enviando imagens…" : "Arraste imagens ou clique para escolher"}</span>
        <span className="text-[0.9375rem] text-faint">JPG, PNG, WebP, AVIF ou GIF · até 10 MB cada</span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          accept={MEDIA_RULES.accept}
          className="sr-only"
          onChange={(event) => submitFiles(event.target.files)}
        />
      </label>
      {(localError || (result && !result.ok && result.intent === "upload")) && (
        <Alert tone="error" className="mt-3">
          {localError ?? result.message}
        </Alert>
      )}
      {result?.ok && result.intent === "upload" && result.errors?.length > 0 && (
        <Alert tone="warning" className="mt-3" title="Algumas imagens não foram enviadas">
          <ul className="list-disc pl-5">
            {result.errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </Alert>
      )}
    </div>
  );
}

/**
 * Seletor de mídia em modal.
 * @param {{ open: boolean, onClose: () => void, media: any[], multiple?: boolean, onConfirm: (items: any[]) => void, title?: string }} props
 */
export function MediaPickerDialog({ open, onClose, media, multiple = false, onConfirm, title }) {
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (open) setSelected([]);
  }, [open]);

  const byId = useMemo(() => new Map(media.map((item) => [item.id, item])), [media]);

  function toggle(id) {
    setSelected((current) => {
      if (!multiple) return current[0] === id ? [] : [id];
      return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    });
  }

  function confirm() {
    onConfirm(selected.map((id) => byId.get(id)).filter(Boolean));
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title ?? (multiple ? "Escolher imagens" : "Escolher imagem")}
      description="Selecione da biblioteca ou envie novas imagens."
      footer={
        <div className="flex items-center justify-between gap-4">
          <span className="text-[0.9375rem] text-faint">
            {selected.length ? `${selected.length} selecionada(s)` : "Nenhuma selecionada"}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button size="sm" onClick={confirm} disabled={!selected.length}>
              Usar {multiple ? "selecionadas" : "imagem"}
            </Button>
          </div>
        </div>
      }
    >
      <MediaUploadForm compact onUploaded={(items) => setSelected((current) => (multiple ? [...current, ...items.map((i) => i.id)] : items.slice(0, 1).map((i) => i.id)))} />

      {media.length === 0 ? (
        <EmptyState icon={ImagePlus} title="Biblioteca vazia" className="mt-5">
          Envie a primeira imagem acima.
        </EmptyState>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label="Biblioteca de imagens">
          {media.map((item) => {
            const isSelected = selected.includes(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  role={multiple ? "checkbox" : "radio"}
                  aria-checked={isSelected}
                  aria-label={item.alt || "Imagem sem descrição"}
                  onClick={() => toggle(item.id)}
                  className={cn(
                    "group block w-full rounded-xs outline-offset-2",
                    isSelected && "ring-2 ring-caramel ring-offset-2 ring-offset-ink",
                  )}
                >
                  <MediaThumb src={item.public_url} alt="" className="aspect-[4/3]">
                    <span
                      className={cn(
                        "absolute top-2 right-2 flex size-6 items-center justify-center rounded-full border transition-colors",
                        isSelected ? "border-walnut bg-walnut text-ink" : "border-bone/40 bg-ink/60 text-transparent",
                      )}
                    >
                      <Check className="size-3.5" strokeWidth={3} />
                    </span>
                  </MediaThumb>
                  <span className="mt-1.5 block truncate text-left text-[0.875rem] text-faint">{item.alt || "Sem descrição"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Dialog>
  );
}
