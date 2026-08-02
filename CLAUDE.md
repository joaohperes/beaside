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

## Histórico recente

### Sessão produto UI (jul/2026 — anterior)

1. Shell premium + hub editorial; remoção do modo Plantão.
2. `hero-meta` restaurado sitewide; neuro no DS; polish landings.
3. Mobile: overflow containment; tabelas multi-col em **stack cards**.
4. Material em checklist; labels semânticos (fim dos chips); Inter + JetBrains Mono.
5. Light mode + View Transition + botão animado.
6. Hemo: VCI/fórmulas, RUSH qualificadores, SSC sem tooltips, quadrantes em matriz 2×2 com cores distintas.
7. Auth Clerk no front (base); módulos livres; assinatura/paywall ainda não.
8. Preço/produto e cota de IA: documentados, **não** implementados.

### Sessão 15/jul/2026 — auth E2E + polish clínico/UI

**Não reverter sem pedido.** Commits em `main` (resumo): `efe359d`…`e67ed70`.

#### Auth / produto conta

1. **Login ponta a ponta** endurecido: timeouts, erros pt-BR, `#clerk-captcha`, redirects, callback OAuth.
2. **Cadastro robusto:** nome + sobrenome, confirmar senha, checklist de força, maiúscula/símbolo, mín. **3** letras no nome; Apple oculto de verdade (CSS `display:none` sobre `hidden`).
3. **Validação ao digitar** nos campos (borda + mensagem sob o input).
4. **Login light ambient:** glow/grid no fundo; card **opaco** (grid só fora do formulário — preferência do usuário).
5. **Hub chip:** só **primeiro nome**; clique abre **menu** (nome completo, e-mail, Minha conta, Sair); topbar `z-index` alto para o menu receber clique.
6. **`conta.html`:** perfil/sessão/provedor; exige login; `?next=` no login para voltar.
7. **Sem flash de Entrar / buraco no topbar:** `beaside-auth-hint` no `localStorage` + script boot síncrono no `index.html` + confirmação Clerk.
8. Dashboard Clerk (manual): redirects `$DEVHOST /`, e-mail+senha, Google, captcha; paths Account Portal ok.

#### Conteúdo / design system

9. **PAI (`proc/pai.html`):** SVGs com tokens dark/light; cards over/under com cor das curvas + respiro; legendas fast-flush maiores; anotações PPV em alto contraste (não âmbar).
10. **Listas sitewide:** `.pill-list` estilizada como checklist do DS (antes sem CSS = bullets nativos).
11. **Respiro** `.hero-meta + .sec-lead` (não colar meta no lead).
12. **Indicações** em `ind-grid` onde havia two-col + info-box + ul (toracocentese, paracentese, dreno, drenagem, etc.).
13. Markup `hero-meta`/`sec-lead` normalizado em várias páginas **proc**.

#### Ainda pendente (próximas frentes)

- Gate por **plano** / paywall; cota de IA no guia.
- Clerk **production** (`pk_live_`) quando for produto fechado.
- Neuro: preencher stubs.
- ~~Domínio próprio~~ — **feito** (ago/2026, ver topo).
- Hub UTI: link opcional no hub principal (hoje URL direta + noindex); endurecer produto/PHI conforme uso real.

### Sessão jul/2026 — Hub UTI documentado no monorepo

1. Hub UTI reconhecido como **segundo produto** (SPA) ao lado do guia HTML.
2. Modo Plantão CSS do guia = **removido de propósito**; sucessor = `/hub-uti/`.
3. Agentes: não assumir “tudo é HTML estático”; ver seção Arquitetura acima.

### Sessão 23/jul/2026 — varredura e endurecimento do Hub UTI

**Não reverter sem revisar os invariantes clínicos e de privacidade acima.**

#### Segurança clínica e identidade

1. Evolução automática deixou de inventar achados normais; templates usam `[confirmar …]` e a documentação completa não preenche campos clínicos ausentes.
2. Setas genéricas de laboratório foram removidas do texto copiável para evitar interpretação clínica automática sem referência contextual.
3. Pacientes receberam `episodeId`/`occupiedAt`; conflito de nome não mescla dados e reocupação confirmada inicia episódio limpo.
4. Importação individual de laboratório bloqueia paciente incompatível; datas usam validação de calendário real.
5. Balanço hídrico manual inválido é rejeitado; o total oficial informado é preservado e discrepâncias ficam explícitas.

