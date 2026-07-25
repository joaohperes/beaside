# be·aside — PROJECT_STATUS · Esteira de Produção do SaaS

> **O que é este documento.** É o mapa mestre do be·aside — a "esteira de produção" que o Cesar
> pediu para nunca perder o foco do que transforma o projeto num SaaS de verdade. Toda decisão,
> fase, conteúdo e regra vive aqui. Se o Cesar (ou uma IA ajudando) se perder no meio do caminho,
> **volte para este documento**. Ao fim de cada etapa: marcar o que foi feito, registrar decisões,
> apontar a próxima etapa. Nada de plano solto em conversa — se não está aqui, se perde.
>
> Companheiros deste doc (ler junto): `ROADMAP.md` (resumo curto que aponta para cá),
> `PERGUNTAS-DE-PLANTAO-BANCO.md` (banco completo de perguntas = backlog de conteúdo),
> `CLAUDE.md` (arquitetura técnica do repo) e o skill `be-aside-visual-identity` (identidade).
>
> _Criado em 24/07/2026 · branch `content/artigos-clinicos` · fonte: briefing "GEO SEO.pdf" do Cesar._

---

## 0. Norte do projeto (LEMBRE SEMPRE)

**Objetivo:** transformar o be·aside numa plataforma de **raciocínio clínico, consulta prática e
apoio à decisão** para quem cuida de paciente crítico — residentes, clínicos, intensivistas,
emergencistas, médicos de enfermaria/PS/UTI. Meta declarada do Cesar: um **SaaS sustentável e
comercialmente forte**, construído passo a passo, sem perder nada do que já foi produzido.

**O be·aside NÃO é:** um repositório de protocolos, uma coleção de doses, um chatbot, uma
biblioteca genérica de artigos, nem um curso tradicional.

**O diferencial é ajudar o médico a:** organizar o raciocínio diante do paciente crítico,
interpretar dados clínicos/fisiológicos, entender o *mecanismo* por trás das alterações,
identificar o que realmente muda a conduta, escolher intervenções com propósito, reavaliar a
resposta, transformar diretriz em decisão à beira do leito, e discutir casos com apoio de IA.

**Linguagem:** médica, profissional, prática — para quem já tem formação clínica.

**Regra de ouro do processo:** não reconstruir do zero; preservar e incorporar tudo que já existe;
avançar de forma incremental; **apresentar auditoria + plano + arquivos a modificar e aguardar
aprovação do Cesar antes de qualquer alteração estrutural importante**; a cada etapa finalizada,
lançar no branch.

---

## 1. As TRÊS áreas (arquitetura de informação da plataforma inteira)

Toda a navegação, conteúdo, SEO, GEO, conversão e uso de IA se organizam em **três áreas** — e só
três no menu principal (evitar excesso de categorias):

### 1) Central de Conhecimento — *artigos, GEO/SEO, porta de entrada*
Área de artigos que responde dúvidas reais e frequentes de plantão (rounds, PS, enfermaria, UTI) e
publica conteúdos que posicionam o be·aside no mercado (ex.: "atualização da Surviving Sepsis 2026",
"atualização de TEP"). É a principal **porta de entrada por busca** — Google, ChatGPT, Gemini,
Claude, Perplexity e outros.
- Conteúdo escrito e **armazenado no próprio site** (não depende da API de IA para exibir) →
  economiza tokens e permite resposta rápida, confiável, indexável.
- Sub-organizada por tema clínico: Ventilação Mecânica, Hemodinâmica, Choque, Neurocrítico,
  Medicamentos, Antimicrobianos, Distúrbios Metabólicos, e outros temas futuros.
- Rota atual: `/artigos/`. Hoje: 8 artigos (rascunho). Backlog: `PERGUNTAS-DE-PLANTAO-BANCO.md`.

