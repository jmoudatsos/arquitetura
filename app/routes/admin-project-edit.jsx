import { ArrowLeft } from "lucide-react";
import { data, Link, redirect, useActionData, useLoaderData, useNavigation, useSearchParams } from "react-router";
import { AdminPageHeader, adminMeta } from "../components/shared/AdminPage.jsx";
import { Alert } from "../components/ui/Feedback.jsx";
import { requireAdmin } from "../features/auth/auth.server.js";
import { issuesToFieldErrors } from "../features/leads/lead.schema.js";
import { listMedia } from "../features/media/media.service.js";
import { ProjectForm } from "../features/projects/project.components.jsx";
import { projectSchema } from "../features/projects/project.schema.js";
import { getProjectById, projectDbErrorToFieldErrors, updateProject } from "../features/projects/project.service.js";
import { formatDateTime } from "../utils/format-date.js";
import { formToObject } from "../utils/form-data.js";
import { isUuid } from "../utils/uuid.js";

export const meta = ({ data: loaderData }) => adminMeta(loaderData?.project?.title ?? "Projeto");

export async function loader({ request, params }) {
  const { db, headers } = await requireAdmin(request);
  if (!isUuid(params.id)) throw data(null, { status: 404 });
  const [project, media] = await Promise.all([getProjectById(db, params.id), listMedia(db)]);
  if (!project) throw data(null, { status: 404, statusText: "Projeto não encontrado" });
  return data({ project, media }, { headers });
}

export async function action({ request, params }) {
  const { db, headers } = await requireAdmin(request);
  if (!isUuid(params.id)) throw data(null, { status: 404 });
  const parsed = projectSchema.safeParse(formToObject(await request.formData()));
  if (!parsed.success) {
    return data({ errors: issuesToFieldErrors(parsed.error) }, { status: 400, headers });
  }
  const { error } = await updateProject(db, params.id, parsed.data);
  if (error) return data({ errors: projectDbErrorToFieldErrors(error) }, { status: 400, headers });
  return redirect(`/admin/projetos/${params.id}?ok=salvo`, { headers });
}

export default function AdminProjectEdit() {
  const { project, media } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const ok = searchParams.get("ok");

  return (
    <>
      <Link to="/admin/projetos" className="mb-4 inline-flex items-center gap-2 text-mute hover:text-caramel">
        <ArrowLeft className="size-4" aria-hidden="true" /> Projetos
      </Link>
      <AdminPageHeader
        title={project.title}
        description={`Atualizado em ${formatDateTime(project.updated_at)} · /projetos/${project.slug}`}
      />
      {ok && !actionData && (
        <Alert tone="success" className="mb-6">
          {ok === "criado" ? "Projeto criado." : "Alterações salvas."}
        </Alert>
      )}
      {project.is_sample && (
        <Alert tone="warning" className="mb-6">
          Este é um projeto de exemplo. Ao salvar com as informações reais, ele deixa de ser marcado como exemplo.
        </Alert>
      )}
      <ProjectForm
        key={project.updated_at}
        project={project}
        media={media}
        errors={actionData?.errors}
        submitting={navigation.state === "submitting"}
      />
    </>
  );
}
