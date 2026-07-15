# be·aside — guia para o Claude / agentes

Guia médico de UTI/emergência (pt-BR), consultado à beira do leito. Site **estático**
multi-módulo hospedado na Vercel (`https://be-aside.vercel.app`), com assistente de IA
opcional em Vercel Functions.

**Repo:** `github.com/joaohperes/beaside` · branch principal `main`  
**Produto (visão):** assinatura futura (~R$ 79,90 conteúdo / ~R$ 119–129 com IA); free = hub + teaser; domínio próprio ainda não definido (manter Vercel + domínio depois).

---

## Arquitetura

- **HTML estático puro.** Sem framework, sem build step, sem bundler. Cada página é um
  `.html` que carrega `assets/styles.css` e (nos módulos) `assets/app.js`.
- **Módulos** (pastas na raiz): `vm/`, `hemo/`, `neuro/`, `proc/`. Hub: `index.html` na raiz.
- **`assets/app.js`** monta o shell (header, sidebar, busca, tema, tabelas stackable) a partir
  de `MODULES` e `MODULE_PAGES`. **Página nova → registrar em `MODULE_PAGES`.**
- Cada `<body>`: `data-module="vm" data-page="sdra"` (accent + nav ativo).
- **`assets/styles.css`** — stylesheet global (tokens, shell, design system, light theme).
- **`assets/theme-boot.js`** — no `<head>` de **todas** as páginas; aplica tema salvo antes
  do paint (`localStorage` key `beaside-theme`).
- **Hub** (`index.html`) tem CSS e JS de tema próprios (não usa `app.js` no shell).
- **Login (Clerk, real):** `login.html` + `assets/auth.js` + `sso-callback.html`. E-mail/senha (+ verificação de código), Google OAuth testado; Apple desligado no UI (`OAUTH_APPLE: false`). Hub: **Entrar** ou chip nome + **Sair**. **Módulos abertos sem login** (gate futuro = plano/assinatura, não login sozinho).
- **Auth config:** `assets/auth-config.js` (`PUBLISHABLE_KEY` pk_* — pública) e env Vercel `CLERK_PUBLISHABLE_KEY` + `api/clerk-config.js`. **Não** commitar `sk_*`. App dev: `arriving-seasnail-55`.

### Arquivos-chave de assets

| Arquivo | Função |
|---------|--------|
| `assets/styles.css` | Design system, shell, mobile stack, light theme |
| `assets/app.js` | Shell, busca, tema, `prepareStackableTables` |
| `assets/theme-boot.js` | Anti-FOUC do tema |
| `assets/auth.js` / `auth-config.js` | Cliente Clerk (vanilla) |
| `login.html` / `sso-callback.html` | UI login + callback OAuth |
| `api/sugerir*.js` | Assistentes (senha compartilhada ainda) |
| `api/clerk-config.js` | Expõe só a publishable key |
| `api/knowledge.js` | Gerado — `npm run extract-knowledge` |

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

**Removido:** modo Plantão (botão header + `plantao-mode` CSS/JS) — defasado e não alinhado ao shell novo. Conteúdo clínico com a palavra “plantão” permanece.

---

## Assistente de IA (`api/`)

- `api/sugerir.js` (VM), `sugerir-hemo.js`, `sugerir-neuro.js`.
- Gate atual: senha `VMGUIDE_SENHA` (compartilhada) + `ANTHROPIC_API_KEY`.
- Knowledge: regenerar com `npm run extract-knowledge` após mudanças clínicas relevantes.
- **Auth (Clerk) — status jul/2026:** front E2E (login.html + hub chip + SSO callback + captcha + erros pt-BR). Dashboard: e-mail+senha; **username off**; Google SSO on; Apple off no UI. Confirmar no Clerk: Allowed origins/redirects = `localhost` + `https://be-aside.vercel.app`. `CLERK_SECRET_KEY` ainda **não** usada (só quando proteger API de IA).
- **Futuro (produto):** assinatura + cota de IA; gate por **plano**, não por login sozinho. Secret key só na Vercel se validar sessão no server.

---

## Deploy & git

- **Prod:** `npx vercel --prod --yes` (projeto `be-aside`, team `joaohperes-projects`).
- Fluxo prático recente: commit → push `main` → prod (usuário costuma pedir “deploy prod” após OK visual).
- Commits pt-BR: `tipo(escopo): descrição`.
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

## Histórico recente (sessão de produto UI — jul/2026)

Resumo do que foi estabilizado (não reverter sem pedido):

1. Shell premium + hub editorial; remoção do modo Plantão.
2. `hero-meta` restaurado sitewide; neuro no DS; polish landings.
3. Mobile: overflow containment; tabelas multi-col em **stack cards**.
4. Material em checklist; labels semânticos (fim dos chips); Inter + JetBrains Mono.
5. Light mode + View Transition + botão animado.
6. Hemo: VCI/fórmulas, RUSH qualificadores, SSC sem tooltips, quadrantes em matriz 2×2 com cores distintas.
7. **Auth Clerk** no front (login, OAuth Google, hub chip); módulos livres; assinatura/paywall ainda não.
8. Preço/produto e cota de IA: documentados, **não** implementados.

---

## O que **não** fazer

- Não reintroduzir modo Plantão CSS.
- Não voltar IBM Plex como UI principal.
- Não voltar pills-cápsula como padrão de status.
- Não usar SVG escuro fixo para quadrantes.
- Não usar `--accent` do hemo (vermelho) para “sucesso”/Q1.
- Não inventar anti-cópia como “segurança de venda”.
- Não editar `api/knowledge.js` à mão.
- Não commitar `CLERK_SECRET_KEY` / `sk_*`.
- Não trancar módulos só com “estar logado” (gate = plano, quando existir).