### 2) Raciocine — *núcleo educacional e principal diferencial*
Reúne e organiza os conteúdos que **já existem** (VM, Hemodinâmica, Choque, Neurocrítico) como
**módulos de raciocínio aplicados à prática** — não como artigos isolados nem lista de protocolos.
Ensina o médico a interpretar o paciente, organizar o problema e chegar à decisão. Foco em explicar:
por que a alteração aconteceu, qual mecanismo fisiopatológico, quais dados observar, como interpretar,
hipóteses prováveis, diagnósticos graves a não perder, qual intervenção faz sentido, como saber se
funcionou, próximo passo.
- Rotas atuais: `/vm/`, `/hemo/`, `/neuro/`, `/proc/` (os "guides"). **~71 páginas de conteúdo já
  prontas** — este é o maior ativo do projeto.
- Grande parte do aprendizado funciona **sem IA**; a IA complementa, não é obrigatória.

### 3) Consulte e Resolva — *o Assistente de IA (RAG sobre o próprio site)*
Área única onde a IA acessa o conteúdo validado do be·aside como banco de dados (RAG) para discutir
casos individualizados: ajustar VM, discutir padrões de choque, doses, condutas. API para assinantes.
- Já existe scaffolding: `api/sugerir.js`, `api/sugerir-hemo.js`, `api/sugerir-neuro.js`,
  `api/knowledge.js` (base de conhecimento extraída, ~69KB), `scripts/extract-knowledge.js`,
  assistentes por módulo (`vm/assistente.html`, `hemo/assistente.html`, `neuro/assistente.html`),
  auth via Clerk (`@clerk/backend`), Anthropic SDK.
- **Estratégia de tokens:** "Conteúdo validado primeiro. IA quando houver necessidade de integração
  clínica." Pergunta simples já respondida em artigo → serve o conteúdo estático, sem chamar o LLM.
  Caso individualizado (múltiplos dados a integrar) → aciona a IA, que recebe apenas os trechos
  internos relevantes.

**Jornada integrada (exemplo real do briefing):** médico busca "como ajustar PEEP na SDRA" → cai num
artigo da Central de Conhecimento → artigo linka o módulo de ventilação protetora no Raciocine →
médico entende o mecanismo → tem um caso específico → leva ao Consulte e Resolva → IA integra os
dados e discute → recebe links para continuar estudando. *A consulta rápida atrai. O Raciocine
diferencia. A IA aplica.*

---

## 2. Auditoria do site atual (o que existe HOJE — 24/07/2026)

Inventário real do repositório `github.com/joaohperes/beaside`, branch `content/artigos-clinicos`.

### 2.1 Estrutura de pastas
```
/ (raiz)         index.html, login.html, conta.html, sso-callback.html, CLAUDE.md, ROADMAP.md,
                 package.json, vercel.json
/artigos/        Central de Conhecimento — hub + 8 artigos (rascunho)
/vm/             Raciocine · Ventilação Mecânica — 21 páginas
/hemo/           Raciocine · Hemodinâmica & Choque — 18 páginas
/neuro/          Raciocine · Neurocrítico — 13 páginas
/proc/           Raciocine · Procedimentos — 19 páginas
/institucional/  sobre, equipe, metodologia, seguranca-ia (4 páginas)
/api/            Serverless (Vercel): sugerir*.js, knowledge.js (RAG), hub-plantao.js, clerk-config.js
/assets/         app.js (shell do Guia), styles.css (design system Guia), landing.css (produto),
                 auth.js, auth-config.js, theme-boot.js, favicons
/hub-uti/        App separado, GATED (noindex) — área logada/experimental
/scripts/        extract-knowledge.js (gera a base RAG)
/.github/        workflows (CI)
```
Total: **90 arquivos .html**.

### 2.2 Conteúdo por módulo (Raciocine — já organizado por categoria de raciocínio)
- **VM (`/vm/`)** — Fundamentos (fisiologia, modos, parâmetros), Farmacologia (indutores,
  sedoanalgesia), Patologias (SDRA, prona, DPOC/asma, hipercapnia, TCE), Monitorização & Segurança
  (complicações, capnografia, dissincronia, BNM), Desmame (SAT/SBT/extubação, VNI/alto fluxo),
  Referência (calculadora, tabelas), Pearls & Pitfalls (pearls, quiz), Assistente IA.
