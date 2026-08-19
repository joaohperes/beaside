# be·aside — guia para o Claude / agentes

Duas frentes no **mesmo** deploy Vercel (`https://beaside.com.br`), com stacks **diferentes**:

| Frente | O quê | Stack | Path prod |
|--------|--------|--------|-----------|
| **Guia be·aside** | Conteúdo clínico UTI/PS à beira do leito | HTML estático puro | `/`, `/vm/`, `/hemo/`, … |
| **Hub UTI** | Workspace clínico multi-leito (labs, SSVV+BH, invasões, drogas, infeccioso, evolução) | SPA React (Vite) | `/hub-uti/` |

**Repo de deploy:** `github.com/joaohperes/beaside` · branch `main`  
**Fonte do Hub UTI (dev/build):** pasta irmã `~/hub-uti` (ou path local equivalente) — o build é **publicado** em `beaside/hub-uti/` (artefatos, não editar o bundle à mão).  
**Produto guia (visão):** assinatura futura (~R$ 79,90 conteúdo / ~R$ 119–129 com IA); free = hub + teaser.

**Domínio (ago/2026):** `beaside.com.br` é o **canônico** — registro.br (acesso via pai do César) → nameservers Cloudflare → Vercel. Entradas equivalentes, todas servindo o mesmo deploy: `www.beaside.com.br` e `be-aside.com.br` redirecionam 308 para o apex; `be-aside.vercel.app` continua acessível (previews e fallback). A base do canonical/OG/sitemap mora em `conteudo/manifest.json` (`site.url`) e `scripts/seo-tags.js` (`BASE_URL`) — trocar nos dois e rodar os geradores. **Cloudflare com proxy desligado (nuvem cinza)** em todos os registros: proxy ligado quebra a emissão do certificado do Vercel e empilha dois CDNs.

**Decisão de escopo (explícita):** Hub UTI **não** é módulo do guia estático nem “feature escondida” do `app.js`. É um **segundo produto** no monorepo de deploy, ainda **sem link** no hub principal (URL direta / bookmark; `noindex`). Evolui com ritmo próprio; mudanças de plantão **não** devem vazar regras do design system do guia e vice-versa, salvo tokens/auth compartilhados (Clerk).

---

## Como ler esta documentação (leia isto primeiro)

O be·aside tem mais documentação do que cabe numa leitura só. Ler tudo a cada
sessão é lento, caro e, pior, dá a sensação falsa de já saber — o arquivo grande
some da memória no meio do trabalho. A regra é: **abrir o que a tarefa pede, e só.**

| Vou mexer em… | Leia |
|---|---|
| qualquer coisa | este arquivo (`CLAUDE.md`) — arquitetura, design system, regras |
| conteúdo clínico (página, dose, artigo) | `conteudo/manifest.json` e/ou `conteudo/farmacos.json` — **a fonte** |
| rumo do produto, fases, decisões, SEO/GEO | `PROJECT_STATUS.md` — pela seção (`§14`, `§15`…), não inteiro |
| escolher o próximo artigo | `PERGUNTAS-DE-PLANTAO-BANCO.md` — pelo tema, não inteiro |
| entender por que algo ficou assim | `docs/historico.md` — pela sessão, não inteiro |
| referências do Hemodinâmica | `REFERENCIAS-HEMO.md` |
| Hub UTI (SPA React) | o **fonte** em `~/hub-uti`, nunca o bundle publicado aqui |

### Arquivos que nunca se lê inteiro

Não é preferência, é limite prático — estes estouram a janela de contexto ou
consomem uma fatia dela que a tarefa vai precisar depois:

| Arquivo | Tamanho | Como consultar |
|---|---|---|
| `api/knowledge.js` | ~425 KB em 23 linhas (~100 mil tokens) | **nunca abrir.** É gerado por `npm run extract-knowledge` a partir das páginas. Precisa do conteúdo? Abra a página. Precisa saber se está atualizado? `npm run pre-commit` responde. |
| `assets/styles.css` | ~123 KB, 2.943 linhas | `grep -n 'classe-provável' assets/styles.css` e leia o trecho |
| `assets/app.js` | ~62 KB, 1.064 linhas | idem — procure a função, não role o arquivo |
| `conteudo/manifest.json` | ~53 KB, 1.524 linhas | `grep`/`jq` pelo módulo ou slug |
| `PROJECT_STATUS.md` | ~42 KB, 631 linhas | pela seção numerada |
| `docs/historico.md` | ~28 KB, 361 linhas | pela sessão |
| `PERGUNTAS-DE-PLANTAO-BANCO.md` | ~28 KB, 551 linhas | pelo tema |
| `hub-uti/assets/*` | bundle minificado, ~2,2 MB | **nunca.** Não é fonte. |