#### Persistência, privacidade e importação

6. Sync ganhou revisões, tombstones e resolução de concorrência; save local imediato, flush no `pagehide`, TTL de 12 h e limpeza nuvem→local.
7. Identificação breve/máscara, aviso de privacidade e lock por 15 min reduzem exposição de PHI no plantão.
8. Imagem/PDF agora têm prévia, confirmação e deduplicação; parser conservador; limites de 15 MB e 50 páginas.
9. Confirmações/alertas nativos foram substituídos por dialog acessível; tabs, foco, cópia e barra responsiva receberam correções.
10. A aba passou a se chamar **Sinais vitais + Balanço hídrico**; o snapshot aparece já no **Detectar**, antes de gravar, e sinais/BH usam cards no mesmo padrão visual do snapshot de Labs. Manter unidades com capitalização convencional (`mmHg`, `mg/dL`, `mL`, `°C`) e o card de pressão como `PAs x PAd`.
11. Labs e Sinais/BH usam fluxo explícito para vários leitos: o usuário seleciona **Vários leitos**, cria quantos cards precisar com `+ Paciente` e cola **exatamente um paciente por card**. Um texto com vários pacientes nunca deve trocar de modo nem montar/expandir cards automaticamente; a UI pede que o conteúdo seja separado. Cada card detecta `Paciente`/nome e `Leito`, mostra o destino previsto e todos são gravados na lateral com uma confirmação. Preservar a confirmação e o bloqueio de nomes divergentes no mesmo leito.
12. A lateral agrupa automaticamente pacientes nas unidades HRO: UTI 1 (`6601–6610`), UTI 2 (`6611–6620`), UTI 3 (`6621–6630`) e UTI 4 (`6631–6640`). Os quatro grupos iniciam expandidos, são recolhíveis individualmente, ordenam por leito e reabrem quando o paciente ativo pertence à unidade.
13. As máscaras `6601`, `66-01` e equivalentes são a mesma chave de leito apenas dentro da faixa HRO. O formato abreviado do G-HOSP usa o **segundo número**: `1-4` → `6604`, `1-11` → `6611`; a migração vale também para plantões já salvos. Outros identificadores continuam estritos. Pacientes sem unidade conhecida ficam em `Outros / sem unidade`. Capacidade local e sanitização da API = **40 pacientes**; plantões grandes exigem o backend KV já previsto, pois o fallback de metadata do Clerk continua limitado.

#### API, entrega e manutenção

14. `api/hub-plantao.js` passou a restringir CORS/origens autorizadas, sanitizar payload, limitar 1 MB, aplicar rate limit e preservar revisões/tombstones sem vazar `userId`/detalhes internos.
15. Headers Vercel adicionam CSP, anti-frame, `nosniff`, referrer/permissions policy; Hub continua `noindex`.
16. Tabs e PDF usam lazy loading; JS inicial caiu de ~729 KB/~219,5 KB gzip para ~243,6 KB/~76,2 KB gzip no build auditado.
17. Publicação do bundle virou atômica via `scripts/publish-beaside.js`; CI foi adicionado nos dois repositórios.
18. Validação atual: **136 testes/31 suítes** no fonte, **2 testes** da API, lint sem warnings, build Vite concluído e `dist/` idêntico a `beaside/hub-uti/`.
19. A evolução inclui automaticamente Labs em `#LABORATORIAL` e os fatos estruturados de SSVV/BH em `#EVOLUÇÃO CLÍNICA`, sem sobrescrever a narrativa manual. O intervalo do G-HOSP define `12h` ou `24h`; snapshots e texto usam `BH 12h/24h` e `Diurese 12h/24h`. O acumulado permanece disponível na tabela para auditoria, mas não entra no snapshot principal nem no texto evolutivo.
20. Tratamento infeccioso em vigência virou dado estruturado por episódio na aba **Antimicrobianos**:
    fármaco, dose, via, intervalo, início, foco/indicação, agente/cultura e observação/ajuste. A
    data de início calcula `D1`, `D2` etc. de forma inclusiva; presets nunca sugerem dose. O
    conteúdo é preservado no sync e entra automaticamente em `#TRATAMENTO INFECCIOSO`.
21. Direção de produto alterada: construir um workspace longitudinal próprio e mais integrado que
    o fluxo atual do EvClinic, sem clonagem de interface. O estado presente continua sendo núcleo
    de plantão (TTL 12 h) e não pode ser promovido a prontuário oficial antes de RBAC institucional,
    auditoria imutável, retenção/backup/exportação e governança LGPD.
