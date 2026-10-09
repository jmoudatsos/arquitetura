/**
 * Utilitários HTTP comuns às Edge Functions.
 */

const ALLOWED_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-client-ip, x-client-user-agent, x-notify-secret";

/** CORS: ALLOWED_ORIGINS="https://seusite.com.br,https://www.seusite.com.br" (vazio = qualquer origem). */
export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowOrigin = allowed.length === 0 ? "*" : allowed.includes(origin) ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json; charset=utf-8" },
  });
}

export function preflight(req: Request): Response {
  return new Response("ok", { headers: corsHeaders(req) });
}

/**
 * IP do visitante. O servidor do site encaminha o IP real em `x-client-ip`
 * (sem isso todos os envios pareceriam vir do mesmo servidor).
 */
export function clientIp(req: Request): string {
  const candidates = [
    req.headers.get("x-client-ip"),
    req.headers.get("cf-connecting-ip"),
    req.headers.get("x-forwarded-for")?.split(",")[0],
    req.headers.get("x-real-ip"),
  ];
  return candidates.find((value) => value && value.trim())?.trim().slice(0, 64) ?? "";
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function envInt(name: string, fallback: number): number {
  const value = Number(Deno.env.get(name));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
