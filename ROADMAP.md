# be·aside — Estrutura Funcional & Roadmap

> **Como usar este documento**: é o mapa vivo do projeto. Antes de qualquer sessão de
> desenvolvimento (sozinho ou com IA), leia as seções "Convenções fixas" e "Backlog".
> Ao terminar uma sessão, marque o que foi feito e anote decisões novas em "Registro de
> decisões". Nada de plano solto em conversa — se não está aqui, vai se perder.

_Última atualização: 24/07/2026 · branch `content/artigos-clinicos`_

---

## 1. Estado atual (o que já está pronto)

| Área | Estado | Observação |
|---|---|---|
| Guia VM (`/vm/`) | ✅ no ar | módulos completos + assistente IA |
| Guia Hemodinâmica (`/hemo/`) | ✅ no ar | idem |
| Guia Neurocrítico (`/neuro/`) | ✅ no ar | em expansão |
| Guia Procedimentos (`/proc/`) | ✅ no ar | sem assistente IA próprio |
| **Central de Conhecimento** (`/artigos/`) | 🟡 8 artigos em rascunho | ex-"Perguntas de Plantão" → "Condutas no Paciente Crítico" → renomeada de novo em 24/07 para refletir escopo mais amplo (artigos gerais, GEO/SEO, posicionamento de mercado). Aguarda revisão clínica para tirar aviso de rascunho |
| Home — hero com chat simulado | ✅ | 4 sessões × 2 perguntas, streaming, altura fixa |
| Home — card retangular "Central de Conhecimento" | ✅ | full-width acima dos módulos, accent teal |
| Institucional (Sobre/Equipe/Metodologia/Segurança IA) | ✅ | branch `feat/paginas-institucionais` |
| Login / Conta | ✅ | |
| Infra SEO técnica (robots/sitemap/llms.txt) | ❌ não existe | maior pendência técnica — ver §5 |
| Analytics / Search Console | ❌ não configurado | sem dados de busca real ainda |

**Seção-âncora do site**: `/artigos/` = **Central de Conhecimento**. É a "cara" do site para
SEO/GEO — pensada para artigos gerais sobre paciente crítico que posicionem o be·aside no
mercado, não só respostas pontuais de plantão. Todo artigo novo entra ali, com card no hub e
(quando relevante) exemplo no chat do hero da home. O nome da seção mudou, mas o vocabulário
de busca ("conduta", "perguntas de plantão") continua vivo nos títulos e descrições — ver §3.2.

---

## 2. Convenções fixas de desenvolvimento (NUNCA esquecer)

1. **CSS duplicado home ↔ landing.css**: `index.html` tem `<style>` inline próprio e NÃO
   carrega `assets/landing.css`. Qualquer classe nova visível na home entra NOS DOIS
   arquivos. Testar sempre renderizado (Playwright/navegador), nunca só "a classe existe".
2. **Identidade visual**: seguir o skill `be-aside-visual-identity` + `CLAUDE.md`. Páginas
   do Guia nunca têm header/sidebar/footer escritos à mão (vêm de `assets/app.js`); cor por
   módulo via `data-module`, nunca hardcoded.
   Accents: marca `#1db88a` · vm `#0ea5b7` · hemo `#e05555` · neuro `#9b6ff7` · proc `#3b82f6`.
3. **Template de artigo** (`/artigos/`): título no padrão pergunta ou "X: … e conduta" →
   resposta direta primeiro (`.qa-direct`) → mecanismo (`.qa-body`) → conduta prática →
   referências com fonte nomeada → JSON-LD `FAQPage` → CTA para guia + assistente + conta →
   aviso de rascunho até revisão clínica.
4. **Git**: 2 chats de IA trabalham na mesma branch — SEMPRE `git log --oneline -5` +
   `git status` antes de commitar. Commits pequenos e descritivos em português.
   `git push` é manual (Cesar) — a ponte da IA não tem rede.
5. **Conteúdo clínico**: nada sai do rascunho sem revisão do Cesar contra fonte primária
   (guideline/UpToDate/FCCS). Claim sem fonte confiável = corta.

---

## 3. Brechas de SEO/GEO no nicho (pesquisa de 24/07/2026)

### 3.1 A brecha principal: conteúdo aberto vs. paywall
Os gigantes do nicho em pt-BR são **apps pagos ou fechados**: Whitebook/Afya (guia de
prescrição nº 1), UpToDate (inglês, paywall), Medscape (inglês). **Motores de IA não
conseguem citar conteúdo atrás de paywall/app.** Quem publica conduta de qualidade em HTML
aberto, com referência, em português, tem a pista quase livre para ser a fonte citada por
ChatGPT/Perplexity/AI Overviews quando um médico brasileiro pergunta "quando iniciar
vasopressina no choque séptico". Essa é a aposta central do be·aside.

