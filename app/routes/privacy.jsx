import { useRouteLoaderData } from "react-router";
import { PageHero } from "../components/shared/Blocks.jsx";
import { Container } from "../components/ui/Layout.jsx";
import { formatPhoneDisplay } from "../features/leads/lead.mapper.js";
import { buildMeta } from "../utils/seo.js";

export const meta = ({ matches }) =>
  buildMeta(matches, {
    title: "Política de privacidade",
    description: "Como tratamos os dados enviados pelo briefing, em conformidade com a LGPD.",
    path: "/privacidade",
  });

/*
 * Modelo de política alinhado à LGPD (Lei 13.709/2018) para o fluxo deste site.
 * Revise com um profissional jurídico antes de publicar.
 */
export default function Privacy() {
  const { settings } = useRouteLoaderData("root");
  const studio = settings.studio_name;
  const contact = settings.contact_email || (settings.contact_whatsapp ? formatPhoneDisplay(settings.contact_whatsapp) : "nossos canais de atendimento");

  return (
    <>
      <PageHero eyebrow="LGPD" title="Política de privacidade" lead={`Como o ${studio} trata as informações enviadas por este site.`} />
      <Container className="py-16 lg:py-24">
        <div className="prose-studio max-w-3xl">
          <p>
            Esta política explica quais dados coletamos quando você preenche o briefing ou entra em contato, para que eles são
            usados e quais são os seus direitos, nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
          </p>

          <h2>1. Quais dados coletamos</h2>
          <ul>
            <li>
              <strong>Identificação e contato:</strong> nome, WhatsApp/telefone, e-mail (opcional) e cidade/bairro do imóvel.
            </li>
            <li>
              <strong>Informações do projeto:</strong> tipo e momento do imóvel, ambientes, respostas técnicas, preferências de
              estilo e materiais, faixa de investimento e observações.
            </li>
            <li>
              <strong>Arquivos e links:</strong> plantas, fotos e referências que você decidir enviar.
            </li>
            <li>
              <strong>Dados técnicos mínimos:</strong> navegador utilizado e um identificador anonimizado (hash) do endereço IP,
              usado apenas para evitar envios automatizados (spam).
            </li>
          </ul>

          <h2>2. Para que usamos</h2>
          <p>
            Exclusivamente para analisar o seu projeto, elaborar a proposta, entrar em contato sobre ela e, se você contratar,
            executar o serviço. A base legal é o seu consentimento (art. 7º, I) e a execução de procedimentos preliminares a um
            contrato a seu pedido (art. 7º, V).
          </p>

          <h2>3. Com quem compartilhamos</h2>
          <p>
            Não vendemos nem cedemos seus dados. Eles são armazenados e processados por fornecedores de infraestrutura
            contratados para operar este site — banco de dados e armazenamento de arquivos (Supabase), envio de e-mails
            transacionais e o serviço de mensagens usado para avisar nossa equipe — sempre limitados a essa finalidade.
          </p>

          <h2>4. Por quanto tempo guardamos</h2>
          <p>
            Pelo tempo necessário para a negociação e, se houver contrato, pelo período exigido por obrigações legais. Briefings
            que não resultarem em projeto podem ser excluídos a qualquer momento mediante solicitação.
          </p>

          <h2>5. Seus direitos</h2>
          <p>
            Você pode solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade ou exclusão dos seus
            dados, além de revogar o consentimento (art. 18). Basta escrever para <strong>{contact}</strong>.
          </p>

          <h2>6. Segurança</h2>
          <p>
            Os dados trafegam por conexão criptografada (HTTPS), os anexos ficam em armazenamento privado e o acesso ao painel é
            restrito à equipe autorizada, com controle de permissões no banco de dados.
          </p>

          <h2>7. Cookies</h2>
          <p>
            O site não usa cookies de publicidade. O rascunho do briefing é guardado apenas no seu navegador (armazenamento
            local) para que você não perca o que já preencheu; ele é apagado após o envio.
          </p>

          <h2>8. Contato</h2>
          <p>
            Dúvidas sobre esta política: <strong>{contact}</strong>
            {settings.address ? ` · ${settings.address}` : ""}.
          </p>
        </div>
      </Container>
    </>
  );
}

export { RouteErrorBoundary as ErrorBoundary } from "../components/shared/RouteError.jsx";