22. O shell clínico foi redesenhado para não reproduzir a hierarquia crua do EvClinic: contexto
    `Hospital / Serviço / Unidade` ocupa a faixa superior inteira; identificação do paciente vem
    abaixo como ficha contínua; o painel de leitos tem 228 px e recolhe para 48 px; ações globais
    ficam no menu do painel, sem botões permanentes no rodapé. A ação do episódio se chama
    **Remover paciente** (não “Alta”) e deixa explícito que não registra alta clínica. A largura
    útil das abas vai até 1480 px. Evolução usa seções leves com contorno próprio; entidades
    repetíveis (invasões, drogas, antimicrobianos e imagem) usam linhas clínicas de largura total, com
    identificação à esquerda e campos em até quatro colunas — não mosaicos de cards.
23. **Culturas** ganhou aba estruturada própria: material, data da coleta, status, resultado/agente,
    sensibilidade e observação, além de notas livres compatíveis com plantões anteriores. A antiga
    aba “Infeccioso” agora se chama **Antimicrobianos**. Culturas e tratamento em vigência entram
    automaticamente na evolução, lado a lado, sem inferir colonização, infecção ou sensibilidade.
24. Na tela de evolução, a hashtag de cada seção aparece somente no texto copiável; o card exibe
    um único título e move explicações auxiliares para tooltips acessíveis. A grade usa pares
    clínicos em duas colunas e encerra com Conduta em largura total. Os modelos do HRO têm duas
    famílias: texto-base pronto para edição (`......`) e roteiro guiado (`[placeholders]`) para
    paciente sedado/VM e sem sedação. Ambos usam unidades padronizadas e não fixam achados normais,
    doses, RASS, pupilas ou suporte.
25. A faixa `Hospital / Serviço / Unidade` passou a começar no mesmo eixo horizontal do conteúdo
    clínico, respeitando a largura expandida ou recolhida da lateral. A área correspondente ao menu
    se chama **Painel · Contexto do plantão**.
26. Invasões, Drogas, Culturas e Antimicrobianos usam uma lista clínica compacta: cada item resume
    nome, taxa/data e texto evolutivo na mesma linha; somente o item selecionado expande o editor em
    quatro colunas. As prévias copiáveis dessas abas viraram faixas compactas, e explicações de uso
    ficam em tooltips no próprio título, sem ícone de interrogação/informação.
27. Pacientes podem ser arrastados na lateral e soltos sobre outra UTI. O destino é o primeiro leito
    livre daquela unidade; a operação não sobrescreve ocupação, bloqueia unidade cheia e mantém todos
    os dados do episódio. A ficha do paciente pode ser recolhida/expandida pela seta central. O upload
    de PDF usa superfície compacta, borda sólida e sem caixa tracejada; o texto redundante de destino
    do importador de SSVV/BH foi removido.

### Sessão 27–28/jul/2026 — BH gráfico, painel de leitos e seleção múltipla

**Publicado no beaside.** Não reverter sem revisar os invariantes abaixo.

1. **Numeração de leitos** migrada para `unidade-leito` (`1-01` … `4-10`) — é o formato que o
   G-HOSP/HRO passou a usar. `canonicalizeHroBedValue` converte e `storage.js` migra plantões
   salvos ao carregar, sem passo extra. **Invariante:** nos formatos com traço o SEGUNDO número
   é o leito GLOBAL 1–40 (`01-32` = 32º leito = UTI 4), não a posição na unidade; o primeiro
   número não é a unidade. Ler diferente aloca paciente na UTI errada.
2. **Gráfico de balanço hídrico** (`BhChart.jsx`) em SVG puro — sem lib, o bundle inicial é
   invariante de performance. Acumulado é a leitura principal (área + número-herói); o BH de
   cada período fica numa faixa de apoio com escala própria — nunca dois eixos no mesmo plot.
   Cores **azul (acúmulo) × âmbar (déficit)**, validadas em OKLab/CVD contra as duas superfícies
   (ΔE 23.8 dark / 24.2 light). **Não usar verde/vermelho:** sugere bom/ruim, e isso é falso —
   balanço positivo é esperado em ressuscitação, negativo pode ser hipovolemia. Sem faixa de
   alerta e sem interpretar: a leitura é do médico.
