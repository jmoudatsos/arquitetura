import { Copy, ImagePlus, Trash2 } from "lucide-react";
import { useState } from "react";
import { data, useFetcher, useLoaderData } from "react-router";
import { AdminPageHeader, adminMeta } from "../components/shared/AdminPage.jsx";
import { Button } from "../components/ui/Button.jsx";
import { controlClasses } from "../components/ui/Field.jsx";
import { EmptyState } from "../components/ui/Feedback.jsx";
import { requireAdmin } from "../features/auth/auth.server.js";
import { MediaThumb, MediaUploadForm } from "../features/media/media.components.jsx";
import { MEDIA_RULES, mediaAltSchema } from "../features/media/media.schema.js";
import { deleteMedia, listMedia, updateMediaAlt, uploadMedia } from "../features/media/media.service.js";
import { cn } from "../utils/cn.js";
import { isUuid } from "../utils/uuid.js";

export const meta = () => adminMeta("Mídia");

export async function loader({ request }) {
  const { db, headers } = await requireAdmin(request);
  return data({ media: await listMedia(db) }, { headers });
}

export async function action({ request }) {
  const { db, headers } = await requireAdmin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "upload") {
    const files = formData.getAll("files").filter((file) => typeof file !== "string" && file.size > 0);
    if (!files.length) return data({ ok: false, intent, message: "Nenhuma imagem recebida." }, { status: 400, headers });
    if (files.length > MEDIA_RULES.maxFilesPerUpload) {
      return data({ ok: false, intent, message: `Envie no máximo ${MEDIA_RULES.maxFilesPerUpload} imagens por vez.` }, { status: 400, headers });
    }
    const uploaded = [];
    const errors = [];
    for (const file of files) {
      const alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, 200);
      const result = await uploadMedia(db, file, { alt });
      if (result.error) errors.push(result.error.message);
      else uploaded.push(result.data);
    }
    const ok = uploaded.length > 0;
    return data(
      { ok, intent, uploaded, errors, message: ok ? `${uploaded.length} imagem(ns) enviada(s).` : errors.join(" ") },
      { status: ok ? 200 : 400, headers },
    );
  }

  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return data({ ok: false, intent, message: "Mídia inválida." }, { status: 400, headers });

  if (intent === "alt") {
    const parsed = mediaAltSchema.safeParse({ alt: formData.get("alt") ?? "" });
    if (!parsed.success) return data({ ok: false, intent, message: parsed.error.issues[0].message }, { status: 400, headers });
    const { error } = await updateMediaAlt(db, id, parsed.data.alt);
    return data({ ok: !error, intent, message: error?.message ?? "Descrição salva." }, { status: error ? 400 : 200, headers });
  }

  if (intent === "delete") {
    const { error } = await deleteMedia(db, id);
    return data({ ok: !error, intent, message: error?.message ?? "Imagem excluída." }, { status: error ? 400 : 200, headers });
  }

  return data({ ok: false, intent, message: "Ação desconhecida." }, { status: 400, headers });
}

function MediaCard({ item }) {
  const altFetcher = useFetcher();
  const deleteFetcher = useFetcher();
  const [alt, setAlt] = useState(item.alt ?? "");
  const [copied, setCopied] = useState(false);
  const dirty = alt !== (item.alt ?? "");
  const source = item.path || item.url;
  const isDataUrl = String(item.public_url).startsWith("data:");

  async function copy() {
    try {
      await navigator.clipboard.writeText(isDataUrl ? source.slice(0, 64) : new URL(item.public_url, window.location.origin).href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* navegador sem permissão de área de transferência */
    }
  }

  return (
    <li className={cn("rounded-sm border border-line bg-panel p-3", deleteFetcher.state !== "idle" && "opacity-50")}>
      <MediaThumb src={item.public_url} alt={item.alt} className="aspect-[4/3]" />
      <altFetcher.Form method="post" className="mt-3 flex gap-2">
        <input type="hidden" name="intent" value="alt" />
        <input type="hidden" name="id" value={item.id} />
        <label htmlFor={`alt-${item.id}`} className="sr-only">
          Descrição da imagem
        </label>
        <input
          id={`alt-${item.id}`}
          name="alt"
          value={alt}
          maxLength={200}
          onChange={(event) => setAlt(event.target.value)}
          placeholder="Descreva a imagem (acessibilidade)"
          className={cn(controlClasses, "h-9 px-3 py-0 text-[0.9375rem]")}
        />
        {dirty && (
          <Button type="submit" size="sm" loading={altFetcher.state !== "idle"}>
            Salvar
          </Button>
        )}
      </altFetcher.Form>
      <div className="mt-2 flex items-center justify-between">
        <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 text-[0.875rem] text-faint hover:text-bone">
          <Copy className="size-3.5" aria-hidden="true" /> {copied ? "Copiado!" : "Copiar endereço"}
        </button>
        <deleteFetcher.Form
          method="post"
          onSubmit={(event) => {
            if (!window.confirm("Excluir esta imagem da biblioteca?")) event.preventDefault();
          }}
        >
          <input type="hidden" name="intent" value="delete" />
          <input type="hidden" name="id" value={item.id} />
          <button type="submit" className="inline-flex items-center gap-1.5 text-[0.875rem] text-faint hover:text-clay" aria-label="Excluir imagem">
            <Trash2 className="size-3.5" aria-hidden="true" /> Excluir
          </button>
        </deleteFetcher.Form>
      </div>
      {deleteFetcher.data?.ok === false && <p className="mt-2 text-[0.875rem] text-clay">{deleteFetcher.data.message}</p>}
      {altFetcher.data?.ok === false && <p className="mt-2 text-[0.875rem] text-clay">{altFetcher.data.message}</p>}
    </li>
  );
}

export default function AdminMedia() {
  const { media } = useLoaderData();
  return (
    <>
      <AdminPageHeader
        title="Mídia"
        description="Biblioteca de imagens usada nos projetos e na página inicial. Imagens em uso não podem ser excluídas."
      />
      <MediaUploadForm />
      {media.length === 0 ? (
        <EmptyState icon={ImagePlus} title="Biblioteca vazia" className="mt-8">
          Envie as fotos dos projetos acima.
        </EmptyState>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {media.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </ul>
      )}
    </>
  );
}
