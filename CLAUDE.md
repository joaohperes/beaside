# be·aside — guia para o Claude / agentes

Duas frentes no **mesmo** deploy Vercel (`https://be-aside.vercel.app`), com stacks **diferentes**:

| Frente | O quê | Stack | Path prod |
|--------|--------|--------|-----------|
| **Guia be·aside** | Conteúdo clínico UTI/PS à beira do leito | HTML estático puro | `/`, `/vm/`, `/hemo/`, … |
| **Hub UTI** | Ferramenta de plantão multi-leito (labs, SSVV+BH, invasões, drogas, evolução) | SPA React (Vite) | `/hub-uti/` |

**Repo de deploy:** `github.com/joaohperes/beaside` · branch `main`  
**Fonte do Hub UTI (dev/build):** pasta irmã `~/hub-uti` (ou path local equivalente) — o build é **publicado** em `beaside/hub-uti/` (artefatos, não editar o bundle à mão).  
**Produto guia (visão):** assinatura futura (~R$ 79,90 conteúdo / ~R$ 119–129 com IA); free = hub + teaser; domínio próprio ainda não definido.

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
- **Sessão no hub (sem FOUC):** hint `localStorage['beaside-auth-hint']` + boot síncrono no topbar do `index.html` (chip otimista); `auth.js` confirma com Clerk.

### 2) Hub UTI — SPA React (segundo produto)

- **URL:** `https://be-aside.vercel.app/hub-uti/` · headers `X-Robots-Tag: noindex, nofollow` (`vercel.json`).
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

- **Produto:** apoio ao plantão (import laudo/SSVV, painel de leitos, copiar evolução no padrão de prontuário). **Não** é prontuário oficial nem “EvClinic”.
- **Identidade do paciente:** leito (+ nome/iniciais conforme UI atual); regra de leito em `patientImport.js` (nunca auto-ocupar vaga errada; conflitos explícitos).
- **Integridade clínica:** texto automático de evolução só pode usar fatos efetivamente registrados; achados ausentes permanecem como campos `[confirmar …]`. Não reintroduzir preenchimento automático de exame físico “normal” nem setas genéricas de laboratório.
- **Episódio assistencial:** cada ocupação tem `episodeId`/`occupiedAt`. Nome conflitante exige confirmação e, quando forçado, inicia reocupação limpa — nunca mesclar silenciosamente dados de pacientes diferentes.
- **Concorrência/sync:** estado usa revisões e tombstones; salvamento local é imediato, flush no `pagehide`, expiração local em 12 h e resolução de conflito pelo servidor. Ao limpar, excluir a nuvem antes do estado local.
- **PHI:** minimizar; ferramenta de plantão, não EHR.
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

- **Auth (Clerk) — status jul/2026:** front E2E no guia (login + hub chip + `conta.html` + SSO + captcha + erros pt-BR). Dashboard: e-mail+senha; **username off**; Google SSO on; Apple off no UI. Origins/redirects: `localhost` + `https://be-aside.vercel.app`.
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

## Checklist ao adicionar página de conteúdo

1. HTML com `data-module` / `data-page`, links de assets e **theme-boot.js**.
2. Registrar em `MODULE_PAGES` em `app.js`.
3. Usar `.page-head`, design system, `.table-wrap`, labels semânticos (não chips).
4. Se meta-resumo: `.hero-meta` com `cols-2`/`cols-3` conforme nº de itens.
5. Landing do módulo: card + contagem se necessário.
6. Conteúdo clínico relevante → `npm run extract-knowledge`.
7. Testar mobile (tabelas stack) e toggle dark/light.

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
- Domínio próprio.
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
18. Validação atual: **112 testes/24 suítes** no fonte, **2 testes** da API, lint sem warnings, build Vite concluído e `dist/` idêntico a `beaside/hub-uti/`.

### Sessão 23/jul/2026 — conteúdo HSA no módulo Neuro

1. `neuro/avc-h.html` deixou de ser placeholder e passou a conter o manejo completo da **HSA aneurismática**, baseado no documento “Hemorragia Subaracnoide (HSA)” enviado pelo César.
2. A página segue o design system do módulo e cobre fisiopatologia, WFNS/Hunt–Hess/FOUR/Fisher modificado, padrões de imagem, primeiras 24 h, reversão de anticoagulação, nimodipino, DVE/crises, DCI/vasoespasmo e suporte sistêmico.
3. Curadoria clínica confrontada com AHA/ASA 2023 e NCS: não impor alvo universal de PAS antes da oclusão, não programar CTA/CTP em dias fixos para todos, não usar Hb `< 7 g/dL` como regra automática e não restringir água na hiponatremia da HSA.
4. `api/sugerir-neuro.js` foi alinhado à página: aneurisma preferencialmente ocluído em até 24 h, nimodipino enteral por 21 dias, DCI tratada com euvolemia/elevação pressórica apenas quando sintomática e proibição explícita de restrição hídrica.
5. A landing Neuro agora marca **8/12 páginas prontas** e habilita o card “Hemorragia subaracnóidea”; o registro do módulo em `assets/app.js` usa o título e subtítulo novos.

#### Clerk Production — standby

19. O Hub rejeita `pk_test_` fora de localhost e não possui fallback hardcoded; SDK Clerk está fixado em `6.25.6`.
20. Migração para `pk_live_`/`sk_live_` está **em standby**: Clerk Production exige domínio próprio com controle de DNS e `*.vercel.app` não serve. Até existir domínio próprio, não trocar prefixos manualmente nem criar credenciais fictícias.
21. Ao retomar: conectar domínio próprio ao Vercel, criar/ativar a instância Production no Clerk, configurar DNS/certificados/OAuth, atualizar as duas envs a partir da mesma instância e redeployar.

---

## O que **não** fazer

- Não reintroduzir modo Plantão CSS do **guia** (sucessor = Hub UTI em `/hub-uti/`).
- Não editar o **bundle** `beaside/hub-uti/assets/*` à mão — publicar a partir do fonte Vite.
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