- **Hemo (`/hemo/`)** — fisio, drogas, do2, dpco2, scvo2, quadrantes, vci, rush, padroes, integracao,
  pratica, fluxograma, ecg, calc-hemo, siglas, pearls, assistente.
- **Neuro (`/neuro/`)** — fisio, avc-i, avc-h, tce, enc, metabolico, pos-op, sedoanalgesia, vm,
  calc-neuro, pearls, assistente.
- **Proc (`/proc/`)** — vias-aereas, iot, vad, io, acessos, cvc, pai, linha-arterial, swan, pl,
  toracocentese, dreno, drenagem, paracentese, traqueo, monitorizacao, ritmo, pearls.

Cada módulo tem: header/sidebar/footer **injetados por `assets/app.js`** (`MODULE_PAGES` +
`data-module`), cor por módulo, calculadoras, quiz interativo, e assistente IA. **Não reescrever
esses shells à mão** — ver skill de identidade visual.

### 2.3 Central de Conhecimento (`/artigos/`) — 8 artigos em RASCUNHO
Template completo (JSON-LD `FAQPage`, resposta direta + mecanismo + conduta + referências + CTA +
aviso de rascunho). Lista: perguntas-plantao-hemodinamica, medidas-gerais-neurocritico,
hipotensao-pos-intubacao, peep-alta-queda-pressao, dissincronia-paciente-ventilador,
shiley-saiu-decanulacao-acidental, rebaixamento-consciencia-paciente-ventilado, sepsis-2026-o-que-mudou.
**Todos aguardam revisão clínica do Cesar** antes de tirar o aviso de rascunho.

### 2.4 Consulte e Resolva (IA) — scaffolding presente
Endpoints `api/sugerir*.js` por módulo, base RAG `api/knowledge.js` (gerada por
`scripts/extract-knowledge.js` a partir do conteúdo do site), auth Clerk, hub-plantao. A arquitetura
"IA usa o site como banco de dados" **já começou** — falta unificar numa área só e implementar o
roteamento intenção→(estático|IA).

### 2.5 Home (`index.html`)
Hero com chat simulado (streaming, altura fixa), bento com card retangular "Central de Conhecimento"
+ VM/Hemo/Neuro/Proc, values, autores, footer. **`<style>` inline próprio — NÃO carrega
`assets/landing.css`** (ver §7 Convenções).

### 2.6 O que está pronto / parcial / planejado
| Item | Estado |
|---|---|
| Guias VM/Hemo/Neuro/Proc (Raciocine) | ✅ substancial (~71 páginas) |
| Calculadoras por módulo | ✅ existem |
| Quiz interativo por módulo | ✅ existe |
| Assistentes IA por módulo + base RAG | 🟡 parcial (existe, falta unificar/rotear) |
| Central de Conhecimento (artigos) | 🟡 8 em rascunho, falta escalar + revisar |
| Institucional (sobre/equipe/metodologia/segurança IA) | ✅ existe |
| Auth (Clerk) / login / conta | ✅ existe |
| Navegação unificada das 3 áreas | ❌ não existe (home é bento de módulos) |
| SEO técnico: robots.txt / sitemap.xml / llms.txt | ❌ **ausentes** |
| Schema além de FAQPage (Organization/Person/Breadcrumb/MedicalWebPage) | ❌ ausente |
| Datas de publicação/revisão visíveis + autoria nos artigos | 🟡 parcial |
| Modelo editorial centralizado (fonte única de doses/diluições) | ❌ não existe |
| Busca interna (textual/semântica) | ❌ não existe |
| Google Search Console / analytics | ❌ não configurado |

### 2.7 Problemas / riscos conhecidos
- **CSS duplicado** home ↔ landing.css (`index.html` tem `<style>` inline próprio) — armadilha
  recorrente; qualquer classe nova na home entra nos dois lugares (ver §7).
