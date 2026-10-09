import { Check, FileText, Image as ImageIcon, Link2, UploadCloud, X } from "lucide-react";
import { forwardRef, useId, useState } from "react";
import { Button } from "../../../components/ui/Button.jsx";
import { ChoiceChip, ChoiceGroup } from "../../../components/ui/Choice.jsx";
import { controlClasses } from "../../../components/ui/Field.jsx";
import { Alert } from "../../../components/ui/Feedback.jsx";
import { cn } from "../../../utils/cn.js";
import { ATTACHMENT_RULES, MATERIALS, MAX_REFERENCE_LINKS, STYLE_PRESETS } from "../briefing.options.js";
import { formatBytes } from "../lead.format.js";
import { GroupError, GroupLabel, StepShell } from "./StepShell.jsx";

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function StyleCard({ preset, selected, onSelect }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "group flex flex-col overflow-hidden rounded-sm border text-left transition-colors duration-200",
        selected ? "border-walnut ring-1 ring-walnut" : "border-line hover:border-field",
      )}
    >
      <span className="relative block h-48 overflow-hidden bg-panel sm:h-52">
        <img
          src={preset.image}
          alt=""
          loading="lazy"
          decoding="async"
          className={cn(
            "img-warm absolute inset-0 size-full object-cover transition-[transform,filter] duration-700 group-hover:scale-105",
            !selected && "brightness-[0.8]",
          )}
        />
        <span className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" aria-hidden="true" />
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-3 right-3 flex size-7 items-center justify-center rounded-full border backdrop-blur-sm transition-colors",
            selected ? "border-walnut bg-walnut text-ink" : "border-bone/50 bg-ink/40 text-transparent",
          )}
        >
          <Check className="size-4" strokeWidth={3} />
        </span>
        <span className="absolute right-4 bottom-4 left-4">
          <span className="mb-1.5 inline-block rounded-xs border border-bone/20 bg-ink/60 px-2 py-0.5 text-[0.8125rem] font-semibold tracking-[0.08em] text-bone uppercase backdrop-blur-sm">
            {preset.colorTag}
          </span>
          <span className="block text-[1.5rem] leading-tight text-bone">{preset.title}</span>
        </span>
      </span>
      <span className="flex flex-1 flex-col justify-between bg-ink p-4">
        <span className="text-[1rem] leading-snug text-mute">{preset.desc}</span>
        <span className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-3">
          {preset.tags.map((tag) => (
            <span
              key={tag}
              className={cn(
                "rounded-xs px-2 py-0.5 text-[0.8125rem] font-semibold",
                selected ? "bg-walnut/20 text-caramel" : "bg-panel text-faint",
              )}
            >
              #{tag}
            </span>
          ))}
        </span>
      </span>
    </button>
  );
}

