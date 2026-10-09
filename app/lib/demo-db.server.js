/**
 * Banco de demonstração em memória com a MESMA interface (subconjunto) do
 * supabase-js: `db.from("tabela").select().eq().order()…`.
 *
 * Assim os services têm uma única implementação e o site roda sem nenhuma
 * infraestrutura (útil sem Docker, em testes e para apresentar o layout).
 * Os dados vivem no processo do servidor: reiniciou, voltou ao conteúdo inicial.
 */
import {
  DEMO_MEDIA,
  DEMO_NOTIFICATION_SETTINGS,
  DEMO_PROJECTS,
  DEMO_SERVICES,
  DEMO_SITE_SETTINGS,
} from "./demo-data.js";

const TABLE_DEFAULTS = {
  projects: () => ({
    subtitle: null,
    summary: null,
    description: null,
    style: null,
    location: null,
    year: null,
    area_m2: null,
    materials: [],
    cover_image: null,
    cover_alt: null,
    gallery: [],
    status: "draft",
    featured: false,
    sort_order: 0,
    published_at: null,
    seo_title: null,
    seo_description: null,
    is_sample: false,
  }),
  services: () => ({
    summary: null,
    description: null,
    icon: "hammer",
    features: [],
    sort_order: 0,
    is_active: true,
  }),
  media: () => ({
    bucket: "site-media",
    path: null,
    url: null,
    alt: "",
    mime_type: null,
    size_bytes: null,
    width: null,
    height: null,
    created_by: null,
  }),
  leads: () => ({
    status: "novo",
    source: "briefing",
    email: null,
    city: null,
    property_type: null,
    property_status: null,
    start_forecast: null,
    budget_range: null,
    rooms: [],
    room_details: {},
    style: null,
    materials: [],
    reference_links: [],
    attachments: [],
    notes: null,
    consent: false,
    consent_at: null,
    utm: {},
    user_agent: null,
    ip_hash: null,
    notification: {},
    notified_at: null,
    internal_notes: null,
  }),
  site_settings: () => ({}),
  notification_settings: () => ({}),
  admin_users: () => ({ role: "editor" }),
};

const PRIMARY_KEYS = { site_settings: "id", notification_settings: "id", admin_users: "user_id" };
const UNIQUE_COLUMNS = { projects: ["slug"], services: ["slug"] };
const TABLES_WITH_UPDATED_AT = new Set(["projects", "services", "leads", "site_settings", "notification_settings"]);

const clone = (value) => (value === undefined ? undefined : structuredClone(value));
const nowIso = () => new Date().toISOString();

function createInitialStore() {
  const createdAt = "2026-01-01T12:00:00.000Z";
  return {
    projects: DEMO_PROJECTS.map((p) => ({ ...clone(p), created_at: createdAt, updated_at: p.published_at ?? createdAt })),
    services: DEMO_SERVICES.map((s) => ({ ...clone(s), created_at: createdAt, updated_at: createdAt })),
    media: DEMO_MEDIA.map((m) => clone(m)),
    leads: [],
    site_settings: [{ ...clone(DEMO_SITE_SETTINGS), updated_at: createdAt }],
    notification_settings: [{ ...clone(DEMO_NOTIFICATION_SETTINGS), updated_at: createdAt }],
    admin_users: [],
    __storage: {},
  };
}

function pgError(message, code, details = null) {
  return { message, code, details, hint: null };
}