- **Sem infra de SEO/GEO** (robots/sitemap/llms) → conteúdo bom não é encontrado nem citado por IA.
- **Doses/diluições espalhadas** em várias páginas sem fonte única → risco de divergência (o
  briefing pede modelo editorial centralizado).
- **Dois chats de IA** na mesma branch → checar `git log`/`status` antes de cada commit.
- **`git push` é manual do Cesar** (a ponte da IA não tem rede).

---

## 3. Arquitetura proposta (a validar com o Cesar antes de executar)

Objetivo: **menu principal com 3 áreas**, temas clínicos organizados dentro do Raciocine, sem
competir com as 3 áreas centrais. Preservar todas as URLs atuais (redirável quando necessário).

```
be·aside
├── Central de Conhecimento        (/artigos/)         ← porta GEO/SEO
│   ├── Ventilação Mecânica
│   ├── Hemodinâmica & Choque
│   ├── Neurocrítico
│   ├── Medicamentos & Doses
│   ├── Antimicrobianos
│   ├── Distúrbios Metabólicos
│   └── Outros temas
├── Raciocine                       (/vm/ /hemo/ /neuro/ /proc/  → agrupados)
│   ├── Ventilação Mecânica         (/vm/)
│   ├── Hemodinâmica & Choque       (/hemo/)
│   ├── Neurocrítico                (/neuro/)
│   ├── Procedimentos               (/proc/)
│   └── Futuros temas
└── Consulte e Resolva              (assistente unificado + /api/)
    ├── Discutir caso clínico
    ├── Ajustar ventilação mecânica
    ├── Interpretar hemodinâmica
    ├── Discutir choque
    └── Discutir neurocrítico
```

**Princípio de preservação de URLs:** antes de mexer em qualquer rota existente, checar se está em
uso, se tem conteúdo vinculado, se pode ser indexada, se precisa ser preservada, e se exige
redirect 301. As rotas `/vm/`, `/hemo/`, `/neuro/`, `/proc/`, `/artigos/` **ficam** — o que muda é
como o menu principal as agrupa (as 3 áreas viram a navegação de topo; os módulos passam a ser
"filhos" visuais do Raciocine, sem trocar de pasta).

**Arquivos que a Fase 2 (navegação) provavelmente tocaria:** `index.html` (nav/hero/bento),
`assets/landing.css` + `<style>` inline (estilos da nav), possivelmente `assets/app.js` (se a nav
das 3 áreas for injetada como o shell dos guias). Nenhuma exclusão de conteúdo. **Aguardar aprovação.**

---

## 4. Modelo editorial (fonte única para escalar sem quebrar)

Cada conteúdo (artigo, módulo, caso, fluxograma, calculadora, tabela) descrito por campos padrão,
para adicionar/atualizar sem editar vários arquivos à mão e sem divergência de doses:

`titulo · slug · area (Central|Raciocine|Consulte) · tema clinico · tipo · resumo · resposta rapida ·
conteudo completo · palavras-chave · perguntas relacionadas · sinonimos · links internos · autor ·
revisor · referencias · data publicacao · data ultima revisao · proxima revisao · status editorial ·
versao · historico · nivel de acesso · CTA contextual · metadados SEO · dados estruturados ·
conteudos relacionados · avisos de seguranca · observacoes internas`

**Tipos de conteúdo:** Pergunta de Plantão · Módulo Raciocine · Caso clínico · Caso interativo ·
Fluxograma · Calculadora · Tabela · Checklist · Atualização de diretriz · Interpretação de exame ·
Prescrição · Conteúdo de apoio para IA.

**Regra:** informações repetidas (doses, diluições, unidades, ajustes) vêm de **fonte
centralizada** para evitar divergência entre páginas.

