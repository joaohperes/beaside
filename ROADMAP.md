# be·aside — Roadmap

> **O documento mestre agora é [`PROJECT_STATUS.md`](./PROJECT_STATUS.md)** — a "esteira de
> produção" do projeto (visão de SaaS, as 3 áreas, auditoria completa, arquitetura proposta,
> modelo editorial, estratégia SEO/GEO/tokens, plano por fases, registro de decisões).
>
> Antes de qualquer sessão de desenvolvimento, leia:
> 1. [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) — mapa mestre e status.
> 2. [`PERGUNTAS-DE-PLANTAO-BANCO.md`](./PERGUNTAS-DE-PLANTAO-BANCO.md) — backlog de artigos.
> 3. `CLAUDE.md` — arquitetura técnica do repositório.
> 3b. `conteudo/manifest.json` — **fonte única do conteúdo** (módulos, páginas, artigos).
>     Nunca editar sidebar/cards/knowledge à mão: edite o manifest e rode `npm run build:content`.
> 3c. `conteudo/prescricoes-indice.json` — o **roteador das prescrições** (o que existe e qual
>     página responde a quê). Gerado por `npm run indice-prescricoes`; nunca editar à mão.
> 4. skill `be-aside-visual-identity` — identidade visual (header/logo/cores/rodapé).
>
> Se o foco se perder no meio do caminho, **volte para o `PROJECT_STATUS.md`**.

## Resumo em uma tela

O be·aside está sendo estruturado como um SaaS de raciocínio clínico para quem cuida de paciente
crítico, em **três áreas**:

1. **Central de Conhecimento** (`/artigos/`) — artigos GEO/SEO, porta de entrada por busca.
2. **Raciocine** (`/vm/ /hemo/ /neuro/ /proc/ /peri/ /infecto/ /nefro/`) — módulos de raciocínio
   (o maior ativo, ~93 páginas). O **Nefro Guide** entrou em ago/2026 com eletrólitos, LRA, DRC e
   distúrbios ácido-base.
3. **Consulte e Resolva** — a camada de execução (**prescrições comentadas** e calculadoras) mais o
   assistente de IA (RAG sobre o conteúdo validado do próprio site). As prescrições chegam ao
   assistente por um **roteador** gerado, não pela base de conhecimento — ver §17 do
   `PROJECT_STATUS.md`.

Regra do processo: preservar tudo que existe, avançar em fases, aprovar antes de mudança estrutural,
lançar cada etapa no branch. Doses e diluições entram por `conteudo/farmacos.json` (ver §15 do `PROJECT_STATUS.md`) — nunca direto no prompt da IA. Conteúdo novo entra por `npm run nova-pagina` (ver §14 do
`PROJECT_STATUS.md`), não editando arquivo por arquivo. Detalhes, auditoria e plano completo: `PROJECT_STATUS.md`.