/** Padrão LIKE do Postgres/PostgREST → RegExp. `%` e `*` = qualquer sequência; `_` = um caractere. */
function likeToRegExp(pattern) {
  let source = "";
  for (const char of String(pattern)) {
    if (char === "%" || char === "*") source += ".*";
    else if (char === "_") source += ".";
    else source += char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${source}$`, "is");
}

function compare(a, b) {
  if (a === b) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "pt-BR");
}

function applyTableTriggers(table, row, previous) {
  if (table === "projects") {
    const becamePublished = row.status === "published" && previous?.status !== "published";
    if (becamePublished && !row.published_at) row.published_at = nowIso();
  }
  return row;
}

class DemoQuery {
  constructor(store, table) {
    if (!(table in store)) throw new Error(`[demo-db] tabela desconhecida: ${table}`);
    this.store = store;
    this.table = table;
    this.op = "select";
    this.columns = "*";
    this.filters = [];
    this.orders = [];
    this.limitCount = null;
    this.rangeBounds = null;
    this.singleMode = null; // "single" | "maybe"
    this.countMode = null;
    this.head = false;
    this.payload = null;
    this.returning = false;
    this.onConflict = null;
  }

  /* ── operações ── */
  select(columns = "*", options = {}) {
    if (this.op === "select") {
      this.columns = columns;
      this.countMode = options.count ?? null;
      this.head = Boolean(options.head);
    } else {
      this.returning = true;
      this.columns = columns;
    }
    return this;
  }

  insert(rows) {
    this.op = "insert";
    this.payload = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  upsert(rows, { onConflict } = {}) {
    this.op = "upsert";
    this.payload = Array.isArray(rows) ? rows : [rows];
    this.onConflict = onConflict ?? PRIMARY_KEYS[this.table] ?? "id";
    return this;
  }

  update(patch) {
    this.op = "update";
    this.payload = patch;
    return this;
  }

  delete() {
    this.op = "delete";
    return this;
  }

  /* ── filtros ── */
  eq(column, value) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  neq(column, value) {
    this.filters.push((row) => row[column] !== value);
    return this;
  }

  gt(column, value) {
    this.filters.push((row) => row[column] != null && compare(row[column], value) > 0);
    return this;
  }

  gte(column, value) {
    this.filters.push((row) => row[column] != null && compare(row[column], value) >= 0);
    return this;
  }

  lt(column, value) {
    this.filters.push((row) => row[column] != null && compare(row[column], value) < 0);
    return this;
  }

  lte(column, value) {
    this.filters.push((row) => row[column] != null && compare(row[column], value) <= 0);
    return this;
  }

  in(column, values) {
    const set = new Set(values);
    this.filters.push((row) => set.has(row[column]));
    return this;
  }

  is(column, value) {
    this.filters.push((row) => (value === null ? row[column] == null : row[column] === value));
    return this;
  }

  ilike(column, pattern) {
    const regex = likeToRegExp(pattern);
    this.filters.push((row) => regex.test(String(row[column] ?? "")));
    return this;
  }

  contains(column, values) {
    this.filters.push((row) => Array.isArray(row[column]) && values.every((v) => row[column].includes(v)));
    return this;
  }

  /** Suporta o formato do PostgREST: "col.op.valor,col.op.valor" (ops: eq, neq, ilike). */
  or(expression) {
    const clauses = String(expression)
      .split(",")
      .map((part) => {
        const [column, op, ...rest] = part.split(".");
        const value = rest.join(".");
        if (op === "eq") return (row) => String(row[column]) === value;
        if (op === "neq") return (row) => String(row[column]) !== value;
        if (op === "ilike") {
          const regex = likeToRegExp(value);
          return (row) => regex.test(String(row[column] ?? ""));
        }
        throw new Error(`[demo-db] operador não suportado em or(): ${op}`);
      });
    this.filters.push((row) => clauses.some((clause) => clause(row)));
    return this;
  }

  /* ── modificadores ── */
  order(column, { ascending = true } = {}) {
    this.orders.push({ column, ascending });
    return this;
  }

  limit(count) {
    this.limitCount = count;
    return this;
  }

  range(from, to) {
    this.rangeBounds = [from, to];
    return this;
  }

  single() {
    this.singleMode = "single";
    return this;
  }

  maybeSingle() {
    this.singleMode = "maybe";
    return this;
  }

  then(onFulfilled, onRejected) {
    return Promise.resolve()
      .then(() => this.execute())
      .then(onFulfilled, onRejected);
  }

  /* ── execução ── */
  matches(row) {
    return this.filters.every((filter) => filter(row));
  }

  project(rows) {
    if (!this.columns || this.columns.trim() === "*") return rows.map(clone);
    if (/[()]/.test(this.columns)) {
      throw new Error("[demo-db] seleção com recursos embutidos não é suportada; faça consultas separadas");
    }
    const cols = this.columns.split(",").map((c) => c.trim()).filter(Boolean);
    return rows.map((row) => Object.fromEntries(cols.map((c) => [c, clone(row[c])])));
  }

  finalize(rows, { status = 200 } = {}) {
    let out = rows;
    for (const { column, ascending } of [...this.orders].reverse()) {
      out = [...out].sort((a, b) => (ascending ? 1 : -1) * compare(a[column], b[column]));
    }
    const count = out.length;
    if (this.rangeBounds) out = out.slice(this.rangeBounds[0], this.rangeBounds[1] + 1);
    if (this.limitCount != null) out = out.slice(0, this.limitCount);
    const data = this.project(out);

    if (this.singleMode) {
      if (data.length === 1) return { data: data[0], error: null, count: this.countMode ? count : null, status };
      if (data.length === 0 && this.singleMode === "maybe") return { data: null, error: null, count: 0, status };
      return {
        data: null,
        error: pgError(
          "JSON object requested, multiple (or no) rows returned",
          "PGRST116",
          `The result contains ${data.length} rows`,
        ),
        count: null,
        status: 406,
      };
    }
    if (this.head) return { data: null, error: null, count, status };
    return { data, error: null, count: this.countMode ? count : null, status };
  }

  checkUnique(row, ignoreRow = null, pending = []) {
    for (const column of UNIQUE_COLUMNS[this.table] ?? []) {
      const clash = [...this.store[this.table], ...pending].find(
        (other) => other !== ignoreRow && other[column] != null && other[column] === row[column],
      );
      if (clash) {
        return pgError(
          `duplicate key value violates unique constraint "${this.table}_${column}_key"`,
          "23505",
          `Key (${column})=(${row[column]}) already exists.`,
        );
      }
    }
    return null;
  }

  buildRow(input) {
    const pk = PRIMARY_KEYS[this.table] ?? "id";
    const row = { ...TABLE_DEFAULTS[this.table](), ...clone(input) };
    if (pk === "id" && !row.id) row.id = crypto.randomUUID();
    const now = nowIso();
    row.created_at ??= now;
    if (TABLES_WITH_UPDATED_AT.has(this.table)) row.updated_at ??= now;
    return applyTableTriggers(this.table, row, null);
  }

  execute() {
    const rows = this.store[this.table];

    if (this.op === "select") {
      return this.finalize(rows.filter((row) => this.matches(row)));
    }

    if (this.op === "insert") {
      const created = [];
      for (const input of this.payload) {
        const row = this.buildRow(input);
        const error = this.checkUnique(row, null, created);
        if (error) return { data: null, error, count: null, status: 409 };
        created.push(row);
      }
      rows.push(...created);
      return this.returning ? this.finalize(created, { status: 201 }) : { data: null, error: null, count: null, status: 201 };
    }

    if (this.op === "upsert") {
      const touched = [];
      for (const input of this.payload) {
        const existing = rows.find((row) => row[this.onConflict] === input[this.onConflict]);
        if (existing) {
          const previous = clone(existing);
          Object.assign(existing, clone(input));
          if (TABLES_WITH_UPDATED_AT.has(this.table)) existing.updated_at = nowIso();
          applyTableTriggers(this.table, existing, previous);
          touched.push(existing);
        } else {
          const row = this.buildRow(input);
          const error = this.checkUnique(row);
          if (error) return { data: null, error, count: null, status: 409 };
          rows.push(row);
          touched.push(row);
        }
      }
      return this.returning ? this.finalize(touched, { status: 201 }) : { data: null, error: null, count: null, status: 201 };
    }

    if (this.op === "update") {
      const targets = rows.filter((row) => this.matches(row));
      for (const row of targets) {
        const candidate = { ...row, ...clone(this.payload) };
        const error = this.checkUnique(candidate, row);
        if (error) return { data: null, error, count: null, status: 409 };
      }
      for (const row of targets) {
        const previous = clone(row);
        Object.assign(row, clone(this.payload));
        if (TABLES_WITH_UPDATED_AT.has(this.table)) row.updated_at = nowIso();
        applyTableTriggers(this.table, row, previous);
      }
      return this.returning ? this.finalize(targets) : { data: null, error: null, count: null, status: 204 };
    }

    if (this.op === "delete") {
      const removed = rows.filter((row) => this.matches(row));
      this.store[this.table] = rows.filter((row) => !this.matches(row));
      return this.returning ? this.finalize(removed) : { data: null, error: null, count: null, status: 204 };
    }

    throw new Error(`[demo-db] operação desconhecida: ${this.op}`);
  }
}

function createStorage(store) {
  return {
    from(bucket) {
      store.__storage[bucket] ??= {};
      const objects = store.__storage[bucket];
      return {
        async upload(path, body, options = {}) {
          if (objects[path] && !options.upsert) {
            return { data: null, error: { message: "The resource already exists", statusCode: "409" } };
          }
          objects[path] = { body, contentType: options.contentType ?? null };
          return { data: { path, fullPath: `${bucket}/${path}` }, error: null };
        },
        async remove(paths) {
          for (const path of paths) delete objects[path];
          return { data: paths.map((name) => ({ name })), error: null };
        },
        async list(prefix = "") {
          const names = Object.keys(objects)
            .filter((key) => key.startsWith(prefix ? `${prefix}/` : ""))
            .map((key) => ({ name: key.slice(prefix ? prefix.length + 1 : 0) }));
          return { data: names, error: null };
        },
        async createSignedUrls(paths) {
          // Sem storage real não há URL assinada; o painel mostra só o nome do arquivo.
          return { data: paths.map((path) => ({ path, signedUrl: null, error: "demo" })), error: null };
        },
        getPublicUrl(path) {
          return { data: { publicUrl: `/${bucket}/${path}` } };
        },
      };
    },
  };
}

function getStore() {
  // Sobrevive ao HMR do Vite em desenvolvimento.
  globalThis.__STUDIO_DEMO_STORE__ ??= createInitialStore();
  return globalThis.__STUDIO_DEMO_STORE__;
}

/** Cliente com a interface do supabase-js sobre o store em memória. */
export function getDemoDb() {
  const store = getStore();
  return {
    isDemo: true,
    from: (table) => new DemoQuery(getStore(), table),
    storage: createStorage(store),
  };
}

/** Restaura o conteúdo inicial (usado pelos testes). */
export function resetDemoDb() {
  globalThis.__STUDIO_DEMO_STORE__ = createInitialStore();
}