### Estrutura padrão de um artigo (Central de Conhecimento)
Título em formato de pergunta clínica → **resposta direta no início** → resumo em 30s → contexto
clínico → quando indicar → quando evitar/cautela → dose (quando aplicável) → via → diluição →
preparo → conversão para mL/h → ajustes por peso → ajustes renal/hepático → modelo de prescrição →
monitorização → efeitos adversos → erros comuns → exemplo clínico breve → situações especiais →
conteúdos relacionados → referências → autor → revisor → data de publicação → data da última revisão.
A resposta principal aparece **imediatamente** (crítico no celular).

---

## 5. Estratégia SEO + GEO (otimizar para busca E para citação por IA)

Fonte de verdade única para os fundamentos (pesquisa de 24/07 + briefing):

**SEO técnico (Fase 0 — barato, destrava tudo):** URLs curtas/semânticas, slugs consistentes, meta
title/description exclusivos por página, canonical, **sitemap.xml**, **robots.txt** liberando
crawlers de IA (GPTBot, ClaudeBot, PerplexityBot, Google-Extended), **llms.txt**, breadcrumbs,
hierarquia correta de H1/H2/H3, conteúdo principal no HTML inicial (SSR/estático), Core Web Vitals,
imagens otimizadas, Open Graph, páginas 404 úteis, redirecionamentos, controle de duplicado, links
internos, datas de publicação/atualização, autoria/revisão, Google Search Console, métricas.

**GEO (ser citado por ChatGPT/Gemini/Claude/Perplexity):** pergunta clínica clara no título →
resposta objetiva no 1º bloco → resumo em linguagem médica natural → seções bem delimitadas →
frases completas → siglas explicadas na 1ª ocorrência → doses com unidade/via/frequência → contexto
e população definidos → limitações explícitas → separar recomendação × evidência × adaptação prática
→ diretriz e ano identificados → referências próximas das recomendações → declarar controvérsia →
autoria/revisão/data → consistência terminológica → links entre conteúdos → estrutura que permite
extrair um trecho sem perder contexto. **Não** escrever texto artificial só para robô; a otimização
vem de conteúdo médico bem estruturado, autoral, confiável e atualizado.

**Táticas com impacto medido (guia GEO 2026):** fontes nomeadas no texto (+40% visibilidade),
números com fonte/data (+37%), citação de guideline com crédito (+30%), terminologia precisa (+28%).

**Brecha estratégica do nicho:** os gigantes em pt-BR (Whitebook/Afya, UpToDate, Medscape) são
**app/paywall/inglês** → IAs não conseguem citá-los. Conteúdo aberto, referenciado, em português,
com autoria médica, tem a pista quase livre para virar a fonte citada.

**Não usar (penalizado):** texto oculto, páginas invisíveis, repetição artificial de palavra-chave,
conteúdo automático de baixa qualidade, páginas quase idênticas, criação indiscriminada de URLs,
estratégias manipulativas. Todo conteúdo indexável deve ser visível, útil e clinicamente relevante.

---

## 6. Estratégia de economia de tokens (Consulte e Resolva)

Princípio: **"Conteúdo validado primeiro. IA quando houver necessidade de integração clínica."**

Preparar/implementar: busca textual interna · busca semântica · sugestões durante a digitação ·
recuperação de artigos sem LLM · banco estruturado de doses/diluições · calculadoras locais ·
fluxogramas pré-programados · casos interativos sem IA quando possível · classificação de intenção ·
roteamento estático×IA · recuperar só os trechos relevantes · limite de contexto ao modelo · limite
de tamanho das respostas · respostas progressivas · cache quando adequado · controle de consumo por
usuário/plano · registro de custos e de perguntas frequentes · identificar dúvidas repetidas que
devem virar novos artigos.

**Resolve por conteúdo estático:** dose, diluição, preparo de bomba, definição, critério, indicação
isolada, ajuste renal, meta terapêutica, fórmula, contraindicação, prescrição padronizada.
**Justifica IA:** caso individualizado, integração de múltiplos dados, ajuste de VM, interpretação
de curvas, discussão hemodinâmica, diagnósticos diferenciais, priorização de condutas, reavaliação,
plano terapêutico, síntese de prontuário, documentação clínica.

