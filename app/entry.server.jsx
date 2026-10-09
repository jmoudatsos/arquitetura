import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable } from "@react-router/node";
import { isbot } from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import { ServerRouter } from "react-router";

export const streamTimeout = 5_000;

/** Cabeçalhos de segurança aplicados a todas as páginas HTML. */
function applySecurityHeaders(headers, url) {
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set("X-Frame-Options", "SAMEORIGIN");
  if (url.pathname.startsWith("/admin")) {
    // Painel nunca deve ser indexado nem cacheado por proxies.
    headers.set("X-Robots-Tag", "noindex, nofollow");
    headers.set("Cache-Control", "private, no-store");
  }
}

export default function handleRequest(request, responseStatusCode, responseHeaders, routerContext) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const userAgent = request.headers.get("user-agent");
    // Robôs (SEO) e modo SPA recebem o HTML completo; humanos recebem streaming.
    const readyOption = (userAgent && isbot(userAgent)) || routerContext.isSpaMode ? "onAllReady" : "onShellReady";

    let timeoutId = setTimeout(() => abort(), streamTimeout + 1000);

    const { pipe, abort } = renderToPipeableStream(<ServerRouter context={routerContext} url={request.url} />, {
      [readyOption]() {
        shellRendered = true;
        const body = new PassThrough({
          final(callback) {
            clearTimeout(timeoutId);
            timeoutId = undefined;
            callback();
          },
        });
        const stream = createReadableStreamFromReadable(body);

        responseHeaders.set("Content-Type", "text/html; charset=utf-8");
        applySecurityHeaders(responseHeaders, new URL(request.url));

        pipe(body);
        resolve(new Response(stream, { headers: responseHeaders, status: responseStatusCode }));
      },
      onShellError(error) {
        reject(error);
      },
      onError(error) {
        responseStatusCode = 500;
        if (shellRendered) console.error(error);
      },
    });
  });
}