export const StepStyle = forwardRef(function StepStyle(
  { values, errors, actions, files, fileRejections, onAddFiles, onRemoveFile, demoMode, onBack, onNext },
  headingRef,
) {
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputId = useId();
  const styleLabelId = "estilo-label";

  function addLink() {
    const value = link.trim();
    if (!value) return;
    if (!isHttpUrl(value)) {
      setLinkError("Cole um link completo, começando com https://");
      return;
    }
    if (values.referencias.length >= MAX_REFERENCE_LINKS) {
      setLinkError(`Você pode adicionar até ${MAX_REFERENCE_LINKS} links.`);
      return;
    }
    actions.addReference(value);
    setLink("");
    setLinkError(null);
  }

  return (
    <StepShell
      ref={headingRef}
      step={4}
      title="Linguagem visual & acabamentos"
      description="Escolha a atmosfera que mais combina com você, os materiais que agradam e, se tiver, envie a planta e referências."
      onBack={onBack}
      onNext={onNext}
      nextLabel="Revisar & finalizar"
    >
      <div className="space-y-12">
        <section data-field="estiloPrincipal">
          <GroupLabel id={styleLabelId} hint="Clique de novo para desmarcar">
            1. Qual atmosfera estética mais combina com seu gosto?
          </GroupLabel>
          <ChoiceGroup labelledBy={styleLabelId} className="grid gap-4 sm:grid-cols-2">
            {STYLE_PRESETS.map((preset) => (
              <StyleCard
                key={preset.id}
                preset={preset}
                selected={values.estiloPrincipal === preset.id}
                onSelect={() => actions.set("estiloPrincipal", values.estiloPrincipal === preset.id ? "" : preset.id)}
              />
            ))}
          </ChoiceGroup>
          <GroupError id="estilo-error" message={errors.estiloPrincipal} />
        </section>

        <section data-field="materiaisGostados">
          <GroupLabel id="materiais-label">2. Materiais e detalhes de acabamento preferidos</GroupLabel>
          <ChoiceGroup type="checkbox" labelledBy="materiais-label" className="flex flex-wrap gap-2">
            {MATERIALS.map((material) => (
              <ChoiceChip
                key={material}
                selected={values.materiaisGostados.includes(material)}
                onToggle={() => actions.toggleMaterial(material)}
              >
                {material}
              </ChoiceChip>
            ))}
          </ChoiceGroup>
          <GroupError id="materiais-error" message={errors.materiaisGostados} />
        </section>

        <section data-field="referencias">
          <GroupLabel id="links-label" hint={`Até ${MAX_REFERENCE_LINKS} links`}>
            3. Links de referência (Pinterest, Instagram…)
          </GroupLabel>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="url"
              inputMode="url"
              aria-labelledby="links-label"
              aria-invalid={linkError ? true : undefined}
              placeholder="https://br.pinterest.com/pin/…"
              value={link}
              onChange={(event) => {
                setLink(event.target.value);
                setLinkError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addLink();
                }
              }}
              className={controlClasses}
            />
            <Button variant="secondary" onClick={addLink} disabled={values.referencias.length >= MAX_REFERENCE_LINKS}>
              <Link2 className="size-4" aria-hidden="true" /> Adicionar
            </Button>
          </div>
          <GroupError id="links-error" message={linkError ?? errors.referencias ?? errors["referencias.0"]} />
          {values.referencias.length > 0 && (
            <ul className="mt-3 space-y-2">
              {values.referencias.map((url, index) => (
                <li key={url} className="flex items-center gap-3 rounded-sm border border-line bg-ink px-3 py-2">
                  <Link2 className="size-4 shrink-0 text-caramel" aria-hidden="true" />
                  <a href={url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-[1rem] text-bone hover:text-caramel">
                    {url}
                  </a>
                  <button
                    type="button"
                    onClick={() => actions.removeReference(index)}
                    className="rounded-xs p-1 text-faint hover:text-clay"
                    aria-label={`Remover link ${index + 1}`}
                  >
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section data-field="anexos">
          <GroupLabel id="anexos-label" hint={`Até ${ATTACHMENT_RULES.maxFiles} arquivos · 25 MB cada`}>
            4. Planta, fotos do espaço ou imagens de inspiração
          </GroupLabel>
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
              onAddFiles(event.dataTransfer.files);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-sm border border-dashed px-6 py-10 text-center transition-colors",
              dragging ? "border-caramel bg-walnut/10" : "border-field bg-ink hover:border-caramel",
            )}
          >
            <UploadCloud className="size-9 text-caramel" strokeWidth={1.3} aria-hidden="true" />
            <span className="mt-3 text-[1.0625rem] text-bone">Arraste sua planta baixa, croqui ou fotos aqui</span>
            <span className="mt-1 text-[0.9375rem] text-faint">ou clique para escolher · PDF, JPG, PNG, WebP ou HEIC</span>
            <input
              id={inputId}
              type="file"
              multiple
              accept={[...ATTACHMENT_RULES.extensions, ...ATTACHMENT_RULES.mimeTypes].join(",")}
              aria-labelledby="anexos-label"
              className="sr-only"
              onChange={(event) => {
                onAddFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </label>

          {fileRejections.length > 0 && (
            <Alert tone="warning" className="mt-3" title="Alguns arquivos não foram adicionados">
              <ul className="list-disc pl-5">
                {fileRejections.map((item) => (
                  <li key={`${item.name}-${item.reason}`}>
                    {item.name}: {item.reason}
                  </li>
                ))}
              </ul>
            </Alert>
          )}
          <GroupError id="anexos-error" message={errors.anexos} />

          {files.length > 0 && (
            <ul className="mt-4 space-y-2">
              {files.map((item) => {
                const isPdf = item.file.type === "application/pdf" || /\.pdf$/i.test(item.file.name);
                const Icon = isPdf ? FileText : ImageIcon;
                return (
                  <li key={item.id} className="flex items-center gap-3 rounded-sm border border-line bg-ink px-3 py-2.5">
                    <Icon className="size-5 shrink-0 text-caramel" strokeWidth={1.5} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-bone">{item.file.name}</span>
                      <span className="text-[0.875rem] text-faint">
                        {formatBytes(item.file.size)}
                        {item.status === "done" && " · enviado"}
                        {item.status === "uploading" && " · enviando…"}
                        {item.status === "error" && <span className="text-clay"> · falhou</span>}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveFile(item.id)}
                      className="rounded-xs p-1 text-faint hover:text-clay"
                      aria-label={`Remover ${item.file.name}`}
                    >
                      <X className="size-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {demoMode && files.length > 0 && (
            <p className="mt-3 text-[0.9375rem] text-faint">
              Modo demonstração: os arquivos são listados no briefing, mas só são enviados de verdade com o Supabase configurado.
            </p>
          )}
        </section>
      </div>
    </StepShell>
  );
});