Se a resposta exigir mesmo um arquivo desses por inteiro, quase sempre a pergunta
está errada: existe um script, um grep ou uma fonte menor que responde melhor.

---

## Arquitetura (duas stacks)

### 1) Guia be·aside — HTML estático

- **HTML estático puro.** Sem framework, sem build step, sem bundler. Cada página é um
  `.html` que carrega `assets/styles.css` e (nos módulos) `assets/app.js`.
- **Módulos** (pastas na raiz): `vm/`, `hemo/`, `neuro/`, `proc/`. Hub: `index.html` na raiz.
- **`assets/app.js`** monta o shell (header, sidebar, busca, tema, tabelas stackable) a partir
  de `MODULES` e `MODULE_PAGES`. **Página nova → registrar em `MODULE_PAGES`.**
- Cada `<body>`: `data-module="vm" data-page="sdra"` (accent + nav ativo).
- **`assets/styles.css`** — stylesheet global (tokens, shell, design system, light theme).
- **`assets/theme-boot.js`** — no `<head>` de **todas** as páginas do guia; aplica tema salvo antes
  do paint (`localStorage` key `beaside-theme`).
- **Hub** (`index.html`) tem CSS e JS de tema próprios (não usa `app.js` no shell).
- **Login (Clerk, real):** `login.html` + `assets/auth.js` + `sso-callback.html` + `conta.html`. E-mail/senha (+ verificação de código + captcha), Google OAuth; Apple off no UI (`OAUTH_APPLE: false`). Hub: **Entrar** ou chip (1º nome) → menu (nome completo, e-mail, Minha conta, Sair). **Módulos do guia abertos sem login** (gate futuro = plano/assinatura, não login sozinho).
- **Auth config:** `assets/auth-config.js` (`PUBLISHABLE_KEY` pk_* — pública) e env Vercel `CLERK_PUBLISHABLE_KEY` + `api/clerk-config.js`. **Não** commitar `sk_*`. App dev: `arriving-seasnail-55`.
- **Sessão no hub (sem FOUC):** hint `localStorage['beaside-auth-hint']` + boot síncrono na `.navbar` do `index.html` (chip otimista); `auth.js` confirma com Clerk.

### 2) Hub UTI — SPA React (segundo produto)

- **URL:** `https://beaside.com.br/hub-uti/` · headers `X-Robots-Tag: noindex, nofollow` (`vercel.json`). CORS do sync (`api/hub-plantao.js`) aceita o domínio próprio, o `www` e o `.vercel.app` — origem fora da lista bloqueia o plantão.
- **Código-fonte:** repo/pasta **irmã** `hub-uti` (Vite + React 19 + Tailwind v4). **Não** é HTML estático; **não** usa `assets/app.js` / design system do guia.
- **Build → deploy:** no fonte `npm run publish:beaside` (build + copia `dist/` → `beaside/hub-uti/`). Em seguida commit/push no **beaside** e deploy Vercel.
- **Função:** plantão multi-paciente (≤40 leitos): import labs (texto/PDF), SSVV+BH, invasões, drogas, evolução em formato de **prontuário/plantão** (seções `#…` copiáveis). Persistência `localStorage`; sync opcional com conta via `api/hub-plantao.js` (JWT Clerk + KV ou metadata).
- **Auth:** mesma conta Clerk do be·aside (`login.html?next=/hub-uti/`); sem login = só local no aparelho.
- **Docs do produto:** no fonte — `hub-uti/README.md`, `ARCHITECTURE.md`, `SURVEY.md`.
- **Agentes:** ao tocar Hub UTI, editar o **fonte** em `~/hub-uti` (ou path configurado), **nunca** minificar/editar `beaside/hub-uti/assets/*` à mão. Ao tocar o guia, não assumir React/Vite.

### Arquivos-chave de assets (guia)

