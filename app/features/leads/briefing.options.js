/**
 * Opções do briefing interativo — FONTE ÚNICA DA VERDADE.
 *
 * Este arquivo é puro (sem React, sem ícones) porque é compartilhado com as
 * Edge Functions do Supabase. Depois de editar, rode:
 *
 *    npm run sync:contracts
 *
 * para copiar para `supabase/functions/_shared/`. O teste
 * `tests/unit/contracts-sync.test.js` falha se as cópias divergirem.
 */

export const PROPERTY_TYPES = ["Apartamento", "Casa", "Studio / Loft", "Comercial"];

export const PROPERTY_STATUSES = ["Em construção", "Entregue recente", "Em reforma", "Já habitado"];

export const START_FORECASTS = [
  "Imediatamente",
  "Nos próximos 3 meses",
  "Nos próximos 6 meses",
  "Ainda estudando viabilidade",
];

export const BUDGET_RANGES = [
  "Até R$ 20.000",
  "R$ 20.000 a 40.000",
  "R$ 40.000 a 80.000",
  "Acima de R$ 80.000",
  "Ainda não sei / Gostaria de auxílio",
];

export const ROOMS = [
  {
    id: "cozinha",
    title: "Cozinha Planejada",
    shortTitle: "Cozinha",
    desc: "Bancadas, eletros de embutir, despensas e gavetões de alta carga.",
    badge: "Alta prioridade",
  },
  {
    id: "quarto",
    title: "Quarto / Suíte",
    shortTitle: "Quarto",
    desc: "Guarda-roupa/closet sob medida, cabeceiras e mesas de apoio.",
    badge: "Conforto e rotina",
  },
  {
    id: "living",
    title: "Sala de Estar / Home Theater",
    shortTitle: "Living",
    desc: "Painel ripado para TV, racks suspensos e iluminação indireta.",
    badge: "Área social",
  },
  {
    id: "office",
    title: "Home Office / Ateliê",
    shortTitle: "Office",
    desc: "Bancadas ergonômicas, armários para arquivo e passa-fios.",
    badge: "Produtividade",
  },
  {
    id: "banheiro",
    title: "Banheiro / Lavabo",
    shortTitle: "Banheiro",
    desc: "Gabinetes suspensos hidrorrepelentes e espelheiras iluminadas.",
    badge: "Área molhada",
  },
  {
    id: "gourmet",
    title: "Espaço Gourmet / Varanda",
    shortTitle: "Gourmet",
    desc: "Marcenaria resistente para churrasqueira, chopeira e bar.",
    badge: "Convivência",
  },
];

export const ROOM_IDS = ROOMS.map((room) => room.id);

/**
 * Perguntas específicas por ambiente. Tipos suportados:
 *  - single  → escolha única (string)
 *  - multi   → múltipla escolha (string[])
 *  - matrix  → uma escolha por linha ({ [rowId]: string })
 *  - text    → texto livre (string)
 */
