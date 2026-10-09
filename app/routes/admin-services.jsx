import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { data, useFetcher, useLoaderData } from "react-router";
import { AdminPageHeader, adminMeta } from "../components/shared/AdminPage.jsx";
import { Button } from "../components/ui/Button.jsx";
import { CheckboxField, SelectField, TextAreaField, TextField } from "../components/ui/Field.jsx";
import { Alert } from "../components/ui/Feedback.jsx";
import { Badge, Card } from "../components/ui/Layout.jsx";
import { requireAdmin } from "../features/auth/auth.server.js";
import { issuesToFieldErrors } from "../features/leads/lead.schema.js";
import { ServiceIcon } from "../features/services/service.components.jsx";
import { SERVICE_ICONS, serviceSchema } from "../features/services/service.schema.js";
import {
  createService,
  deleteService,
  listAllServices,
  serviceDbErrorToFieldErrors,
  updateService,
} from "../features/services/service.service.js";
import { formToObject } from "../utils/form-data.js";
import { slugify } from "../utils/slugify.js";
import { isUuid } from "../utils/uuid.js";

export const meta = () => adminMeta("Serviços");

export async function loader({ request }) {
  const { db, headers } = await requireAdmin(request);
  return data({ services: await listAllServices(db) }, { headers });
}

export async function action({ request }) {
  const { db, headers } = await requireAdmin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const id = String(formData.get("id") ?? "");

  if (intent === "delete") {
    if (!isUuid(id)) return data({ ok: false, intent, errors: { _form: "Serviço inválido." } }, { status: 400, headers });
    const { error } = await deleteService(db, id);
    return data({ ok: !error, intent, errors: error ? { _form: error.message } : null }, { status: error ? 400 : 200, headers });
  }

  const parsed = serviceSchema.safeParse(formToObject(formData));
  if (!parsed.success) return data({ ok: false, intent, errors: issuesToFieldErrors(parsed.error) }, { status: 400, headers });

  if (intent === "create") {
    const { error } = await createService(db, parsed.data);
    if (error) return data({ ok: false, intent, errors: serviceDbErrorToFieldErrors(error) }, { status: 400, headers });
    return data({ ok: true, intent, message: "Serviço criado." }, { headers });
  }
  if (intent === "update") {
    if (!isUuid(id)) return data({ ok: false, intent, errors: { _form: "Serviço inválido." } }, { status: 400, headers });
    const { error } = await updateService(db, id, parsed.data);
    if (error) return data({ ok: false, intent, errors: serviceDbErrorToFieldErrors(error) }, { status: 400, headers });
    return data({ ok: true, intent, message: "Alterações salvas." }, { headers });
  }
  return data({ ok: false, intent, errors: { _form: "Ação desconhecida." } }, { status: 400, headers });
}

function ServiceForm({ service, onDone }) {
  const fetcher = useFetcher();
  const isNew = !service;
  const errors = fetcher.data?.ok === false ? (fetcher.data.errors ?? {}) : {};
  const [title, setTitle] = useState(service?.title ?? "");
  const [slug, setSlug] = useState(service?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const saved = fetcher.state === "idle" && fetcher.data?.ok;

  useEffect(() => {
    if (isNew && saved) onDone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, saved]);

  return (
    <fetcher.Form method="post" className="space-y-5" noValidate>
      <input type="hidden" name="intent" value={isNew ? "create" : "update"} />
      {service && <input type="hidden" name="id" value={service.id} />}
      {errors._form && <Alert tone="error">{errors._form}</Alert>}
      <div className="grid gap-5 md:grid-cols-2">
        <TextField
          label="Título"
          name="title"
          required
          value={title}
          maxLength={100}
          error={errors.title}
          onChange={(event) => {
            setTitle(event.target.value);
            if (!slugTouched) setSlug(slugify(event.target.value));
          }}
        />
        <TextField
          label="Slug (âncora em /servicos#…)"
          name="slug"
          required
          value={slug}
          maxLength={80}
          error={errors.slug}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(slugify(event.target.value));
          }}
        />
      </div>
      <TextAreaField label="Resumo" name="summary" rows={2} maxLength={300} defaultValue={service?.summary ?? ""} error={errors.summary} />
      <TextAreaField
        label="Descrição"
        name="description"
        rows={3}
        maxLength={2000}
        defaultValue={service?.description ?? ""}
        error={errors.description}
      />
      <TextAreaField
        label="Itens incluídos"
        name="features"
        rows={4}
        defaultValue={(service?.features ?? []).join("\n")}
        error={errors.features}
        hint="Um por linha."
      />
      <div className="grid gap-5 md:grid-cols-3">
        <SelectField
          label="Ícone"
          name="icon"
          defaultValue={service?.icon ?? "hammer"}
          options={SERVICE_ICONS.map((icon) => ({ value: icon.id, label: icon.label }))}
          error={errors.icon}
        />
        <TextField label="Ordem" name="sort_order" type="number" defaultValue={service?.sort_order ?? 0} error={errors.sort_order} />
        <CheckboxField name="is_active" label="Visível no site" defaultChecked={service ? service.is_active : true} className="self-end pb-3" />
      </div>
      <div className="flex items-center gap-4">
        <Button type="submit" loading={fetcher.state !== "idle"}>
          {isNew ? "Criar serviço" : "Salvar"}
        </Button>
        {saved && <span className="text-sage">{fetcher.data.message}</span>}
      </div>
    </fetcher.Form>
  );
}

function DeleteService({ service }) {
  const fetcher = useFetcher();
  return (
    <fetcher.Form
      method="post"
      onSubmit={(event) => {
        if (!window.confirm(`Excluir o serviço “${service.title}”?`)) event.preventDefault();
      }}
    >
      <input type="hidden" name="intent" value="delete" />
      <input type="hidden" name="id" value={service.id} />
      <Button type="submit" variant="ghost" size="sm" className="hover:text-clay" loading={fetcher.state !== "idle"}>
        <Trash2 className="size-4" aria-hidden="true" /> Excluir
      </Button>
    </fetcher.Form>
  );
}

export default function AdminServices() {
  const { services } = useLoaderData();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <AdminPageHeader
        title="Serviços"
        description="Lista exibida na página inicial e em /servicos."
        actions={
          !creating && (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="size-4" aria-hidden="true" /> Novo serviço
            </Button>
          )
        }
      />

      {creating && (
        <Card className="mb-8 p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[1.5rem] text-bone">Novo serviço</h2>
            <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
          </div>
          <ServiceForm onDone={() => setCreating(false)} />
        </Card>
      )}

      <ul className="space-y-3">
        {services.map((service) => (
          <li key={service.id}>
            <details className="group rounded-sm border border-line bg-panel open:border-field">
              <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4">
                <ServiceIcon name={service.icon} />
                <span className="flex-1 text-[1.25rem] text-bone">{service.title}</span>
                {!service.is_active && <Badge>Oculto</Badge>}
                <span className="tabular text-[0.9375rem] text-faint">ordem {service.sort_order}</span>
              </summary>
              <div className="border-t border-line px-5 py-6">
                <ServiceForm key={service.updated_at} service={service} />
                <div className="mt-6 flex justify-end border-t border-line pt-4">
                  <DeleteService service={service} />
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </>
  );
}
