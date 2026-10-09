import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido").max(160),
  password: z.string().min(6, "Senha muito curta").max(200),
  next: z.string().default("/admin"),
});

/** Só aceita destinos internos do painel (evita open redirect: "//site.com", "https://…"). */
export function safeAdminRedirect(value) {
  const target = String(value ?? "");
  if (!target.startsWith("/admin") || target.startsWith("//") || target.includes("\\")) return "/admin";
  if (target.startsWith("/admin/login")) return "/admin";
  return target;
}