**Fluxo recomendado:** usuário envia dúvida → sistema classifica intenção → busca interna → se há
resposta objetiva suficiente, serve o artigo de Perguntas de Plantão → se é caso individualizado,
aciona a IA com só os trechos relevantes → resposta inicial objetiva → usuário pode aprofundar →
resposta oferece links para os módulos do Raciocine.

**Painel admin (futuro):** perguntas que mais consomem tokens, repetidas, mais buscadas, pesquisas
sem resposta, conteúdos a criar, temas com maior potencial de conversão, custo por usuário/plano.

---

## 7. Convenções fixas de desenvolvimento (NUNCA esquecer)

1. **CSS duplicado home ↔ landing.css:** `index.html` tem `<style>` inline próprio e NÃO carrega
   `assets/landing.css`. Classe nova visível na home entra **nos dois lugares**. Testar sempre
   renderizado (Playwright/navegador), nunca só "a classe existe".
2. **Identidade visual:** seguir o skill `be-aside-visual-identity` + `CLAUDE.md`. Páginas do Guia
   (Raciocine) nunca têm header/sidebar/footer à mão — vêm de `assets/app.js` (`MODULE_PAGES` +
   `data-module`). Cor por módulo, nunca hardcoded. Accents: marca `#1db88a` · vm `#0ea5b7` ·
   hemo `#e05555` · neuro `#9b6ff7` · proc `#3b82f6`.
3. **Template de artigo** (Central de Conhecimento): ver §4.
4. **Git:** 2 chats na mesma branch — SEMPRE `git log --oneline -5` + `git status` antes de commitar.
   Commits pequenos, descritivos, em português. `git push` é manual do Cesar (ponte da IA sem rede).
   Locks (`index.lock` etc.) → `mv` para `../_to_delete_lixo_git/` (nunca `rm`) antes de cada comando.
5. **Conteúdo clínico:** nada sai do rascunho sem revisão do Cesar contra fonte primária. Nunca
   inventar dose ou diretriz. Nunca publicar recomendação sem referência.
6. **Preservação:** não reconstruir do zero, não apagar conteúdo, não remover funcionalidade sem
   aprovação, não alterar URL sem redirect, não modificar auth/pagamento sem auditoria, não expor
   variáveis de ambiente, não duplicar componentes, não implementar mudança destrutiva em massa.
7. **Ao fim de cada fase, apresentar:** o que mudou, o que foi preservado, arquivos modificados,
   páginas criadas, componentes reutilizados, testes feitos, riscos, o que validar manualmente,
   próxima etapa, status geral — e **atualizar este documento**.

---

## 8. Plano por fases (a esteira)

> Cada fase termina com commit no branch + atualização deste doc. Fases estruturais (2, e partes da
> 3 e 5) exigem **aprovação do Cesar** antes de executar.

### FASE 0 — SEO/GEO técnico (aditivo, zero risco, ganho imediato) — *pode começar já*
robots.txt (libera GPTBot/ClaudeBot/PerplexityBot/Google-Extended) · sitemap.xml (todas as ~90
páginas) · llms.txt (resumo do be·aside + links das áreas-chave) · conferir canonical/OG nas páginas.
Sem tocar em conteúdo nem navegação. **É o "fazer rodar hoje" mais seguro.**

### FASE 1 — Auditoria e preservação — ✅ FEITA (este documento, §2)
Site e repo inventariados, estado documentado, riscos identificados, nada alterado.

### FASE 2 — Fundação da arquitetura (ESTRUTURAL — requer aprovação)
Organizar as 3 áreas no menu principal · preservar identidade · ajustar navegação · organizar rotas
(sem mover pastas) · criar templates reutilizáveis · criar modelo editorial (§4) · estrutura de
links internos. Apresentar mapa de páginas + arquivos a modificar antes.

### FASE 3 — Organização do Raciocine
Mapear todo o conteúdo atual dos guias · rotular como "Raciocine" · preservar textos/tabelas/
imagens/fluxos · criar mapas de navegação por tema · conectar conteúdos relacionados · preparar
integração com Perguntas de Plantão e com a IA.