3. **Fechamentos de 12 h deixaram de se sobrescrever.** A chave do BH passou a ser data +
   horário de início (`bhEntryKey`); `findBhEntryIndex` atualiza registros antigos sem horário
   no lugar, em vez de duplicar. Lançamento manual ganhou seletor de turno (D/N) e assume o
   período que o leito já usa. Antes, um plantão de 12 h perdia metade dos fechamentos.
4. **Mover pacientes** virou modo seleção: caixas sempre visíveis, mover e remover em lote, e
   arrastar um item marcado leva a seleção inteira. `moveManyToUnit` no contexto é **atômico** —
   calcular vagas fora do `setState` dava a mesma vaga para todos. O leito vazio do destino é
   **permutado** com o de origem (não descartado), senão a unidade de origem encolhe e parece
   que os pacientes sumiram. Unidade cheia bloqueia e mantém a seleção para tentar outra.
5. A contagem por unidade mostra **ocupados**, não leitos criados (`3/10` = cabem mais 7).
   "Montar leitos" pergunta unidades × leitos.
6. **Culturas** e **Antimicrobianos** entram no sync: `api/hub-plantao.js` sanitiza os dois
   campos com limite próprio (40 tratamentos / 80 culturas), com teste de contrato.
7. Ficha do paciente fundida com Hospital/Serviço/Unidade (colapsam juntas) e validação de
   idade (0–130), peso (0,5–500 kg), data futura e admissão UTI ≥ hospitalar. Os contadores
   DH/D só aparecem com data válida.
8. Import de SSVV/BH **detecta sozinho** ao colar e ao digitar (debounce) — o botão "Detectar"
   saiu do modo paciente único. O modo "Vários leitos" mantém o seu, porque lá a revisão card a
   card é o ponto do fluxo.
9. Avisos viraram **toast** em portal (fora do fluxo da lateral, some em 4,5 s, com fechar).
   Cards clínicos abrem vários ao mesmo tempo. Invasões têm limite plausível por tipo
   (1 SVD/TOT/TQT/PAI/SNE/Diálise, 2 CVC/PICC/drenos, 4 AVP).

### Sessão 02/ago/2026 — Hub UTI: eixo do BH, janelas livres e par de cores

**Publicado** (`hub-uti@2c70f35` → beaside `6d1b11f`). Não reverter sem ler os
invariantes de cor e de grade abaixo.

#### Eixo do gráfico — invariante de grade

1. **As linhas do eixo X são fixas e iguais em todas as colunas**
   (`ROW_DATE`/`ROW_SUB`/`ROW_DUR` em `BhChart.jsx`). Antes cada coluna
   calculava a própria altura: quem tinha linha de duração subia a data 15 px e
   quem não tinha ficava embaixo — a data mais baixa encostava no chip de turno
   da coluna vizinha. **Não voltar a deslocar rótulo por coluna:** o eixo é uma
   grade, não cada coluna por si. Pelo mesmo motivo caiu o caso especial da
   data sozinha (descia 25 px), que era o mesmo defeito em outra forma.
2. Janela livre mostra **hora na linha do chip e duração abaixo**. `4h · 07:00`
   numa linha só encosta no vizinho quando a faixa está em `MIN_BAND` (46 px).

#### Turno D/N

3. **`buildLabels` não infere turno pela ordem na lista.** Um lançamento manual
   de 4 h não é "o turno diurno" por ser o primeiro do dia — rotulá-lo assim
   afirma uma divisão de plantão que o registro não tem. Sem turno de 12 h, o
   desempate é a **duração**. É a mesma regra que `turnoDe` já aplicava e que só
   o gráfico furava.
4. Como efeito colateral daquele fallback, o `<g>` sem classe de turno herdava o
   `fill` preto padrão do SVG e desenhava um **quadrado preto** no eixo.

#### Cores — o par do balanço e o do turno trocaram de lugar

5. **Balanço: azul (acúmulo) × tangerina (déficit)** — `#e08a52` dark /
   `#b8501a` claro. O âmbar anterior estava em **3.98** contra o fundo claro,
   abaixo do mínimo; a tangerina sobe para 5.00. Segue valendo o invariante
   original: **não usar verde/vermelho**, porque balanço positivo é esperado em
   ressuscitação e negativo pode ser hipovolemia — a leitura é do médico.
6. **Turno: âmbar (dia) × cinza neutro (noite).** A cápsula do tema claro é
   escurecida (`#f0cf85`) de propósito: com o âmbar direto o par D×N caía para
   1.19.
