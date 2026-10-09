/**
 * TanStack Query — usado para operações assíncronas do lado do cliente que não
 * são navegação (ex.: pipeline de envio do briefing: upload dos anexos → envio).
 * Os dados de página continuam vindo dos loaders do React Router.
 */
import { QueryClient } from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

let browserQueryClient;

/** No servidor, um cliente novo por requisição; no navegador, um único cliente. */
export function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