### FASE 4 — Central de Conhecimento (produção de artigos — a esteira principal)
Template pronto (já existe) · categorias internas · autoria e revisão · referências · links para o
Raciocine · SEO/GEO por artigo · **publicar perguntas prioritárias em lotes pequenos** (ver §9 e o
banco) · medir buscas/acessos e realimentar a fila. Cada artigo revisado clinicamente antes de sair
do rascunho.

### FASE 5 — Consulte e Resolva (IA)
Interface unificada da IA · classificação de intenção · busca interna · recuperação dos conteúdos do
site (RAG já iniciado) · roteamento estático×IA · limitar contexto · reduzir chamadas desnecessárias
· apresentar fontes internas · modos por tema (VM/hemo/choque/neuro).

### FASE 6 — Otimização e escala
Métricas · monitorar custos · identificar perguntas repetidas → novos artigos · melhorar links
internos · otimizar conversão · favoritos · histórico · trilhas · personalização · expandir temas.

---

## 9. Backlog de conteúdo priorizado (primeiros lotes da esteira)

Regra do briefing: **não criar todos os artigos de uma vez.** Publicar em lotes pequenos e
constantes, começando pelo que tem maior utilidade clínica + maior potencial de busca + maior
conexão com o Raciocine já existente. Banco completo em `PERGUNTAS-DE-PLANTAO-BANCO.md`.

Cada artigo: prioridade (Alta/Média/Baixa) + área correspondente no Raciocine + conexão com conteúdo
existente. Primeiros lotes propostos (long-tail forte + resolve por conteúdo estático → economiza tokens):

**Lote A — Doses & diluições (busca altíssima, concorrência aberta baixa, resolve sem IA):**
- Como preparar e diluir noradrenalina? Dose em mcg/kg/min e conversão mL/h? → liga a Hemo/drogas.
- Quando iniciar vasopressina no choque séptico? Dose? → liga a Hemo + artigo SSC 2026 (já existe).
- Como preparar e diluir dobutamina? Dose mcg/kg/min e mL/h? → liga a Hemo.
- Doses de sedação (fentanil, midazolam, propofol, cetamina, dexmedetomidina) em infusão contínua.
- Doses de indução (etomidato, cetamina, rocurônio, succinilcolina) → liga a VM/indutores.
- Reposição de potássio / magnésio (via, velocidade, acesso) → liga a Distúrbios metabólicos.

**Lote B — Ventilação mecânica (conecta direto ao Raciocine VM, já rico):**
- Como ajustar a VM após a gasometria? Corrigir hipercapnia/hipoxemia? → VM/parametros, VM/sdra.
- Como reconhecer e tratar auto-PEEP? → VM/dissincronia.
- Tabela PEEP/FiO₂ na SDRA · quando PEEP alta? → VM/sdra (+ artigo peep-alta já existe).
- Duplo disparo / esforço ineficaz / ciclagem — como diferenciar? → VM/dissincronia.

**Lote C — Choque & sepse (conecta a Hemo, alta conversão):**
- Como abordar o choque indiferenciado? Diferenciar distributivo/cardio/hipo/obstrutivo. → Hemo.
- Metas de PAM · quando individualizar · quando iniciar noradrenalina/vasopressina/dobutamina. → Hemo.
- Lactato elevado sempre é hipoperfusão? Delta pCO₂, ScvO₂, VExUS. → Hemo (choque críptico já existe).
- Como conduzir o pacote inicial da sepse? (atualiza/expande sepsis-2026 já existente). → Hemo.

**Lote D — Atualizações de diretriz (GEO forte, "o que mudou" tem pico de busca):**
- Surviving Sepsis 2026 (✅ já existe — revisar/expandir) · atualização de TEP · ARDS · BTF/TCE ·
  PADIS quando saírem. Formato "o que mudou" citando ano e diretriz.

