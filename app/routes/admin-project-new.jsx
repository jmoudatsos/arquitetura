import { ArrowLeft } from "lucide-react";
import { data, Link, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import { AdminPageHeader, adminMeta } from "../components/shared/AdminPage.jsx";
import { requireAdmin } from "../features/auth/auth.server.js";
import { issuesToFieldErrors } from "../features/leads/lead.schema.js";
import { listMedia } from "../features/media/media.service.js";
import { ProjectForm } from "../features/projects/project.components.jsx";
import { projectSchema } from "../features/projects/project.schema.js";
import { createProject, projectDbErrorToFieldErrors } from "../features/projects/project.service.js";
import { formToObject } from "../utils/form-data.js";

export const meta = () => adminMeta("Novo projeto");

export async function loader({ request }) {
  const { db, headers } = await requireAdmin(request);
  return data({ media: await listMedia(db) }, { headers });
}

export async function action({ request }) {
  const { db, headers } = await requireAdmin(request);
  const parsed = projectSchema.safeParse(formToObject(await request.formData()));
  if (!parsed.success) {
    return data({ errors: issuesToFieldErrors(parsed.error) }, { status: 400, headers });
  }
  const { data: project, error } = await createProject(db, parsed.data);
  if (error) return data({ errors: projectDbErrorToFieldErrors(error) }, { status: 400, headers });
  return redirect(`/admin/projetos/${project.id}?ok=criado`, { headers });
}

export default function AdminProjectNew() {
  const { media } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();

  return (
    <>
      <Link to="/admin/projetos" className="mb-4 inline-flex items-center gap-2 text-mute hover:text-caramel">
        <ArrowLeft className="size-4" aria-hidden="true" /> Projetos
      </Link>
      <AdminPageHeader title="Novo projeto" description="Preencha as informações e publique quando estiver pronto." />
      <ProjectForm
        media={media}
        errors={actionData?.errors}
        submitting={navigation.state === "submitting"}
        submitLabel="Criar projeto"
      />
    </>
  );
}