export const ROOM_QUESTIONS = {
  cozinha: [
    {
      id: "layout",
      type: "single",
      label: "Layout pretendido da bancada",
      options: ["Linear", "Em formato L", "Em formato U", "Com ilha central", "Península / balcão"],
    },
    {
      id: "eletros",
      type: "matrix",
      label: "Eletrodomésticos & equipamentos",
      hint: "Defina o status de cada item",
      rows: [
        { id: "geladeira", label: "Geladeira / refrigerador" },
        { id: "cooktop", label: "Cooktop / fogão" },
        { id: "forno", label: "Forno elétrico embutido" },
        { id: "microondas", label: "Forno micro-ondas" },
        { id: "lavaLoucas", label: "Máquina lava-louças" },
        { id: "coifa", label: "Coifa / depurador" },
        { id: "adega", label: "Adega climatizada" },
      ],
      options: ["Já possuo", "Vou comprar", "Não terei"],
    },
    {
      id: "necessidades",
      type: "multi",
      label: "Acessórios e soluções desejadas",
      options: [
        "Torre quente para forno e micro-ondas",
        "Gavetões com divisor para panelas",
        "Porta-temperos aramado ou em gaveta",
        "Lixeira dupla embutida (reciclável + orgânico)",
        "Calha úmida embutida na pedra",
        "Fita LED oculta sob armários superiores",
        "Armário despenseiro com gavetas internas",
      ],
    },
    {
      id: "observacoes",
      type: "text",
      label: "Observações sobre a cozinha",
      placeholder: "Ex.: cozinhamos todos os dias, precisamos de muito espaço para panelas grandes…",
    },
  ],

  quarto: [
    {
      id: "tamanhoCama",
      type: "single",
      label: "Medida / padrão do colchão",
      options: [
        "Solteiro (88 × 188 cm)",
        "Casal padrão (138 × 188 cm)",
        "Queen size (158 × 198 cm)",
        "King size (193 × 203 cm)",
      ],
    },
    {
      id: "fechamento",
      type: "single",
      label: "Fechamento do guarda-roupa",
      options: [
        "Portas de correr com espelho",
        "Portas de correr em MDF",
        "Portas de abrir",
        "Closet aberto (sem portas)",
      ],
    },
    {
      id: "itensArmario",
      type: "multi",
      label: "Armazenamento e closet",
      options: [
        "Mais espaço pendurado (camisas/vestidos)",
        "Mais prateleiras e gavetas (roupas dobradas)",
        "Sapateira deslizante dedicada",
        "Maleiro para malas grandes",
        "Gaveta aveludada para joias/relógios",
        "Cabideiro com luz LED acionada por sensor",
      ],
    },
    {
      id: "usosExtras",
      type: "multi",
      label: "Usos adicionais integrados",
      options: [
        "Painel para Smart TV",
        "Bancada para maquiagem / penteadeira",
        "Bancada para home office / estudos",
        "Espelho de corpo inteiro iluminado",
        "Cabeceira ripada com mesas suspensas",
      ],
    },
    {
      id: "observacoes",
      type: "text",
      label: "Observações sobre o quarto",
      placeholder: "Ex.: quarto de casal, gostaríamos de lados independentes no guarda-roupa…",
    },
  ],

  living: [
    {
      id: "tv",
      type: "single",
      label: "Tamanho da TV",
      options: ['Até 55"', '65"', '75"', '85" ou mais', "Não terá TV"],
    },
    {
      id: "painel",
      type: "single",
      label: "Tipo de composição",
      options: [
        "Painel ripado",
        "Painel liso com nichos",
        "Estante integrada (piso ao teto)",
        "Apenas rack suspenso",
      ],
    },
    {
      id: "recursos",
      type: "multi",
      label: "Recursos desejados",
      options: [
        "Iluminação indireta em LED",
        "Passa-fios e tomadas embutidas",
        "Espaço para soundbar / home theater",
        "Nichos para livros e objetos",
        "Lareira / bioetanol integrada",
        "Bar / adega integrada",
      ],
    },
    {
      id: "observacoes",
      type: "text",
      label: "Observações sobre o living",
      placeholder: "Ex.: parede da TV com 3,80 m, queremos esconder o roteador e os cabos…",
    },
  ],

  office: [
    {
      id: "usuarios",
      type: "single",
      label: "Quantas pessoas usam o espaço?",
      options: ["1 pessoa", "2 pessoas", "3 ou mais"],
    },
    {
      id: "equipamentos",
      type: "multi",
      label: "Equipamentos",
      options: [
        "Notebook",
        "Desktop / gabinete",
        "2 ou mais monitores",
        "Impressora",
        "Equipamento de vídeo / streaming",
      ],
    },
    {
      id: "recursos",
      type: "multi",
      label: "Soluções desejadas",
      options: [
        "Bancada ergonômica (altura ideal)",
        "Gaveteiro com chave",
        "Armários para arquivo",
        "Passa-fios e calha elétrica",
        "Estante para livros",
        "Painel acústico / ripado",
      ],
    },
    {
      id: "observacoes",
      type: "text",
      label: "Observações sobre o home office",
      placeholder: "Ex.: faço chamadas de vídeo o dia todo, preciso de um fundo bonito…",
    },
  ],

  banheiro: [
    {
      id: "tipo",
      type: "single",
      label: "Tipo de ambiente",
      options: ["Banheiro social", "Banheiro da suíte", "Lavabo"],
    },
    {
      id: "cubas",
      type: "single",
      label: "Cubas",
      options: ["Uma cuba", "Duas cubas", "Cuba esculpida na pedra"],
    },
    {
      id: "recursos",
      type: "multi",
      label: "Recursos desejados",
      options: [
        "Gabinete suspenso",
        "Espelheira com iluminação",
        "Nicho no box",
        "Torre para toalhas",
        "Gavetas organizadoras",
        "Tomada interna para secador",
      ],
    },
    {
      id: "observacoes",
      type: "text",
      label: "Observações sobre o banheiro",
      placeholder: "Ex.: o banheiro é pequeno, precisamos aproveitar a parede atrás do vaso…",
    },
  ],

  gourmet: [
    {
      id: "equipamentos",
      type: "multi",
      label: "Equipamentos",
      options: [
        "Churrasqueira",
        "Forno de pizza",
        "Cooktop",
        "Chopeira",
        "Adega",
        "Frigobar / cervejeira",
      ],
    },
    {
      id: "exposicao",
      type: "single",
      label: "Exposição do ambiente",
      options: [
        "Área coberta e fechada",
        "Varanda coberta, aberta nas laterais",
        "Área externa sujeita a chuva",
      ],
    },
    {
      id: "recursos",
      type: "multi",
      label: "Soluções desejadas",
      options: [
        "Bancada de apoio para servir",
        "Armários para louças e utensílios",
        "Bar com prateleiras iluminadas",
        "Materiais resistentes à umidade",
        "Lixeira embutida",
      ],
    },
    {
      id: "observacoes",
      type: "text",
      label: "Observações sobre o espaço gourmet",
      placeholder: "Ex.: recebemos bastante gente aos fins de semana…",
    },
  ],
};