**Lote E — Neuro & procedimentos:**
- Osmoterapia: salina hipertônica × manitol · metas de sódio/PPC. → Neuro (medidas-gerais já existe).
- Sequência rápida de intubação · hipotensão pós-IOT (✅ já existe) · "o Shiley saiu" (✅ já existe).

*Regra de conexão:* todo artigo novo → card no hub `/artigos/` + link de/para o módulo do Raciocine
correspondente + (quando fizer sentido) entra no chat simulado do hero.

---

## 10. Páginas institucionais (E-E-A-T — confiança médica)
Existem: sobre, equipe, metodologia, seguranca-ia. Completar quando necessário: autores individuais
(nome, CRM/UF, formação, o que escreve × revisa), processo de revisão, seleção de referências,
política de atualização/correção, aviso de caráter educacional, limitações do assistente IA, termos,
privacidade, contato, planos/assinatura, FAQ, atualizações da plataforma. Schema `Person` com
`sameAs` (CRM/Lattes/LinkedIn) e `reviewedBy`/`lastReviewed` nos conteúdos clínicos.

---

## 11. Registro de decisões
| Data | Decisão |
|---|---|
| 24/07 | Arquitetura definida em **3 áreas**: Central de Conhecimento · Raciocine · Consulte e Resolva (briefing "GEO SEO.pdf"). |
| 24/07 | Seção de artigos = **Central de Conhecimento** (`/artigos/`), foco GEO/SEO; keyword "conduta"/"perguntas de plantão" fica nos títulos, não no nome da área. |
| 24/07 | Guias VM/Hemo/Neuro/Proc = **Raciocine** (núcleo educacional; ~71 páginas preservadas). |
| 24/07 | Assistentes IA + api/ + knowledge.js = **Consulte e Resolva**; estratégia "conteúdo validado primeiro, IA quando integrar". |
| 24/07 | Home: hero com chat simulado (streaming, altura fixa) + card retangular da Central de Conhecimento. |
| 24/07 | Este `PROJECT_STATUS.md` vira o documento mestre; `ROADMAP.md` passa a apontar para cá. |

## 12. Histórico de fases
| Fase | Status | Data |
|---|---|---|
| Fase 1 — Auditoria e preservação | ✅ concluída | 24/07 |
| Fase 2 — Fundação da arquitetura (3 áreas) | 🟡 home feita; estender às demais superfícies | 25/07 |
| Fase 0 — SEO/GEO técnico | ⏳ próxima | — |

**Fase 2 — o que já foi feito (home):** arquitetura de 3 áreas aprovada pelo Cesar. Na home:
(a) **nav de topo** com as 3 áreas (Central de Conhecimento · Raciocine · Consulte e Resolva),
no estilo mono do site, some no mobile (≤1000px); (b) o bento foi enquadrado em **3 áreas
numeradas** com cabeçalhos `.area-head` (01 Central de Conhecimento → card wide; 02 Raciocine →
os 4 cards VM/Hemo/Neuro/Proc; 03 Consulte e Resolva → card novo do assistente IA linkando os 3
assistentes por módulo). Layout e tema **preservados** — só cabeçalhos de área + nav + 1 card
novo. CSS `.mainnav`/`.area-head` nos dois lugares (index.html inline + landing.css). Testado
dark/light/mobile, sem erros. **Follow-up da Fase 2:** estender a nav das 3 áreas às páginas de
guia (shell em `assets/app.js`) e ao hub `/artigos/`, para a navegação ser consistente no site
todo (hoje só a home tem a nav).

## 13. Próxima etapa
**Fase 0 — SEO/GEO técnico** (aditiva, sem risco): `robots.txt` (libera GPTBot/ClaudeBot/
PerplexityBot/Google-Extended), `sitemap.xml` (todas as páginas), `llms.txt` (resumo + links das
3 áreas), conferir canonical/OG. Depois: estender a nav das 3 áreas às demais superfícies
(follow-up da Fase 2) e seguir para a Fase 4 (produção de artigos, Lote A do §9).