| Arquivo | Função |
|---------|--------|
| `assets/styles.css` | Design system, shell, mobile stack, light theme |
| `assets/app.js` | Shell, busca, tema, `prepareStackableTables` |
| `assets/theme-boot.js` | Anti-FOUC do tema |
| `assets/auth.js` / `auth-config.js` | Cliente Clerk (vanilla) |
| `login.html` / `sso-callback.html` | UI login + callback OAuth |
| `api/sugerir*.js` | Assistentes do guia (senha compartilhada ainda) |
| `api/clerk-config.js` | Expõe só a publishable key |
| `api/knowledge.js` | Gerado — `npm run extract-knowledge` |
| `api/hub-plantao.js` | Sync do plantão Hub UTI (Clerk JWT; KV opcional) |
| `hub-uti/` | **Bundle publicado** do segundo produto (não é fonte) |

---

## Tipografia

| Papel | Fonte |
|--------|--------|
| UI, texto, labels, nav | **Inter** |
| Fórmulas, doses, `.td-mono` | **JetBrains Mono** |

- `@import` no topo de `styles.css` (cobre páginas hemo sem link de font no HTML).
- Labels semânticos (choque, Forte, SvcO₂) em **sans**, não mono.
- Feature settings Inter: `cv11`, `ss01`, `ss03`; `letter-spacing: -.011em` no body.

---

## Tema claro / escuro

- **Padrão:** dark (`data-theme` omitido ou `dark`).
- **Claro:** `html[data-theme="light"]` com tokens dedicados (não é invert).
- **Toggle:** botão `.btn-theme` no header dos módulos e no hub (ícones sol/lua empilhados).
- **Persistência:** `localStorage['beaside-theme']` = `light` \| `dark`.
- **Animação:**
  - Botão: CSS crossfade/rotate entre `.theme-icon-sun` e `.theme-icon-moon` + pulse.
  - Página: **View Transition API** (`document.startViewTransition`) com crossfade;
    fallback `theme-switching` só em body/header/sidebar.
- Respeitar `prefers-reduced-motion`.
- Funções em `app.js`: `getTheme`, `applyTheme`, `toggleTheme`, `syncThemeButtons`.
  Hub repete lógica similar no script inline do `index.html`.

**Ao criar página HTML nova:** incluir no `<head>` (após `<head>`):

```html
<script src="../assets/theme-boot.js"></script>
```

(raiz do hub: `assets/theme-boot.js`).

---

## Design system (conteúdo)

Ao criar/editar páginas de conteúdo, use estas classes (não inventar estrutura nova):

### Cabeçalho de página

- `.page-head` → `.hero-eyebrow` → `h1.section-title` → `.section-subtitle`
- `.hero-meta` (obrigatório se houver meta): wrapper com `.hm-item` / `.hm-k` / `.hm-v`
  - Variantes: `.cols-2`, `.cols-3` (default 4 colunas se sem classe)
  - **Nunca** deixar `.hm-item` soltos sem o wrapper `.hero-meta`

Eyebrow: `"<Módulo> · <Categoria>"`  
Exemplos: `Ventilação Mecânica · SDRA`, `Hemodinâmica · POCUS`, `Neurocrítico · Fundamentos`  
(Proc pode usar travessão longo no estilo existente: `Procedimentos — Acesso vascular`.)

### Corpo

- **Seções:** `.sec-h` + `.sec-num` + `h2` + `.sec-lead`
- **Conceitos:** `.ind-grid` / `.ind-item` / `.ind-t` / `.ind-d`
- **Passos:** `ol.tl` / `.tl-n` / `.tl-b` — strongs usam `color: var(--text)` (contraste light)
- **Boxes:** `.anatomy-note`, `.info-box`, `.warn-box`, `.ok-box`, `.tip-box`
  - **Não** usar `ok-box` só por estética de “card de fórmula” — preferir `.formula-card` neutro
- **Pitfalls:** `.pitfall-h` + `ul.pitfall-list`
- **Fórmulas:** `.formula` (+ `.compact`, `.purple`, etc.)
- **Escalas sob fórmula:** `.scale-k`, `ul.scale-legend` > `li` com `.pill` + `.scale-lbl`, `.scale-note`
- **Material / checklist:** `.mat-grid` > `.mat-item` (lista vertical com bolinha, **não** chips soltos)
- **Referências:** `.ref` (ou `.ref-mark` com tooltip)
- **Respiro entre blocos:** regras de adjacência em CSS (ex. `.ind-grid + .warn-box { margin-top: 20px }`) — não colar cards/boxes

