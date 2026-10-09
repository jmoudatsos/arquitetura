import { isRouteErrorResponse, useRouteError } from "react-router";
import { ButtonLink } from "../ui/Button.jsx";
import { Container } from "../ui/Layout.jsx";

/**
 * Erro dentro do layout público (mantém cabeçalho e rodapé).
 * Uso numa rota:  export { RouteErrorBoundary as ErrorBoundary } from "…/RouteError.jsx";
 */
export function RouteErrorBoundary() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  if (!notFound) console.error(error);

  return (
    <Container className="flex flex-col items-start py-28">
      <p className="eyebrow text-caramel">{notFound ? "Erro 404" : "Erro"}</p>
      <h1 className="display-caps mt-4 text-[2.75rem] text-bone sm:text-[3.5rem]">
        {notFound ? "Não encontramos esta página" : "Algo saiu do esquadro"}
      </h1>
      <p className="mt-5 max-w-lg text-[1.1875rem] text-mute">
        {notFound
          ? "O conteúdo pode ter sido removido ou o endereço mudou."
          : "Tivemos um problema ao carregar esta página. Tente novamente em instantes."}
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink to="/">Voltar ao início</ButtonLink>
        <ButtonLink to="/projetos" variant="secondary">
          Ver projetos
        </ButtonLink>
      </div>
    </Container>
  );
}