7. **A distinção D×N é por LUMINÂNCIA da cápsula**, nunca por matiz — cinza não
   tem matiz e o âmbar dessatura na direção dele sob deuteranopia (texto contra
   texto fica em 1.0–1.5, indistinguível). Medido: 1.38 claro / 1.56 escuro,
   mantendo 1.33/1.63 sob deuteranopia. **Por isso a cápsula é opaca e definida
   à mão:** derivá-la do texto com `color-mix` fazia as duas herdarem a mesma
   luminância e o par ia a 1.06.
8. A cápsula neutra tem **borda**: a 1.09 contra o fundo claro ela sumiria e só
   o D pareceria marcado.
9. `HUES` em `BhChart.jsx` **espelha** `--bh-pos`/`--bh-neg` do CSS porque
   gradiente SVG não resolve `var()` em `stopColor`. Mudou num lado, muda no
   outro.

#### Escopo de token — a causa de um bug que resistiu a três tentativas

10. **`--bh-pos`/`--bh-neg` moram no `:root`, não em `.bh-chart`.** Declarados
    no escopo do componente, o snapshot e o saldo do lançamento manual — que
    ficam **fora** daquele elemento — não resolviam `var()` e a cor simplesmente
    não aplicava. Tudo o mais verificava certo (classe no DOM, regra no CSS,
    ordem da cascata), o que fez o defeito ser confundido com cache duas vezes.

#### Leitura do hover e painel

11. O readout virou três níveis: **quando**, **BH do período** em destaque com a
    conta que o gerou, e o **acumulado** à parte por ser da outra faixa. Eram
    quatro grupos de mesmo peso, e nada dizia qual número era o da barra sob o
    cursor. Ganhos e perdas separados por `−`, que é a subtração que produz o
    valor ao lado.
12. `BAND_HEAD` reserva 34 px de cabeçalho no painel: "no período" colava no
    tick `+2.500` e os dois liam como um bloco só. O título ancora na **borda do
    painel**, não em `PAD_L` — alinhado à primeira barra ele lia como rótulo
    daquela barra.
13. `.clinical-import-panel` sem recuo lateral próprio: alinha com a coluna
    clínica. O recuo tinha sido introduzido ao corrigir o sangramento do
    textarea (elementos dentro de fragmento React não são filhos diretos e não
    recebiam a margem), e desalinhava o bloco inteiro.

#### Tabela

14. Cabeçalho **"Período · início"** e duração+hora numa leitura só
    (`12h desde 19:00`). Com janelas livres, a hora é o que distingue dois
    lançamentos do mesmo dia — sem ela, dois `12h` da mesma data ficam
    indistinguíveis.

#### Validação

15. **371 testes / 84 suítes** no fonte, lint sem warnings, build ok.
    Não verificado em navegador: **o tema escuro** — as cores foram medidas nos
    dois temas, mas só o claro foi visto em uso.

### Sessão 30–31/jul/2026 — Hub UTI: shell v4, calculadoras, relatório e alta

**Publicado no beaside.** Detalhe técnico e invariantes no fonte (`ARCHITECTURE.md`).

#### Shell v4 — o que mudou e por quê

1. Revisão de interface (skill `better-interface`) mediu **~312px de crômio
   permanente** antes da primeira linha clínica. Em laptop de 900px, 35% da tela
   em moldura, em todas as abas. Depois: **168px** — 144px viraram área clínica.
2. **A faixa de abas horizontal deixou de existir.** Navegação em coluna, com
   ícones, recolhível para 52px e com estado próprio (`hub-uti-wsnav-collapsed`),
   independente do painel de leitos. Motivo: com 8 itens e `scrollbar-width:none`
   havia scroll horizontal **sem indicação visual** — seções sumiam sem aviso.
3. **Ficha do paciente em uma linha** (leito, nome, dx, DH/D); os 12 campos abrem
   sob demanda. Identificação é dado de conferência, não de edição contínua.
   Pendência (nome repetido, idade inválida) mostra ponto âmbar **com a ficha
   fechada** — senão o aviso só existe para quem já foi olhar.
4. **Campos de 27px transparentes → 36px com borda em repouso**, hover e foco.
   Antes, "isto é editável" só se descobria clicando.
5. Flag `hubShell(false)` no console volta ao shell antigo (andaime de migração).

#### Invariantes de animação e layout — não reverter

