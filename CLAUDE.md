# be·aside — guia para o Claude

Guia médico de UTI/emergência (pt-BR), consultado à beira do leito. Site **estático**
multi-módulo hospedado na Vercel (`be-aside.vercel.app`), com um assistente de IA
opcional rodando em Vercel Functions.

## Arquitetura

- **HTML estático puro.** Sem framework, sem build step, sem bundler. Cada página é um
  `.html` completo que carrega `assets/styles.css` e `assets/app.js`. Editar = editar o
  HTML direto.
- **Módulos** (pastas na raiz): `vm/` (ventilação mecânica), `hemo/` (hemodinâmica &
  choque), `neuro/` (neurocrítico), `proc/` (procedimentos). `index.html` na raiz é o hub.
- **`assets/app.js`** monta o shell compartilhado (header, sidebar, busca) a partir de dois
  objetos: `MODULES` (metadados/cor de cada módulo) e `MODULE_PAGES` (índice de páginas por
  módulo). **Ao adicionar uma página nova, registre-a em `MODULE_PAGES`** ou ela não aparece
  na sidebar nem na busca.
- Cada `<body>` tem `data-module="vm" data-page="sdra"` — é isso que o app.js usa para
  destacar o item ativo na sidebar e aplicar a cor do módulo (`--accent`).
- **`assets/styles.css`** é o único stylesheet, global a todos os módulos. Usa custom
  properties (`--accent`, `--accent-rgb`) que cada módulo/página redefine.

## Design system (importante)

Todas as páginas de **conteúdo** de proc, hemo e VM seguem um design system unificado
(o "redesign Fable"). Ao criar ou editar páginas de conteúdo, **use estas classes globais**
(já definidas em `styles.css`) em vez de inventar estrutura nova:

- **Cabeçalho:** `.hero-eyebrow` (faixa "Módulo · Categoria") → `.section-title` (h1) →
  `.section-subtitle` → `.hero-meta` (faixa de metadados-resumo, com `.hm-item`/`.hm-k`/`.hm-v`;
  variante `.cols-3`).
- **Seções:** `.sec-h` com `.sec-num` (títulos numerados 01, 02… com linha degradê) +
  `.sec-lead` (parágrafo de abertura).
- **Grids de conceito:** `.ind-grid` (+ `.cols-3`) com `.ind-item`/`.ind-t`/`.ind-d`
  (termo + detalhe). Substitui o antigo `.card-grid`/`.concept-card`.
- **Passo a passo:** `.tl` (lista `<ol>`) com `.tl-n` (número/símbolo) + `.tl-b` (corpo) —
  timeline vertical conectada. Substitui o antigo `.step-list`/`.step-item`.
- **Boxes:** `.anatomy-note` (teal, conceito-chave), `.info-box` (neutro), `.warn-box`
  (vermelho, alerta), `.ok-box` (teal, "faça isto"), `.tip-box` (âmbar, pearl clínico).
  Substituem os antigos `.callout .teal/.red/.amber/...`.
- **"O que não fazer":** `.pitfall-h` (título com ✕) + `.pitfall-list` (`<ul>`, cada `<li>`
  ganha ✕ automático). Use quando houver erros a evitar.
- **Fórmulas:** `.formula` (+ `.compact`, cores) — caixa monospace que renderiza equações
  com `.op`/`.num`/`.frac`. Mantida do sistema antigo do hemo; continua sendo o jeito certo.
- **Referências:** `.ref` (bloco monospace ao fim de uma seção). Substitui os `.src` inline.
  Consolide citações repetidas em uma `.ref` por seção — não repita o mesmo rótulo por bullet.
- **Tabelas:** envolver em `.table-wrap`; usar `.td-mono`/`.td-ok`/`.td-warn`/`.td-bad` e
  `.pill .pill-*` para status.
- **Convenção da eyebrow:** `"<Módulo> · <Categoria>"`, ex.: `Ventilação Mecânica · SDRA`,
  `Hemodinâmica · POCUS`.

### Componentes que NÃO devem virar o padrão genérico

Algumas páginas têm componentes sob medida — preserve-os, não converta para `.tl`/`.ind-grid`:

- **`.fx`** (fluxograma de decisão): `hemo/fluxograma.html`. Árvore de decisão com
  `.fx-step`/`.fx-box`/`.fx-arrow`/`.fx-decision`/`.fx-loop`. É o componente certo para fluxo.
- **SVGs inline:** curvas de dissincronia (`vm/dissincronia.html`, classe `.wave`), gráfico
  interativo de quadrantes (`hemo/quadrantes.html`), curvas de PAI/Swan (`proc/pai.html`,
  `proc/swan.html`). São conteúdo — copiar verbatim, nunca "melhorar".
- **Páginas interativas** (assistente, calculadora, quiz, drogas, pearls, pratica, siglas):
  têm JS e layout próprios. Nessas, só adicione a `.hero-eyebrow` no topo; **não** reestruture
  o miolo. `hemo/drogas.html` usa abas (`.sub-nav`/`.sub-section`) + cards colapsáveis.
- **`index.html` de cada módulo e o da raiz:** têm estilo de landing page próprio
  (`.lp-*`/`.hub-*`). Não tocar sem pedido explícito.

### Status do design system por módulo

- ✅ **proc, hemo, VM** — no design system unificado.
- ⏳ **neuro** — ainda no estilo antigo (`.card`/`.callout`/`.concept-card`). É o próximo
  candidato natural à migração. ~9 páginas.

## Assistente de IA (`api/`)

Vercel Functions que recebem os dados do paciente e pedem uma sugestão de conduta ao Claude:
`api/sugerir.js` (VM), `api/sugerir-hemo.js`, `api/sugerir-neuro.js`. Usam o
`@anthropic-ai/sdk`.

- **Base de conhecimento:** `api/knowledge.js` é **gerado** — não editar à mão. Rode
  `npm run extract-knowledge` (= `node scripts/extract-knowledge.js`), que extrai o texto
  médico dos HTMLs listados em `scripts/extract-knowledge.js`. **Ao adicionar/editar páginas
  de conteúdo relevantes, regenere** para o assistente ficar em dia.
- **Segurança:** protegidas por senha (`VMGUIDE_SENHA`) + `ANTHROPIC_API_KEY`, ambas em env
  var na Vercel — **nunca no código**. O system prompt marca a base como cacheável
  (`cache_control`) para baratear turnos seguintes.
- **Modelo:** definido na constante `MODEL` no topo de cada function.

## Deploy & git

- **Deploy:** `vercel` (preview) → avaliar → `vercel --prod` (produção). Projeto linkado como
  `be-aside` (team `joaohperes-projects`). O fluxo estabelecido é sempre preview primeiro,
  produção só após OK do usuário.
- **Git:** remoto em `github.com/joaohperes/beaside`. Trabalhar em branch e mergear na `main`.
  Commits em pt-BR no padrão `tipo(escopo): descrição`.

## Convenções

- Todo texto de usuário e conteúdo médico em **pt-BR**.
- Ao editar conteúdo clínico: preservar 100% de dados, doses, tabelas e referências. Mudança
  visual ≠ mudança de conteúdo.
- Manter a densidade de comentários e o idioma do código existente.