### Tabelas

- Sempre envolver em `.table-wrap`.
- **Mobile (≤768px):** `prepareStackableTables()` em `app.js` marca tabelas ≥2 colunas;
  cada linha vira card com `data-label` do cabeçalho. Classe `.table-stack` no wrap.
  Não reimplementar scroll horizontal como padrão para multi-col.
- **Labels semânticos:** `.pill` + `.pill-green|amber|red|coral|blue|gray|purple|teal`
  - Visual = **texto com cor** (sem cápsula/chip).
  - Qualificadores: `.pill-qual` em cinza, fora da cor do tipo  
    ex.: `<span class="pill pill-blue">Obstrutivo</span><span class="pill-qual"> (TEP)</span>`
  - Legenda com dot: `.mat-item > .pill::before` (ex. SSC Forte/Condicional)
  - **Não** colocar `title=` em pills de força se a legenda já explica (evita hover tosco)
- Células: `.td-mono`, `.td-ok`, `.td-warn`, `.td-bad`
- Padding generoso; 1ª coluna com `.pill` tem `min-width` e respiro

### Shell / nav

- Item ativo da sidebar: barra **reta** (`::before` 2px), **não** `box-shadow` inset em pill arredondado.
- Header: logo, módulo, título, **toggle tema**, busca ⌘K, menu mobile.

### Componentes especiais (não genericizar)

| Componente | Onde | Notas |
|------------|------|--------|
| `.fx` fluxograma | `hemo/fluxograma.html` | Manter |
| Matriz quadrantes | `hemo/quadrantes.html` | **Tiles CSS 2×2** (não SVG escuro). Cores fixas: Q1 teal, Q2 âmbar, Q3 **roxo**, Q4 **vermelho**. Detalhe Q1 **não** usa `--accent` do hemo. |
| `.vci-bar` / `.vci-seg` | `hemo/vci.html` | Faixa de diâmetro; tipografia legível |
| `.formula-card` | fórmulas cIVC/dIVC | Neutro, sem fundo verde |
| SVGs curvas | dissincronia, PAI, Swan | Conteúdo — não “melhorar” sem pedido |
| Interativos | assistente, quiz, calc, drogas, pearls | Só eyebrow no topo se redesign visual |

### Landings de módulo (`.lp-*`)

- Hero + painel de stats (glass / tokens) + grid de cards.
- Footer copy: **beira-leito · referência rápida** (não “plantão · …”).
- Foco hub: **UTI · PS** (Pronto-Socorro), não ER.
- Neuro: módulo **parcial**; stubs com empty state; parceiro preenche conteúdo.

### Hub (`index.html`)

- Landing editorial premium: hero + CTAs + value strip + bento de módulos + autores.
- Tema dark/light próprio + `theme-boot.js`.
- Não reestruturar sem pedido explícito.

---

## Status por módulo

| Módulo | Design system | Conteúdo |
|--------|---------------|----------|
| **vm** | ✅ | Maduro |
| **hemo** | ✅ | Maduro |
| **proc** | ✅ | Maduro |
| **neuro** | ✅ shell/markup | ⏳ Stubs: `avc-i`, `avc-h`, `enc`, `calc-neuro`; `pearls` sem cards. Parceiro preenche. |

### Modo Plantão (guia) vs Hub UTI

| | **Modo Plantão (removido)** | **Hub UTI (ativo)** |
|--|-----------------------------|---------------------|
| Onde | Shell do guia (`plantao-mode` CSS/JS no header) | SPA `/hub-uti/` |
| Papel | Atalho visual/defasado no conteúdo estático | **Sucessor intencional** — ferramenta real de plantão multi-leito |
| Status | **Removido** (não reintroduzir) | Em evolução ativa; bundle em `beaside/hub-uti/` |

- Conteúdo clínico do guia que usa a palavra “plantão” (ex. pearls “dúvidas de plantão”) **permanece** — não é o modo CSS removido.
- Se alguém achar que “falta o modo plantão” no guia: **não** recriar CSS antigo; o caminho é o **Hub UTI**.

---

## Hub UTI — escopo e regras rápidas