6. **Não animar `grid-template-rows`** (0fr→1fr): é propriedade de layout, o
   navegador refaz a grade a cada quadro e engasga. A altura vem medida por
   `useCollapse` (ResizeObserver) e a transição roda entre valores concretos.
7. **Padding e borda do conteúdo colapsável na camada interna**, nunca no filho
   direto que anima — altura zerada não zera padding do filho, e os rótulos da
   grade ficavam à mostra com a ficha fechada.
8. **`visibility` dentro da transição**, mesma duração da altura. Fora dela
   alterna no primeiro quadro e o conteúdo some antes de terminar de fechar.
9. **Curva `cubic-bezier(0.22, 1, 0.36, 1)` a 260ms** — mais longa que 180ms mas
   percebida como mais rápida (30% do tempo cobre a maior parte do caminho).
   **Nunca `ease-in` em UI:** atrasa exatamente onde o olho está.
10. **Não animar troca de seção** (dezenas de vezes por plantão). `:active` com
    `scale(0.97)` só nos botões de ação.
11. **`:hover` sempre atrás de `@media (hover: hover) and (pointer: fine)`** — em
    tablet o hover dispara no toque e fica preso, simulando foco. A UTI usa tablet.

#### Tipografia

12. O CSS tinha **27 tamanhos distintos** (8; 8,5; 9; 9,5; 10; 10,5; 11; 11,5; 12…)
    e 56 declarações abaixo de 11px. Consolidado em **8 degraus com piso de 11px**
    (140 declarações reescritas). Exceção documentada: `.evo-info` a 9,5px — é o
    glifo dentro de um círculo de 16px, a caixa é do ícone.
13. Rótulo de campo saiu de **9px mono caixa-alta em `--text3` (4.11:1, reprovado)**
    para 11px caixa normal em `--text2` (6.22 dark / 7.04 light).
14. **Inputs a 16px em `pointer: coarse`** — abaixo disso o Safari amplia a página
    inteira ao tocar num campo e não desfaz. `tabular-nums` em valores que mudam.

#### Alta da UTI (novo)

15. Registro estruturado de desfecho, **distinto de "Remover do painel"** (que não
    afirma nada clínico). Base: campos do G-HOSP/EvClinic, mantidos para
    comparabilidade. Quatro divergências deliberadas:
    - **`destino` separado de `tipo`** — transferência para enfermaria e para outro
      hospital são desfechos opostos na reinternação; o EvClinic junta os dois.
    - **`readmissao`** — reentrada na mesma internação é indicador de alta precoce;
      sem marcar na saída não há como reconstruir (o episódio já saiu do painel).
    - **"Alta a pedido" ≠ "Evasão"** — decisão informada com termo versus saída sem
      alta. Peso legal diferente.
    - **Complicações marcáveis** (16 comuns em UTI) além do texto livre: "PAV",
      "pneumonia associada" e "pneumo assoc VM" digitados viram três categorias.
16. **Validação:** só barra o que contradiz fato (data futura, alta antes da
    admissão) ou esvazia a resposta ("sim" sem qual complicação). Campo de
    indicador vazio gera **aviso** e a alta grava — prender a saída do leito por um
    select vazio empurra a inventar valor, e aí o indicador fica pior que em branco.
17. Altas vivem em `state.altas` (plantão, não paciente), sobrevivem em
    `storage.js` e `api/hub-plantao.js` (limite 80, enum fechado, teste de
    contrato) e alimentam `desfechosDoTurno()`. **Não** calculam taxa de
    mortalidade: exige denominador longitudinal que o Hub não guarda.

#### Calculadoras clínicas (novo)

18. **SAPS 3 validado contra o artigo original** (`MorenoMetnitzSapsiii.pdf`,
    tabelas extraídas com pdfjs por coordenadas — estão rotacionadas). Dois erros
    achados assim: Glasgow tem **cinco** faixas (fontes secundárias colapsam 3-4
    com 5 e subestimam coma profundo em 5 pontos), e as **razões de admissão**
    estavam ausentes (subestimavam 5 pontos no caso testado; duas são negativas,
    com exclusão mútua entre arritmia −5 e convulsão −4).
19. **SOFA-1, SOFA-2** (JAMA 2025), CKD-EPI 2021 (expoente −1.209), Cockcroft-Gault
    e derivadas, com cálculo automático a partir de labs/sinais/invasões quando há
    dado. **Escore incompleto nunca vira número:** é piso ("≥ N"), nunca arredondado.
