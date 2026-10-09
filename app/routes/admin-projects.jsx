import { Eye, EyeOff, PanelsTopLeft, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { data, Link, useFetcher, useLoaderData, useSearchParams } from "react-router";
import { AdminPageHeader, adminMeta } from "../components/shared/AdminPage.jsx";
import { ButtonLink } from "../components/ui/Button.jsx";
import { Alert, EmptyState } from "../components/ui/Feedback.jsx";
import { Badge } from "../components/ui/Layout.jsx";
import { requireAdmin } from "../features/auth/auth.server.js";
import { MediaThumb } from "../features/media/media.components.jsx";
import { getCategory } from "../features/projects/project.schema.js";
import {
  deleteProject,
  listAllProjects,
  setProjectFeatured,
  setProjectStatus,
} from "../features/projects/project.service.js";
import { cn } from "../utils/cn.js";
import { isUuid } from "../utils/uuid.js";

export const meta = () => adminMeta("Projetos");

export async function loader({ request }) {
  const { db, headers } = await requireAdmin(request);
  return data({ projects: await listAllProjects(db) }, { headers });
}

export async function action({ request }) {
  const { db, headers } = await requireAdmin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return data({ ok: false, message: "Projeto inválido." }, { status: 400, headers });

  let error = null;
  if (intent === "publish") ({ error } = await setProjectStatus(db, id, "published"));
  else if (intent === "unpublish") ({ error } = await setProjectStatus(db, id, "draft"));
  else if (intent === "feature") ({ error } = await setProjectFeatured(db, id, formData.get("featured") === "true"));
  else if (intent === "delete") ({ error } = await deleteProject(db, id));
  else return data({ ok: false, message: "Ação desconhecida." }, { status: 400, headers });

  return data({ ok: !error, message: error?.message ?? null }, { status: error ? 400 : 200, headers });
}

function RowActions({ project }) {
  const fetcher = useFetcher();
  const busy = fetcher.state !== "idle";
  const published = project.status === "published";
  const iconButton = "inline-flex size-9 items-center justify-center rounded-sm text-mute transition-colors hover:bg-panel-raised hover:text-bone disabled:opacity-40";

  return (
    <div className="flex items-center justify-end gap-1">
      <fetcher.Form method="post">
        <input type="hidden" name="id" value={project.id} />
        <input type="hidden" name="intent" value="feature" />
        <input type="hidden" name="featured" value={String(!project.featured)} />
        <button
          type="submit"
          className={cn(iconButton, project.featured && "text-caramel")}
          disabled={busy}
          aria-label={project.featured ? "Remover dos destaques" : "Destacar na home"}
          title={project.featured ? "Remover dos destaques" : "Destacar na home"}
        >
          <Star className="size-4" fill={project.featured ? "currentColor" : "none"} />
        </button>
      </fetcher.Form>
      <fetcher.Form method="post">
        <input type="hidden" name="id" value={project.id} />
        <input type="hidden" name="intent" value={published ? "unpublish" : "publish"} />
        <button
          type="submit"
          className={iconButton}
          disabled={busy}
          aria-label={published ? "Despublicar" : "Publicar"}
          title={published ? "Despublicar" : "Publicar"}
        >
          {published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </fetcher.Form>
      <Link to={`/admin/projetos/${project.id}`} className={iconButton} aria-label={`Editar ${project.title}`} title="Editar">
        <Pencil className="size-4" />
      </Link>
      <fetcher.Form
        method="post"
        onSubmit={(event) => {
          if (!window.confirm(`Excluir o projeto “${project.title}”? Esta ação não pode ser desfeita.`)) event.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={project.id} />
        <input type="hidden" name="intent" value="delete" />
        <button type="submit" className={cn(iconButton, "hover:text-clay")} disabled={busy} aria-label={`Excluir ${project.title}`} title="Excluir">
          <Trash2 className="size-4" />
        </button>
      </fetcher.Form>
      {fetcher.data?.ok === false && <span className="ml-2 text-[0.875rem] text-clay">{fetcher.data.message}</span>}
    </div>
  );
}

export default function AdminProjects() {
  const { projects } = useLoaderData();
  const [searchParams] = useSearchParams();
  const removed = searchParams.get("ok") === "excluido";
  const samples = projects.filter((p) => p.is_sample);

  return (
    <>
      <AdminPageHeader
        title="Projetos"
        description="Portfólio exibido em /projetos. A estrela define os destaques da página inicial."
        actions={
          <ButtonLink to="/admin/projetos/novo" size="sm">
            <Plus className="size-4" aria-hidden="true" /> Novo projeto
          </ButtonLink>
        }
      />

      {removed && (
        <Alert tone="success" className="mb-6">
          Projeto excluído.
        </Alert>
      )}
      {samples.length > 0 && (
        <Alert tone="warning" className="mb-6" title={`${samples.length} projeto(s) de exemplo`}>
          Eles vieram com o modelo do site, com fotos ilustrativas. Edite com os projetos reais (ao salvar, o selo “exemplo” some)
          ou exclua.
        </Alert>
      )}

      {projects.length === 0 ? (
        <EmptyState icon={PanelsTopLeft} title="Nenhum projeto cadastrado" action={<ButtonLink to="/admin/projetos/novo">Cadastrar o primeiro</ButtonLink>} />
      ) : (
        <ul className="divide-y divide-line rounded-sm border border-line">
          {projects.map((project) => (
            <li key={project.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <MediaThumb src={project.cover_url} className="aspect-[4/3] w-full shrink-0 sm:w-32" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/admin/projetos/${project.id}`} className="text-[1.25rem] text-bone hover:text-caramel">
                    {project.title}
                  </Link>
                  <Badge tone={project.status === "published" ? "sage" : "neutral"}>
                    {project.status === "published" ? "Publicado" : "Rascunho"}
                  </Badge>
                  {project.is_sample && <Badge tone="walnut">Exemplo</Badge>}
                </div>
                <p className="mt-1 text-[0.9375rem] text-faint">
                  {[getCategory(project.category)?.label, project.location, project.year].filter(Boolean).join(" · ")} · ordem{" "}
                  {project.sort_order}
                  {project.status === "published" && (
                    <>
                      {" · "}
                      <a href={`/projetos/${project.slug}`} target="_blank" rel="noreferrer" className="text-mute hover:text-caramel">
                        /projetos/{project.slug} ↗
                      </a>
                    </>
                  )}
                </p>
              </div>
              <RowActions project={project} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