- **Produto:** workspace clínico de UTI, inicialmente centrado no plantão, agora orientado a uma
  alternativa própria e aprimorada ao fluxo do EvClinic. Não copiar a interface de terceiros e
  não chamar a infraestrutura atual de prontuário oficial.
- **Identidade do paciente:** leito (+ nome/iniciais conforme UI atual); regra de leito em `patientImport.js` (nunca auto-ocupar vaga errada; conflitos explícitos).
- **Integridade clínica:** texto automático de evolução só pode usar fatos efetivamente registrados; achados ausentes permanecem como campos `[confirmar …]`. Não reintroduzir preenchimento automático de exame físico “normal” nem setas genéricas de laboratório.
- **Episódio assistencial:** cada ocupação tem `episodeId`/`occupiedAt`. Nome conflitante exige confirmação e, quando forçado, inicia reocupação limpa — nunca mesclar silenciosamente dados de pacientes diferentes.
- **Concorrência/sync:** estado usa revisões e tombstones; salvamento local é imediato, flush no `pagehide`, expiração local em 12 h e resolução de conflito pelo servidor. Ao limpar, excluir a nuvem antes do estado local.
- **PHI:** minimizar no núcleo atual. Qualquer retenção longitudinal exige RBAC por organização,
  auditoria imutável, retenção/backup/exportação e governança LGPD antes de ser tratada como EHR.
- **Privacidade local:** identificação breve por padrão, alternância de máscara e bloqueio por inatividade em 15 min. Não remover esses controles sem decisão explícita.
- **Importações:** imagem/PDF passam por prévia e confirmação; deduplicar conteúdo; PDF limitado a 15 MB/50 páginas. Importação individual de laboratório deve bloquear incompatibilidade de paciente.
- **API:** `api/hub-plantao.js` — GET/PUT/DELETE do estado do plantão por usuário Clerk, com revisão/tombstones, sanitização, limite de 1 MB, rate limit e CORS restrito. Env: `CLERK_SECRET_KEY` (sync); opcional `KV_REST_API_URL` + `KV_REST_API_TOKEN` e `HUB_ALLOWED_ORIGINS`.
- **UI/performance:** tabs são lazy e apenas a ativa é montada; PDF é import dinâmico. Preservar navegação por teclado, foco de dialogs e fallback visível para falha de cópia.
- **Publicar:** no fonte Hub UTI → `npm run publish:beaside` → commit no beaside (pasta `hub-uti/` + API se mudou) → push → deploy.
- Detalhe de arquitetura, parsers e testes: docs **no fonte** (`ARCHITECTURE.md`).

---

## Assistente de IA e APIs (`api/`)

### Guia (IA clínica)

- `api/sugerir.js` (VM), `sugerir-hemo.js`, `sugerir-neuro.js`.
- Gate atual: senha `VMGUIDE_SENHA` (compartilhada) + `ANTHROPIC_API_KEY`.
- Knowledge: regenerar com `npm run extract-knowledge` após mudanças clínicas relevantes no **guia**.
- **Futuro (produto guia):** assinatura + cota de IA; gate por **plano**, não por login sozinho.

### Auth / Hub UTI

- **Auth (Clerk) — status ago/2026:** front E2E no guia (login + hub chip + `conta.html` + SSO + captcha + erros pt-BR). Dashboard: e-mail+senha; **username off**; Google SSO on; Apple off no UI. A instância é **Development** (`arriving-seasnail-55.clerk.accounts.dev`): detecta o host em runtime (`$DEVHOST`) e **não** tem lista de origins para editar — login no domínio próprio funcionou sem configurar nada. Não mexer em Domains/Paths do dashboard dev: a instância Production nasce com config própria, e o Clerk vai descontinuar component paths pelo dashboard.
- `CLERK_SECRET_KEY` na Vercel: **já usada** por `api/hub-plantao.js` (sync do plantão). Para a IA do guia, secret no server só se validar sessão/quota no futuro.
- **Não** misturar: assistentes `sugerir*` = conteúdo do guia; `hub-plantao` = estado do plantão SPA.

---

## Deploy & git