### 3.2 O padrão de busca do médico brasileiro: "conduta"
Sanarmed, Estratégia MED e afins rankeiam com o padrão **"X: diagnóstico e conduta"** —
"conduta" é a palavra que o médico digita ("conduta na sepse", "conduta hipercalemia
grave"). A seção se chama **Central de Conhecimento**, mas cada artigo/título individual
continua usando "conduta" e "perguntas de plantão" — a keyword vive no conteúdo, não
precisa estar no nome da seção. Padrões de long-tail a explorar em títulos e H2s:
- "conduta na/em [condição]" · "quando iniciar [droga]" · "dose de [droga] em mL/h"
- "como ajustar [parâmetro do ventilador]" · "[achado]: o que fazer"
- perguntas literais ("a pressão caiu depois da PEEP — por quê?")

### 3.3 O que faz IA citar uma página (táticas GEO com efeito medido)
- Citar fontes com nome ao longo do texto (**+40% visibilidade**)
- Números/estatísticas com fonte e data (**+37%**)
- Citações de especialista/guideline com crédito (**+30%**)
- Terminologia técnica precisa (**+28%**)
- Resposta direta no primeiro parágrafo (formato que já usamos)
- Tabelas para dados comparativos · datas "atualizado em" visíveis
- FAQPage/schema + headings em formato de pergunta
- Autoridade tópica: cluster interligado (artigo ↔ guia ↔ calculadora ↔ assistente)

### 3.4 Sub-nichos com pouca concorrência aberta em pt-BR (fila de oportunidade)
1. **Conversões de dose à beira do leito** (mcg/kg/min ↔ mL/h por droga e diluição) — busca
   altíssima, resposta aberta quase inexistente em pt-BR. Par perfeito artigo + calculadora.
2. **Troubleshooting de ventilador** (pressão de pico alta, auto-PEEP, dissincronias
   específicas) — dominado por PDFs acadêmicos, não por resposta direta.
3. **POCUS prático de plantão** (VCI, perfil pulmonar, avaliação rápida de choque).
4. **Complicações de procedimento** ("saiu o Shiley", CVC mal posicionado, PAI amortecida).
5. **Atualizações de guideline comentadas** (SSC 2026 já feito — repetir o formato para
   BTF/TCE, ARDS, PADIS quando atualizarem; "o que mudou" tem pico de busca garantido).
6. **Neurocrítico básico bem explicado** (PPC, osmoterapia, sedação para PIC).

---

## 4. Pipeline de conteúdo — próximos artigos (ordem sugerida)

Cada item = 1 artigo no template padrão. Query-alvo entre parênteses.

**Lote 1 — dose e droga (maior busca, menor concorrência):**
- [ ] Noradrenalina na prática: diluição, mcg/kg/min ↔ mL/h ("dose noradrenalina ml/h")
- [ ] Sedoanalgesia no ventilado: fentanil + midazolam vs. precedex ("sedação UTI doses")
- [ ] Corticoide no choque séptico: quando e como ("hidrocortisona choque séptico dose")

**Lote 2 — troubleshooting VM:**
- [ ] Pressão de pico alta: obstrução, broncoespasmo ou complacência? ("pressão de pico alta ventilador")
- [ ] Auto-PEEP: como detectar e o que fazer ("auto peep conduta")
- [ ] Paciente "brigando" com o ventilador: checklist antes de sedar mais

**Lote 3 — hemodinâmica prática:**
- [ ] Lactato subindo com PA normal: e agora? (expande choque críptico)
- [ ] Teste de elevação passiva de pernas: como fazer certo ("elevação passiva pernas fluido responsividade")
- [ ] Delta pCO₂ e ScvO₂ na prática ("delta pco2 interpretação")

**Lote 4 — neuro/proc:**
- [ ] Osmoterapia: salina hipertônica vs. manitol ("salina hipertônica manitol conduta")
- [ ] CVC: checklist pós-passagem e complicações precoces
- [ ] PAI amortecida/hiper-ressonante: interpretação da curva

**Regra do pipeline**: publicar em lotes pequenos e constantes (1–2/semana) > lote gigante
único. Cada artigo novo: card no hub + link interno de/para o guia relacionado + considerar
entrada no chat do hero.

---

## 5. Infra técnica de SEO/GEO — checklist (fazer 1× e manter)

Pré-requisito: fazer ANTES de investir pesado em mais conteúdo — sem isso, o conteúdo
existente não é encontrado nem citado.

- [ ] `robots.txt` liberando crawlers de IA: GPTBot, ClaudeBot, PerplexityBot, Google-Extended
- [ ] `sitemap.xml` com todas as páginas (e manter ao criar página nova)
- [ ] `llms.txt` na raiz: resumo do que é o be·aside + links das páginas-chave
- [ ] Canonical + Open Graph únicos em TODAS as páginas (artigos já têm; conferir guias)
- [ ] Schema adicional: `Organization` (be·aside), `Person` (Cesar/João com CRM + sameAs),
      `BreadcrumbList`, `MedicalWebPage` nos guias; `reviewedBy`/`lastReviewed` nos artigos
- [ ] Data "atualizado em" visível em cada artigo (sinal de frescor p/ IA)
- [ ] Páginas de autor individuais (E-E-A-T — crítico em conteúdo YMYL/saúde)
- [ ] Google Search Console + analytics (decidir ferramenta) — sem dados, o pipeline do §4
      fica no achismo; com dados, a fila se reordena pelo que médicos realmente buscam
- [ ] Consistência de marca: `be·aside` (visual) / "be aside" (texto) / `be-aside` (URLs)
- [ ] Unificar CSS da home com `assets/landing.css` via `<link>` (elimina a duplicação §2.1)
      — mudança estrutural, testar tudo antes

---

## 6. Backlog por fase (ordem de valor)

**Fase 0 — destravar (barato, faz tudo o resto funcionar)**
1. Infra técnica do §5 (robots, sitemap, llms.txt, schema, datas)
2. Revisão clínica dos 8 artigos existentes → tirar avisos de rascunho
3. Search Console + analytics

**Fase 1 — consolidar a seção-âncora**
4. Lote 1 do pipeline (§4) publicado
5. Links internos sistemáticos guia ↔ artigos (cada página de guia aponta para as condutas
   relacionadas e vice-versa)
6. Páginas de autor + `reviewedBy` no schema

**Fase 2 — expandir com dados**
7. Lotes 2–4 do pipeline, reordenados pelo que o Search Console mostrar
8. Calculadoras públicas (dose mL/h primeiro) como páginas indexáveis ligadas aos artigos
9. Página `/sobre-a-plataforma` (resumo denso legível por IA — ver doc estrutura-ideal)

**Fase 3 — produto**
10. Busca interna cruzando guias + condutas
11. Assistente para `/proc/`
12. Decisões de negócio (fora do escopo SEO): planos, contas, etc.

---

## 7. Registro de decisões

| Data | Decisão |
|---|---|
| 24/07/2026 | Seção `/artigos/` renomeada de "Perguntas de Plantão" para "Condutas no Paciente Crítico" (keyword "conduta"), e depois para **"Central de Conhecimento"** no mesmo dia — o escopo real é artigos gerais sobre paciente crítico com foco em GEO/SEO e posicionamento de mercado, não só Q&A pontual. Nome conecta com a tagline do hero ("Conhecimento à beira do leito"). Descrições/títulos individuais mantêm "conduta" e "perguntas de plantão" para não perder a long-tail de busca. |
| 24/07/2026 | Card da seção vira **retângulo full-width acima dos módulos** na home (classe `.card.wide`), accent teal de marca, layout horizontal. |
| 24/07/2026 | Hero da home = chat simulado (streaming, 4 sessões×2 perguntas, altura fixa 300px, plantão/condutas primeiro). |
| 24/07/2026 | Aposta estratégica: conteúdo **aberto + referenciado + em português** para ocupar o espaço que Whitebook/UpToDate (paywall) não podem ocupar nas citações de IA. |
| anterior | Artigos fora dos módulos do Guia, em seção própria `/artigos/` (SEO/GEO). |
| anterior | Todo conteúdo clínico nasce como rascunho até revisão do Cesar. |

---

## 8. Fontes da pesquisa SEO/GEO (24/07/2026)

- Guia GEO 2026 (táticas com % de impacto): digitalapplied.com/blog/geo-guide-generative-engine-optimization-2026
- llms.txt: getmint.ai/resources/llms-txt · clingeo.com/en/blog/llms-txt-for-medical-websites
- Schema p/ citação por IA: averi.ai/blog/schema-markup-for-ai-citations-the-technical-implementation-guide
- Padrão "conduta" dos concorrentes: sanarmed.com (ex.: "Sepse e choque séptico: diagnóstico e conduta") · med.estrategia.com
- Cenário Whitebook/Afya (app pago, decisão médica): whitebook.pebmed.com.br/planos
- Complementa (não substitui) o doc estratégico `claude/estrutura-ideal-seo-geo.md` no projeto Claude.