20. Tabelas travadas por teste de regressão contra a fonte — mexer num peso sem
    atualizar a referência quebra o build.

#### Pauta do Thiago (chefe da UTI) e relatório

21. Evolução como tela inicial; ida e volta entre a evolução e as abas que a
    alimentam; **alerta de permanência de dispositivo configurável pelo médico**
    (texto diz "revisar indicação", nunca "trocar" — CDC/HICPAC desaconselha troca
    rotineira por tempo); setor de origem no cadastro; **troca de leito digitando**.
22. **Relatório operacional** (censo, dispositivos a revisar, antimicrobianos,
    culturas, permanência, setor de origem) com export CSV. Relatórios gerenciais
    longitudinais (mortalidade, IRA vs hemodiálise) seguem **bloqueados** por
    decisão de LGPD/retenção — dependem de histórico pós-alta.
23. Edição inline de nome/leito no painel; **prevenção de nome e leito duplicados**
    com toast central; drag-and-drop solta no leito exato sob o cursor.

#### Copy e acessibilidade

24. Estados vazios pararam de citar nome de classe CSS ("chips", "preset") e
    passaram a nomear o lugar e o próximo passo. Erros instruem em vez de
    descrever o defeito ("Informe a idade em anos", não "Idade inválida").
25. Anéis de foco em `.tooltip-anchor` e `.labs-date-input` — eram focáveis
    (`tabIndex=0`) e invisíveis ao teclado. Tagline do header removida.
