# Histórico de sessões — be·aside

> Este arquivo saiu do `CLAUDE.md` em 01/08/2026. Nada foi alterado no conteúdo:
> é o mesmo registro, palavra por palavra, num arquivo próprio.
>
> **Por que ele mora aqui.** O `CLAUDE.md` é lido no começo de toda sessão de
> trabalho. Histórico não muda decisão nenhuma — ele só explica *por que* algo
> ficou como ficou. Deixá-lo no guia principal fazia toda sessão pagar por uma
> informação que quase nenhuma sessão usa.
>
> **Quando abrir.** Quando alguém perguntar "por que isso foi feito assim?",
> quando um comportamento estranho parecer proposital, ou antes de desfazer algo
> que parece errado — pode ter sido decidido de propósito. Fora disso, não abra.
>
> **Como abrir.** Procure a sessão pela data ou pelo assunto (`grep -n '^### Sessão'
> docs/historico.md`) e leia só aquele trecho. Este arquivo não se lê inteiro.
>
> **Onde escrever daqui em diante.** Sessão nova entra no fim, com data e título
> no mesmo formato das anteriores.

---

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