- **Prod:** `npx vercel --prod --yes` (projeto `be-aside`, team `joaohperes-projects`).
- Fluxo prático: commit → push `main` → prod (usuário costuma pedir “deploy prod” após OK visual).
- **Hub UTI:** alterações de UI/lógica no fonte `hub-uti` → `npm run publish:beaside` → incluir `beaside/hub-uti/**` no commit do beaside.
- Commits pt-BR: `tipo(escopo): descrição` (escopos úteis: `guia`, `hub-uti`, `auth`, `api`).
- **Não** commitar secrets; env só na Vercel.

---

## Convenções clínicas / copy

- Todo UI e conteúdo em **pt-BR**.
- Editar visual **sem** alterar doses, evidências ou condutas sem pedido.
- Termos: **introdutora** (não introductora); sutura CVC preferir **nylon** 2-0/3-0; **PS** = Pronto-Socorro.
- Material de apoio — não substitui julgamento médico (footer hub).

---

## Conteúdo: fonte única de verdade (`conteudo/manifest.json`)

Desde jul/2026 o mapa do conteúdo do guia mora em **um só lugar**: `conteudo/manifest.json`.
Módulos, páginas, ordem do menu, cards dos hubs e artigos são descritos ali, em português,
e todo o resto é **gerado** a partir dele por `scripts/build-content.js`.

O que o gerador reescreve automaticamente:

| Arquivo | O que é gerado |
|---|---|
| `assets/app.js` | `MODULES` e `MODULE_PAGES` — menu lateral, prev/próximo e busca ⌘K |
| `vm\|hemo\|neuro\|proc/index.html` | os cards do hub, a numeração `01, 02, 03…` e o painel "Páginas / Prontas" |
| `artigos/index.html` | os cards da Central de Conhecimento |
| `scripts/extract-knowledge.js` | `PAGES_BY_MODULE` — o que alimenta o assistente de IA |
| `llms.txt` | a seção "Conteúdo completo" (mapa do site para robôs de IA) |

`sitemap.xml`, canonical, Open Graph e Twitter Card continuam vindo de `scripts/seo-tags.js`,
que varre os arquivos do repositório — não precisa de manutenção manual.

Tudo que é gerado está entre marcadores. **Não editar nada entre eles:**

```
<!-- AUTO:conteudo -->   …   <!-- /AUTO:conteudo -->     (HTML e llms.txt)
/* AUTO:conteudo */      …   /* /AUTO:conteudo */         (JS)
```

Comandos:

```bash
npm run nova-pagina -- --modulo vm --id peep \
  --titulo "Titulação da PEEP" \
  --subtitulo "Tabelas PEEP/FiO₂, PEEP decremental e stress index" \
  --categoria "Fundamentos"       # cria o HTML, registra e regera tudo

npm run build:content             # regera tudo a partir do manifesto
npm run check:content             # não escreve nada; falha se algo saiu de sincronia
```

`check:content` também audita: página no manifesto sem arquivo no disco, página no menu
sem card no hub, e arquivo `.html` que existe no repositório mas está fora do manifesto
(órfão — fora do menu, do hub e da IA).

### Checklist ao adicionar página de conteúdo

1. `npm run nova-pagina -- …` — cria o HTML já com `data-module` / `data-page`,
   theme-boot, canonical/OG/Twitter, e registra a página no manifesto.
2. Escrever o conteúdo clínico substituindo os `[PREENCHER]`, usando o design system
   (`.page-head`, `.sec-h`, `.table-wrap`, `.ref`, labels semânticos — não chips).
3. Se meta-resumo: `.hero-meta` com `cols-2`/`cols-3` conforme nº de itens.
4. Toda afirmação clínica com `<div class="ref">` citando a fonte.
5. `npm run extract-knowledge` para o assistente aprender a página nova.
6. Testar mobile (tabelas stack) e toggle dark/light.
7. `npm run check:content` antes de commitar.

Para editar ordem do menu, título, subtítulo ou texto do card: mexer **no manifesto** e
rodar `npm run build:content`. Editar `MODULE_PAGES` ou os cards à mão volta atrás na
próxima execução do gerador.

---

## Histórico

O registro sessão a sessão vive em **`docs/historico.md`** — o que foi feito, quando
e por quê. Ele não muda decisão nenhuma; serve para entender por que algo ficou
como está antes de desfazer.

**Não leia esse arquivo inteiro.** Ache a sessão pelo assunto
(`grep -n '^### Sessão' docs/historico.md`) e leia só o trecho.
Sessão nova entra no fim dele, não aqui.