26. Diálogo de encerrar plantão passou a dizer **o que se perde** ("Não é possível
    desfazer"), não a ordem da exclusão.

#### Validação

27. **365 testes / 83 suítes** no fonte, **12** na API, lint sem warnings, build ok.
    JS inicial: ~90,8 kB gzip (era ~76,2 kB) — o crescimento é shell v4 +
    calculadoras + alta, todos no bundle inicial por serem shell/contexto.
28. **Não verificado em navegador:** as 140 mudanças de tamanho de fonte foram
    conferidas por análise e cálculo de contraste, sem browser headless no
    ambiente. Os dois casos de altura fixa que quebrariam foram detectados e
    corrigidos.

### Sessão 23/jul/2026 — conteúdo HSA no módulo Neuro

1. `neuro/avc-h.html` deixou de ser placeholder e passou a conter o manejo completo da **HSA aneurismática**, baseado no documento “Hemorragia Subaracnoide (HSA)” enviado pelo César.
2. A página segue o design system do módulo e cobre fisiopatologia, WFNS/Hunt–Hess/FOUR/Fisher modificado, padrões de imagem, primeiras 24 h, reversão de anticoagulação, nimodipino, DVE/crises, DCI/vasoespasmo e suporte sistêmico.
3. Curadoria clínica confrontada com AHA/ASA 2023 e NCS: não impor alvo universal de PAS antes da oclusão, não programar CTA/CTP em dias fixos para todos, não usar Hb `< 7 g/dL` como regra automática e não restringir água na hiponatremia da HSA.
4. `api/sugerir-neuro.js` foi alinhado à página: aneurisma preferencialmente ocluído em até 24 h, nimodipino enteral por 21 dias, DCI tratada com euvolemia/elevação pressórica apenas quando sintomática e proibição explícita de restrição hídrica.
5. A landing Neuro agora marca **8/12 páginas prontas** e habilita o card “Hemorragia subaracnóidea”; o registro do módulo em `assets/app.js` usa o título e subtítulo novos.

#### Clerk Production — standby

19. O Hub rejeita `pk_test_` fora de localhost e não possui fallback hardcoded; SDK Clerk está fixado em `6.25.6`.
20. Migração para `pk_live_`/`sk_live_` estava em standby por falta de domínio próprio. **O bloqueio caiu em ago/2026** (`beaside.com.br` com DNS no Cloudflare), mas a migração **não foi feita** — segue pendente, e não é urgente enquanto não houver assinatura.
21. Ao retomar: criar/ativar a instância Production no Clerk, adicionar os CNAME (`clerk.beaside.com.br` etc.) no Cloudflare **com proxy desligado**, refazer OAuth, atualizar as duas envs a partir da mesma instância e redeployar. **Atenção:** dev e prod são bases de usuário separadas — as contas da instância dev **não migram**.

### Sessão 28/jul/2026 — barra de navegação fixa e demo do assistente

**Publicado (`a05092a`).** Não reverter sem ler os invariantes de estrutura abaixo.

1. **A `.topbar` virou `.navbar`, filha direta do `<body>`.** Dentro do `.hub` nenhuma
   solução com `position:sticky` se sustentava: o container é `flex column` com contexto
   de empilhamento próprio, e a barra tinha `animation:rise`, cujo `transform` preenchido
   (mesmo `none`) cria containing block — o que também quebra `position:fixed` de
   descendentes. **Invariante:** a barra precisa ficar fora do `.hub`, sem ancestral com
   `overflow`, `transform`, `opacity` ou `flex`. Movê-la de volta para dentro reintroduz
   os sintomas (barra rolando embora, deslocamento lateral, faixa transparente).
2. **O fundo da barra é constante** (62 %, `blur(14px)`), sem alternar com o scroll.
   Alternar transparente↔opaco era o que falhava na rolagem rápida: o `backdrop-filter`
   não recompõe a tempo e a faixa pisca sem acabamento. **Não reintroduzir classe de
   estado tipo `is-scrolled`** — sem estado para trocar, não há o que quebrar.
3. **Nada de elemento auxiliar de fundo.** Uma tentativa anterior usou um `.topbar-bg`
   separado; como o `.hub` cria contexto de empilhamento, ele ou cobria o conteúdo da
   barra (clicável e invisível) ou ficava atrás dele (barra transparente). O `background`
   é da própria `.navbar`.
4. **Nav em Inter 13 px**, não mono: em mono, "Central de Conhecimento" esparrama pela
   largura fixa por caractere. O item institucional recua por **peso e corpo**, nunca por
   cor — `--text3` dá 2,8:1 nos dois temas, contra o mínimo de 4,5:1.
5. **Texto da nav em `#4a5263` no tema claro.** Com a barra translúcida, o que passa por
   baixo altera o contraste: o verde do hero derrubava `--text2` para 4,1:1. Ao mexer na
   opacidade da barra, **remedir** — a cor do texto acompanha.
6. **Sublinhado da seção lida** (`#central`, `#raciocine`, `#consulte`). O script fica no
   **fim do `<body>`**: antes das seções, `getElementById` devolve `null` e nada liga.
   "Central de Conhecimento" participa mesmo apontando para `/artigos/` — o sublinhado diz
   onde o leitor está, não para onde o link leva. `.area-head` tem `scroll-margin-top`,
   senão o clique na nav para com o cabeçalho atrás da barra.
7. **Aplicada em 11 páginas:** home, hub de artigos, 8 artigos, `login.html`, `conta.html`.
   O CSS mora em `assets/landing.css`, que as 9 primeiras já compartilhavam; login e conta
   não o carregam e têm a regra local (com comentário apontando para a fonte). **Módulos
   ficam de fora** — shell próprio em `assets/styles.css`, com sidebar e busca ⌘K.
8. **Demo do assistente (hero da home):** a bolha da pergunta tinha `#141a22`/`#fff`
   cravados, sem variante clara — virava bloco preto no card branco. Agora usa tokens da
   paleta com borda (a separação contra o card branco é de só 1,23:1). A máscara de fade
   do viewport atravessava a bolha parada no topo; o respiro vem do `padding-top` da
   thread (= altura do fade), **não** de encurtar o degradê, que ainda precisa valer para
   o que sobe no scroll.
9. **A resposta da demo nasce oculta** e entra junto com os três pontinhos; o `min-height`
   caiu de 74 px para 20 px. Antes, um retângulo vazio esperava na altura final enquanto o
   usuário "digitava" — o layout entregava que a resposta já estava pronta. `reduceMotion`
   tratado à parte, senão o bloco ficaria invisível para sempre.
10. **Home:** o link "Assistente IA" saiu dos cards de VM, hemo e neuro. Era fóssil de
    quando cada módulo tinha o seu — proc e peri nunca ganharam, então a home sugeria que
    dois módulos não tinham IA. Os cinco apontavam para o mesmo `/consulte/`.

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
8. **Clerk não precisou de nada.** A instância é Development: detecta o host em runtime,
   sem lista de origins. Login funcionou no domínio novo sem configuração. Production
   (`pk_live_`) segue pendente — ver seção própria.
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
- Não responder dose, diluição ou conduta a partir do grafo do Graphify — abrir a fonte.
- Não commitar `graphify-out/`.
