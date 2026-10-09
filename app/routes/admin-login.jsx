import { Lock } from "lucide-react";
import { data, Form, Link, redirect, useActionData, useLoaderData, useNavigation, useRouteLoaderData } from "react-router";
import { Logo } from "../components/shared/Logo.jsx";
import { Button } from "../components/ui/Button.jsx";
import { TextField } from "../components/ui/Field.jsx";
import { Alert } from "../components/ui/Feedback.jsx";
import { safeAdminRedirect, loginSchema } from "../features/auth/auth.schema.js";
import { getAdminContext, signInAdmin, signOutAdmin } from "../features/auth/auth.server.js";
import { getServerEnv } from "../lib/env.server.js";
import { issuesToFieldErrors } from "../features/leads/lead.schema.js";

export const meta = () => [{ title: "Entrar · Painel" }, { name: "robots", content: "noindex, nofollow" }];

export async function loader({ request }) {
  const url = new URL(request.url);
  const next = safeAdminRedirect(url.searchParams.get("next"));
  const context = await getAdminContext(request);
  if (context?.user) throw redirect(next, { headers: context.headers });

  const env = getServerEnv();
  const demo = !env.isSupabaseConfigured;
  return data(
    {
      next,
      reason: url.searchParams.get("motivo"),
      demo,
      // Só mostramos as credenciais demo fora de produção.
      demoHint: demo && !env.isProduction ? { email: env.demoAdminEmail, password: env.demoAdminPassword } : null,
      demoDisabled: demo && !env.demoAdminPassword,
    },
    { headers: context?.headers },
  );
}

export async function action({ request }) {
  const formData = await request.formData();

  if (formData.get("intent") === "logout") {
    const headers = await signOutAdmin(request);
    return redirect("/admin/login", { headers });
  }

  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return data({ fieldErrors: issuesToFieldErrors(parsed.error), email: String(formData.get("email") ?? "") }, { status: 400 });
  }

  const result = await signInAdmin(request, parsed.data);
  if (!result.ok) {
    return data({ error: result.error, email: parsed.data.email }, { status: 401, headers: result.headers });
  }
  return redirect(safeAdminRedirect(parsed.data.next), { headers: result.headers });
}

export default function AdminLogin() {
  const { next, reason, demoHint, demoDisabled } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const root = useRouteLoaderData("root");
  const submitting = navigation.state === "submitting";

  return (
    <main id="conteudo" className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <Link to="/" className="mx-auto mb-10 flex justify-center" aria-label="Voltar ao site">
          <Logo name={root?.settings?.studio_name ?? "Studio"} />
        </Link>

        <div className="rounded-sm border border-line bg-panel p-8">
          <div className="mb-6 flex items-center gap-3">
            <Lock className="size-5 text-caramel" aria-hidden="true" />
            <h1 className="text-[1.75rem] text-bone">Entrar no painel</h1>
          </div>

          {reason === "sem-acesso" && (
            <Alert tone="warning" className="mb-5">
              Sua conta existe, mas ainda não tem permissão de administrador. Peça para incluí-la em <code>admin_users</code>.
            </Alert>
          )}
          {actionData?.error && (
            <Alert tone="error" className="mb-5">
              {actionData.error}
            </Alert>
          )}
          {demoDisabled && (
            <Alert tone="warning" className="mb-5">
              Modo demonstração em produção: defina <code>DEMO_ADMIN_PASSWORD</code> ou configure o Supabase.
            </Alert>
          )}

          <Form method="post" className="space-y-5" noValidate>
            <input type="hidden" name="next" value={next} />
            <TextField
              label="E-mail"
              name="email"
              type="email"
              autoComplete="username"
              required
              defaultValue={actionData?.email ?? ""}
              error={actionData?.fieldErrors?.email}
            />
            <TextField
              label="Senha"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              error={actionData?.fieldErrors?.password}
            />
            <Button type="submit" className="w-full" size="lg" loading={submitting}>
              Entrar
            </Button>
          </Form>

          {demoHint && (
            <p className="mt-6 rounded-sm border border-line bg-ink px-4 py-3 text-[0.9375rem] text-mute">
              <span className="font-semibold text-caramel">Modo demonstração</span> · use{" "}
              <code className="text-bone">{demoHint.email}</code> / <code className="text-bone">{demoHint.password}</code>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