---

## Grafo de código (Graphify) — regra clínica

O repositório tem `.graphifyignore`. Quando o Graphify estiver instalado, o grafo
indexa **código e estrutura** — casca HTML, `assets/app.js`, `scripts/`, `api/`
(menos os gerados), CSS. Ele serve para responder *onde está* e *o que chama o quê*.

**O grafo nunca responde pergunta clínica.** Dose, diluição, vazão, alvo,
indicação, contraindicação e conduta saem de `conteudo/manifest.json`, de
`conteudo/farmacos.json` e da própria página clínica — lidos do arquivo, na hora.
O grafo é um retrato: envelhece entre uma indexação e a seguinte. Retrato
desatualizado sugerindo dose é o erro que este projeto não pode cometer.

Se um hook mandar consultar o grafo antes de abrir arquivo, **esta regra vence o
hook**. O grafo economiza busca, não substitui leitura da fonte.

Reindexar depois de mudança estrutural (arquivo novo, script novo, rota nova).
`graphify-out/` é artefato local e não vai para o repositório.

---

### Sessão 02/ago/2026 — domínio próprio `beaside.com.br`

**Publicado** (`a9052db`, `8ba0adf`, `6d66ceb`). Verificado em produção.

1. **`beaside.com.br` no ar como canônico.** Cadeia: registro.br (acesso via pai do
   César) → nameservers Cloudflare (`javier`/`rosalie`) → Vercel. `DNS Setup: Full`,
   DNSSEC desligado nos dois lados.
2. **Proxy do Cloudflare desligado (nuvem cinza) em todos os registros.** O painel
   insiste em recomendar proxy — ignorar. Com o Vercel atrás, proxy ligado quebra a
   emissão do certificado e empilha dois CDNs, que não somam.
3. **Entradas equivalentes, um só canônico:** o apex serve o site; `www.beaside.com.br`
   e `be-aside.com.br` redirecionam 308; `be-aside.vercel.app` continua servindo o
   mesmo deploy (previews). **Não é redirect do `.vercel.app` para o domínio novo** —
   os dois são portas para o mesmo lugar, e é o canonical que consolida o SEO.
4. **A base do domínio mora em dois lugares** — `conteudo/manifest.json` (`site.url`) e
   `scripts/seo-tags.js` (`BASE_URL`). Trocar nos dois. `seo-tags.js` é **idempotente**:
   só adiciona tag faltante, não corrige canonical já existente — na migração foi preciso
   substituir o domínio nas páginas antes de rodar o gerador.
5. **`robots.txt` não é gerado** — a linha `Sitemap:` é manual.
6. **CORS do Hub UTI** (`api/hub-plantao.js`) recebeu domínio próprio e `www`. Sem isso o
   sync do plantão bloqueia na origem assim que alguém abre `/hub-uti/` pelo domínio novo.
7. **`seo-tags.js` passou a ignorar diretórios ocultos** no walk: worktrees de agente
   (`.kilo/`) entravam no sitemap com URLs que não existem em produção.
8. **Clerk não precisou de nada** *(na época)*. A instância era Development.
   **Superado em 19/08/2026:** a virada para Production foi feita
   (`clerk.beaside.com.br`, `pk_live_`). Ver `hub-uti/REVISAO-19-08-2026.md`.
   Dois bloqueios que não estavam documentados em lugar nenhum e custaram caro:
   a Publishable Key **hardcoded** em `assets/auth-config.js` vencia a env var
   da Vercel e mandava todo login para a instância de dev; e o CSP de
   `/hub-uti/*` liberava só `*.clerk.accounts.dev` — e nunca teve o Supabase em
   `connect-src`, então o Hub em produção jamais falou com o Postgres.
9. **Página VTI** (`hemo/vti.html`) publicada junto. **Pendente: corrigir os esquemáticos.**
10. **Search Console ainda não configurado.** Sem ele não há como verificar se o Google
    absorveu a troca de canonical.

---

## O que **não** fazer

- **Não editar nada entre os marcadores `AUTO:conteudo`** (app.js, hubs, artigos, extract-knowledge, llms.txt) — a fonte é `conteudo/manifest.json` + `npm run build:content`.
- Não reintroduzir modo Plantão CSS do **guia** (sucessor = Hub UTI em `/hub-uti/`).
- **Não mover a `.navbar` para dentro do `.hub`** nem dar a ela `animation`/`opacity`/
  `transform` — é o que quebra o posicionamento fixo (ver sessão 28/jul).
