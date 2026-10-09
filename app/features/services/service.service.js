function unwrap({ data, error }, context) {
  if (error) throw new Error(`${context}: ${error.message}`);
  return data;
}

export async function listActiveServices(db) {
  return unwrap(
    await db
      .from("services")
      .select("id, slug, title, summary, description, icon, features, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    "Erro ao listar serviços",
  );
}

export async function listAllServices(db) {
  return unwrap(
    await db.from("services").select("*").order("sort_order", { ascending: true }).order("title"),
    "Erro ao listar serviços",
  );
}

function toServiceRow(values) {
  return {
    title: values.title,
    slug: values.slug,
    summary: values.summary || null,
    description: values.description || null,
    icon: values.icon,
    features: values.features ?? [],
    sort_order: values.sort_order ?? 0,
    is_active: Boolean(values.is_active),
  };
}

export function serviceDbErrorToFieldErrors(error) {
  if (!error) return {};
  if (error.code === "23505") return { slug: "Já existe um serviço com este slug." };
  if (error.code === "42501") return { _form: "Sem permissão. Entre novamente como administrador." };
  return { _form: `Não foi possível salvar: ${error.message}` };
}

export async function createService(db, values) {
  return db.from("services").insert(toServiceRow(values)).select("*").single();
}

export async function updateService(db, id, values) {
  return db.from("services").update(toServiceRow(values)).eq("id", id).select("*").single();
}

export async function deleteService(db, id) {
  return db.from("services").delete().eq("id", id);
}