export const STYLE_PRESETS = [
  {
    id: "minimalista",
    title: "Minimalismo Quente & Japandi",
    desc: "Linhas puras, armários sem puxadores aparentes (cavas ocultas), iluminação linear difusa e acolhimento.",
    colorTag: "Freijó claro, off-white e fendi",
    image: "/images/projects/cozinha-japandi-2.webp",
    tags: ["Cava oculta", "MDF areia", "LED indireto"],
  },
  {
    id: "contemporaneo",
    title: "Contemporâneo & Sofisticado",
    desc: "Contraste entre madeiras nobres escuras, laca fosca grafite, portas em perfil metálico e vidros reflecta.",
    colorTag: "Nogueira, cinza escuro e vidro bronze",
    image: "/images/projects/cozinha-nogueira-2.webp",
    tags: ["Vidro reflecta", "Laca fosca", "Serralheria"],
  },
  {
    id: "organico",
    title: "Natural & Orgânico",
    desc: "Marcenaria com ripadinhos sutis, cantos suavemente curvos, palha natural (muxarabi) e pedras claras.",
    colorTag: "Carvalho natural, palha e areia",
    image: "/images/styles/organico.webp",
    tags: ["Bordas curvas", "Palhinha muxarabi", "Pedra natural"],
  },
  {
    id: "industrial_chic",
    title: "Moderno Urbano / Industrial Chic",
    desc: "Estruturas lineares pretas, padrões cimentícios, nichos metálicos e visual despojado e funcional.",
    colorTag: "Preto fosco, concreto e madeira quente",
    image: "/images/styles/industrial.webp",
    tags: ["Serralheria preta", "Módulos aéreos", "Concreto slim"],
  },
];

export const STYLE_IDS = STYLE_PRESETS.map((style) => style.id);

export const MATERIALS = [
  "MDF amadeirado claro",
  "MDF amadeirado escuro",
  "Laca fosca acetinada",
  "Puxador tipo cava usinada",
  "Perfil metálico discreto",
  "Vidro reflecta bronze/fumê",
  "Portas ripadas / muxarabi",
  "Iluminação linear em LED sob armários",
  "Bancadas em lâmina ultracompacta / Dekton",
  "Pedra natural (mármore/granito)",
];

export const ATTACHMENT_RULES = {
  maxFiles: 8,
  maxSizeBytes: 25 * 1024 * 1024, // 25 MB — igual ao limite do bucket
  mimeTypes: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
  ],
  extensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"],
};

export const MAX_REFERENCE_LINKS = 5;

export const LEAD_STATUSES = [
  { id: "novo", label: "Novo" },
  { id: "em_contato", label: "Em contato" },
  { id: "proposta", label: "Proposta enviada" },
  { id: "fechado", label: "Fechado" },
  { id: "perdido", label: "Perdido" },
];

export const LEAD_STATUS_IDS = LEAD_STATUSES.map((status) => status.id);

export function getRoom(id) {
  return ROOMS.find((room) => room.id === id) ?? null;
}

export function getStyle(id) {
  return STYLE_PRESETS.find((style) => style.id === id) ?? null;
}

export function getLeadStatus(id) {
  return LEAD_STATUSES.find((status) => status.id === id) ?? null;
}