- Não fazer o fundo da `.navbar` alternar com o scroll (o `backdrop-filter` falha na
  rolagem rápida) nem recriar elemento auxiliar de fundo separado.
- Não clarear o texto da nav para “recuar” hierarquia: reprova no contraste. Usar peso
  e corpo.
- Não editar o **bundle** `beaside/hub-uti/assets/*` à mão — publicar a partir do fonte Vite.
- **Não ligar o proxy do Cloudflare** (nuvem laranja) nos registros do domínio, por mais
  que o painel recomende: quebra o certificado do Vercel e empilha dois CDNs.
- Não trocar o domínio só em `seo-tags.js`: `conteudo/manifest.json` (`site.url`) é a
  outra fonte, e `robots.txt` é manual.
- Não aplicar o design system HTML do guia ao SPA (e vice-versa) sem pedido.
- Não tratar Hub UTI como página estática de módulo (`MODULE_PAGES` / `data-module`).
- Não voltar IBM Plex como UI principal do **guia**.
- Não voltar pills-cápsula como padrão de status no **guia**.
- Não usar SVG escuro fixo para quadrantes.
- Não usar `--accent` do hemo (vermelho) para “sucesso”/Q1.
- Não inventar anti-cópia como “segurança de venda”.
- Não editar `api/knowledge.js` à mão.
- Não commitar `CLERK_SECRET_KEY` / `sk_*`.
- Não trancar módulos do guia só com “estar logado” (gate = plano, quando existir).
- Não deixar `.pill-list` sem estilo (usar checklist DS ou `ind-grid` / `mat-grid`).
- Não reintroduzir flash de “Entrar” no hub (manter hint + boot síncrono).
- Não deixar card de login semi-transparente com grid “por dentro” (preferência: card opaco).
- **Hub UTI:** não reintroduzir a faixa de abas horizontal; não animar
  `grid-template-rows`; não pôr padding/borda no filho direto de contêiner
  colapsável; não deixar `:hover` sem `@media (hover: hover)`; não descer abaixo
  de 11px fora da exceção `.evo-info`; não transformar campo de indicador da alta
  em bloqueio de gravação.
- **Gráfico de BH:** não deslocar rótulo do eixo por coluna (as linhas são a
  mesma grade para todas — foi o que fazia a data encostar no chip vizinho);
  não inferir turno D/N pela ordem na lista (só janela de 12 h tem turno); não
  derivar a cápsula do chip de turno do texto com `color-mix` (as duas herdam a
  mesma luminância e o par some sob daltonismo); não declarar `--bh-pos`/
  `--bh-neg` dentro de `.bh-chart` (o snapshot fica fora e não resolve `var()`);
  não trocar o par do balanço por verde/vermelho.
- **Hub UTI, permanência de dispositivo:** não usar `--warm` para o dia acima do
  limite (é alias de `--destructive`, o vermelho de excluir, e o bloco diz
  explicitamente "não indica troca") — usar `--perm`/`--perm-at`; não separar
  atenção de excedido por `opacity` (mistura com o fundo e derruba o contraste
  abaixo de 4,5); não usar `--amber` do tema claro em faixa decorativa (foi
  escurecido para servir de texto e vira marrom-queimado).
- **Hub UTI, faixa de prévia da evolução:** não pôr teto em `overflow: hidden`
  sem rolagem — cortava silenciosamente 5 de 7 drogas e a faixa passava a
  afirmar um quadro clínico falso.
- **Hub UTI, discos de colapso:** não posicioná-los no meio da lista da nav (os
  vãos têm 3px e qualquer disco sobrepõe alvo clicável); não remover o
  `box-shadow` na cor do fundo (sem ele a divisória lê como linha quebrada); não
  devolver o toggle dos leitos para dentro do `<aside>` (tem `overflow: hidden`
  e o corta pela metade).
- Não remover o `DevSimulador` / `simular-plantao.mjs` — ficam versionados por
  decisão do usuário.
- Não responder dose, diluição ou conduta a partir do grafo do Graphify — abrir a fonte.
- Não commitar `graphify-out/`.
