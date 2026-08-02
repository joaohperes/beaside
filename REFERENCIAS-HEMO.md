# hemo — mapa de referências primárias

> Documento de trabalho. **Não é conteúdo publicado** — fica fora do manifesto e
> do deploy. Serve para João e César revisarem antes de qualquer edição em HTML.
>
> Todas as referências abaixo foram **verificadas contra o texto-fonte** (PDFs de
> UpToDate, SSC 2026, Delphi SCCM/ESICM, metanálises), não contra síntese de IA.
> Onde a fonte não sustenta o que está publicado, está marcado ⚠️.

---

## Situação atual

O módulo hemo **não estava desatualizado** — a auditoria inicial contou `.ref` e
encontrou 2 em 17 páginas, o que sugeria conteúdo sem lastro. A leitura das
páginas mostrou outra coisa: o conteúdo é atual (10 páginas já trazem bloco
"SSC 2026" correto) e em vários pontos mais sofisticado que a síntese que
buscamos. **O problema é só a ausência de citação primária visível.**

As duas únicas `.ref` existentes citam "UpToDate", que é fonte terciária e não
segue o padrão de `proc/` (autor + periódico + ano).

---

## 1. `vci.html` — POCUS e fluido-responsividade

Página distingue corretamente **predição** de **confirmação**. Conteúdo aprovado
na leitura; só faltam as fontes.

| Afirmação publicada | Fonte primária |
|---|---|
| dIVC > 18% (VM) sugere responsividade | Feissel M, Michard F, Faller JP, Teboul JL. The respiratory variation in inferior vena cava diameter as a guide to fluid therapy. **Intensive Care Med. 2004** |
| Variação respiratória da VCI prediz resposta em VM | Barbier C, Loubières Y, Schmit C, et al. Respiratory changes in inferior vena cava diameter are helpful in predicting fluid responsiveness in ventilated septic patients. **Intensive Care Med. 2004** |
| VCI não deve ser usada isoladamente | Orso D, Paoli I, Piani T, et al. Accuracy of Ultrasonographic Measurements of Inferior Vena Cava to Determine Fluid Responsiveness: A Systematic Review and Meta-Analysis. **J Intensive Care Med. 2020** |
| PLR + ΔVTI ≥ 10–15% confirma responsividade | Monnet X, Teboul JL. Passive leg raising: five rules, not a drop of fluid! **Crit Care. 2015** · Cherpanath TG, Hirsch A, Geerts BF, et al. Predicting Fluid Responsiveness by Passive Leg Raising: SR/MA of 23 Clinical Trials. **Crit Care Med. 2016** |
| VPP > 13% (VM + ritmo regular + Vt ≥ 8 mL/kg) | Marik PE, Cavallazzi R, Vasu T, Hirani A. Dynamic changes in arterial waveform derived variables and fluid responsiveness in mechanically ventilated patients: a systematic review. **Crit Care Med. 2009** |
| Em Vt baixo, desafio de volume corrente recupera acurácia | Myatra SN, Prabu NR, Divatia JV, et al. The Changes in PPV or SVV After a "Tidal Volume Challenge". **Crit Care Med. 2017** |

**Decisão pendente:** incluir o desempenho da metanálise Orso 2020
(**sensibilidade 71%, especificidade 75%**)? Recomendo incluir — reforça o que a
página já ensina, que predição não é prova.

---

## 2. `scvo2.html` — saturação venosa central

| Afirmação publicada | Fonte primária |
|---|---|
| Interpretação de SvcO₂ alta e baixa; SvcO₂ ≈ 5–7% acima da SvO₂ mista | Walley KR. Use of central venous oxygen saturation to guide therapy. **Am J Respir Crit Care Med. 2011** |
| Coleta periférica não substitui a central | Walley 2011 (acima) |
| ⚠️ "≥ 70% = meta na ressuscitação" | **SUPERADO** — ver abaixo |

⚠️ **Ajuste necessário.** A tabela publica "≥ 70% — Meta na ressuscitação".
A EGDT guiada por ScvO₂ foi derrubada:

- Rivers E, Nguyen B, Havstad S, et al. Early goal-directed therapy in the
  treatment of severe sepsis and septic shock. **N Engl J Med. 2001** (original)
- ProCESS Investigators, Yealy DM, Kellum JA, et al. **N Engl J Med. 2014**
- ARISE Investigators, Peake SL, et al. **N Engl J Med. 2014**
- Mouncey PR, et al. (ProMISe). **N Engl J Med. 2015**

O próprio SSC 2026 não traz SvcO₂ como alvo mandatório. Sugestão: trocar
"Meta na ressuscitação" por "Faixa esperada — não é alvo terapêutico isolado".
A página já acerta ao listar as armadilhas de SvcO₂ alta.

---

## 3. `dpco2.html` — gradiente venoarterial

| Afirmação publicada | Fonte primária |
|---|---|
| Corte ≥ 6 mmHg indica baixo fluxo | Al Duhailib Z, Hegazy AF, Lalli R, et al. The Use of Central Venous to Arterial Carbon Dioxide Tension Gap for Outcome Prediction in Critically Ill Patients: SR/MA. **Crit Care Med. 2020;48(12):1855-1861** |
| Fisiologia do acúmulo de CO₂ com baixo fluxo | Mallat J, Jozwiak M, Orozco N, Hamzaoui O, Monnet X, Teboul JL, De Backer D, Ospina-Tascón GA. Use of CO₂-derived variables in critically ill patients. **Ann Intensive Care. 2025;15(1):142** |
| ΔpCO₂ complementa o lactato | Mallat J, Lemyze M, Tronchon L, Vallet B, Thevenin D. Use of venous-to-arterial carbon dioxide tension difference to guide resuscitation therapy in septic shock. **World J Crit Care Med. 2016;5(1):47-56** |

⚠️ **Qualificação necessária.** A metanálise (21 estudos, 2.155 pacientes)
sustenta o corte de 6 mmHg, mas com três ressalvas que a página deve absorver:

1. É **marcador prognóstico**, não meta validada. OR de mortalidade **2,22
   (IC95% 1,30–3,82; p = 0,004)**. Conclusão literal dos autores: *"Future
   studies should evaluate whether resuscitation aimed at 'closing' the CO₂ gap
   improves these clinical outcomes."*
2. A definição de "gap alto" varia entre estudos: **5–7 mmHg**.
3. A associação valeu para UTI **clínica e cirúrgica**, mas **não** para
   cardiovascular. Todos os estudos são observacionais.

---

## 4. `rush.html` — protocolo RUSH

A página já cita "Perera et al. (2010)" em texto corrido. Falta virar `.ref`:

> Perera P, Mailhot T, Riley D, Mandavia D. The RUSH exam: Rapid Ultrasound in
> SHock in the evaluation of the critically ill. **Emerg Med Clin North Am. 2010**

Complemento para POCUS em choque:
> Díaz-Gómez JL, et al. Society of Critical Care Medicine Guidelines on Adult
> Critical Care Ultrasonography: Focused Update 2024. **Crit Care Med. 2025**

---

## 5. `padroes.html`, `quadrantes.html`, `fluxograma.html`

Os perfis hemodinâmicos por tipo de choque (DC/RVS/PVC/PoAP/SvO₂) **não têm
primária** — são consenso fisiológico consolidado, apresentado em tabela de
referência sem citação nas fontes. **Isso não é lacuna**: é conhecimento
clássico. Não forçar citação; apresentar como referência clássica.

Onde há fonte:

| Afirmação | Fonte |
|---|---|
| Alvo de PAM 65 mmHg (adultos) | SSC 2026, **Rec. 13 — recomendação forte** |
| Alvo 60–65 mmHg em ≥ 65 anos | SSC 2026, **Rec. 14 — condicional, "New"** |
| Base do alvo pressórico | Asfar P, et al. **N Engl J Med. 2014;370:1583** · Lamontagne F, et al. **JAMA. 2020;323:938** · Angriman F, et al. **NEJM Evid. 2025;4:EVIDoa2400359** |
| Noradrenalina 1ª linha | SSC 2026, **Rec. 53 — forte** |
| Vasopressina em dose escalonada de nora | SSC 2026, **Rec. 56 — condicional** |
| Preferir cristaloide balanceado | SSC 2026, **Rec. 44 — condicional** |
| Medidas dinâmicas > estáticas | SSC 2026, **Rec. 49 — condicional** |
| Lactato seriado | SSC 2026, **Rec. 51 — condicional** |
| Enchimento capilar como adjunto | SSC 2026, **Rec. 52 — condicional** |

**Citação canônica do SSC 2026 — confirmar autoria antes de publicar:**
*Surviving Sepsis Campaign: International Guidelines for Management of Sepsis
and Septic Shock 2026.* Crit Care Med. 2026. (129 recomendações, 46 novas —
número citado na página `dpco2.html`, conferir contra o PDF.)

---

## 6. `drogas.html` — choque séptico refratário

Definição nova, confirmada no PubMed:

> Leone M, Myatra SN, Dugar S, et al. Clinical Criteria for the Definition of
> Refractory Septic Shock: A Joint Delphi Consensus from the Society of Critical
> Care Medicine (SCCM) and European Society of Intensive Care Medicine (ESICM).
> **Crit Care Med. 2026 May;54(5):1073-1091.** doi:10.1097/CCM.0000000000007124

Critérios: choque séptico + lactato persistente > 2 mmol/L e/ou enchimento
capilar prolongado, em paciente não responsivo a fluidos, com necessidade de
noradrenalina > 0,5 mcg/kg/min, após POCUS excluindo outras causas.
*Ressalva do próprio consenso: duração não definida; impacto em desfecho ainda
não validado.*

---

## 7. `vti.html` — VTI e débito cardíaco pelo POCUS

Página **nova** (jul/2026). Criada porque o VTI era citado em 10 páginas do módulo
como desfecho de todo teste funcional — e não era ensinado em nenhuma. Todas as
fontes abaixo foram lidas no texto-fonte (PDF/PMC), não em síntese.

| Afirmação publicada | Fonte primária |
|---|---|
| PLR: cinco regras — partir de semirrecumbente, ajustar a **cama** (não erguer as pernas na mão), medir débito e não pressão de pulso, efeito pode se esgotar em 1 min, retornar à posição inicial e confirmar volta ao basal | Monnet X, Teboul JL. Passive leg raising: five rules, not a drop of fluid! **Crit Care. 2015;19:18** |
| PLR + ΔVTI: S 86% (IC95% 79–92) · E 92% (IC95% 88–96) · AUC 0,95 — 23 estudos, 1.013 pacientes | Cherpanath TG, Hirsch A, Geerts BF, et al. **Crit Care Med. 2016;44:981-91** |
| Diâmetro do VSVE: paraesternal longitudinal, quadro **mesossistólico**, borda interna a borda interna, **no ânulo ou ≤ 2 mm** abaixo | Guzzetti E, Capoulade R, Tastet L, et al. **J Am Soc Echocardiogr. 2020;33:953-63** |
| Medir 5–10 mm abaixo do ânulo subestima VS em até **15,9 ± 17,3 mL**; acurácia para baixo fluxo 86% (ânulo) e 82% (2 mm) vs 69% e 61% (5 e 10 mm) — secção elíptica pelo <em>septal bulge</em> | Guzzetti 2020 (acima), comparação direta com CMR de contraste de fase, n = 106 |
| Erro no diâmetro entra ao quadrado: 5% → **10%** no VS (63 vs 69 mL); 10% → **21%** (63 vs 76 mL) | Guzzetti 2020 (acima), Figura de bias — números literais do artigo |
| Gate do Doppler pulsado: posicionar no plano valvar e recuar apicalmente até sumirem os cliques da valva | Guzzetti 2020 (métodos) · técnica ASE referida no próprio artigo |
| EEO: pausa de **12 s**; ΔVTI **9%** → S 89% (72–98) · E 95% (77–100); AUC 0,96 ± 0,03 | Georges D, de Courson H, Lanchon R, et al. **Crit Care. 2018;22:32** (n = 50, sedados, sem esforço; arritmia crônica excluída; Vt 6–8 mL/kg) |
| Mini-bolus 100 mL de Ringer em 1 min: ΔVTI **9,1%** → S 91,5% · E 88,9% · AUROC 0,96. EEOT no mesmo estudo: **4,3%** → S 89,4% · E 88,9% | Selvam V, Shende D, Anand RK, Kashyap L, Ray BR. **J Emerg Trauma Shock. 2023;16:109-15** (n = 83; 17 excluídos por esforço inspiratório no EEOT) |

**Notas de curadoria.**

1. O corte do EEO aparece na literatura entre **4,3% e 9%** (Selvam vs Georges).
   A página publica a faixa `≈ 4–9%`, não um número único — os dois estudos são
   pequenos e usaram durações de oclusão diferentes (15 s vs 12 s). `vci.html`
   trazia `EEO 30 s + ΔVTI ≥ 5%`; a duração de 30 s **não** está sustentada por
   nenhuma das duas fontes. ⚠️ Corrigir em `vci.html` numa próxima passada.
2. Monnet 2015 **não** publica o corte percentual — quem sustenta o `≥ 10%` é a
   metanálise de Cherpanath. As duas `.ref` andam juntas por isso.
3. Guzzetti 2020 é estudo de estenose aórtica. O que se importa dele é a
   **técnica de medida do VSVE e a propagação do erro**, válidas para qualquer
   cálculo de VS por Doppler — não conclusões sobre AVA/estenose.
4. A página é explícita em que o diâmetro **se cancela no ΔVTI**: erro de diâmetro
   estraga o DC absoluto, não a resposta “o débito subiu?”. Isso evita que o leitor
   descarte o teste funcional por não confiar na própria régua.
5. Não publicar como “equivalente à termodiluição”. `do2.html` já diz “boa
   correlação”, o que é defensável; a página nova não amplia essa afirmação.

---

## Divergência a publicar como divergência

**Cristaloide balanceado vs. salina** — não escolher lado:

- **A favor de balanceado:** Semler MW, et al. Balanced Crystalloids versus
  Saline in Critically Ill Adults. **N Engl J Med. 2018** (SMART) · SSC 2026
  Rec. 44 (condicional)
- **Contra diferença relevante:** Delgado Moya FP, Antequera A, Muriel A, et al.
  Buffered solutions versus 0.9% saline for resuscitation in critically ill
  adults and children. **Cochrane Database Syst Rev. 2026** — pouca ou nenhuma
  diferença em mortalidade hospitalar ou LRA

---

## Fontes a NÃO usar

- **UpToDate** — terciária e licenciada. É o mapa, não a citação. ✅ As duas
  `.ref` de hemo foram substituídas.
- **StatPearls** — mesmo problema (apareceu na síntese para lactato).
- Abstracts de congresso (ex.: anais do ISICEM).
- Estudos em modelo animal para páginas de beira de leito.

---

## Lacunas do SSC 2026 — status

Extraí as 61 recomendações graduadas do PDF e cruzei com o site.

### ✅ Aplicado

| Recomendação | Onde entrou |
|---|---|
| **Rec. 53/54/55/64** — o que *não* usar (terlipressina, vasopressina/angio II como 1ª linha, dopamina/adrenalina/selepressina, betabloqueador) | Tabela nova em `drogas.html` → aba "1ª escolha por tipo de choque" |

### 📦 Pronto, aguardando o módulo de infecto

**Rec. 33 — betalactâmico em infusão prolongada após dose de ataque (forte).**

Este card chegou a ser publicado em `drogas.html` (aba Adjuvantes) em 28/jul/2026
e foi **retirado no mesmo dia**. O motivo não é clínico — o conteúdo está
verificado e é recomendação forte. É de arquitetura da informação: a página se
chama *Vasopressores e Inotrópicos*, e quem procura esquema de antimicrobiano
não abre essa página. O card ficaria correto e invisível ao mesmo tempo, e ainda
quebraria a expectativa de quem entra ali por droga vasoativa.

O César vai criar o módulo de **infecto/antimicrobianos** em breve. Quando
existir, é colar o bloco abaixo — ele já usa o design system de cards
colapsáveis de `drogas.html`. Se o módulo novo não usar esse padrão, o conteúdo
das três colunas e dos dois `alert-box` migra direto para `.ind-grid` +
`.warn-box`.

**Base:** metanálise de 18 ECRs, 9.108 participantes, incluindo o BLING III —
**RR 0,91 (IC 95% 0,85–0,97)**, 25 mortes a menos por 1.000 tratados. Maior
impacto em piperacilina-tazobactam e carbapenêmicos (meia-vida curta). Em 2021 a
recomendação era condicional; com o BLING III passou a forte.

```html
<div class="card collapsible" data-card="adj-betalac" onclick="toggleCard(this,event)">
  <div class="card-toggle">
    <div class="card-title">Betalactâmico em infusão prolongada</div>
    <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
  <div class="card-body">
    <div class="tag-row"><span class="tag">Antimicrobiano</span><span class="tag">Sepse e choque séptico</span><span class="tag">SSC 2026: forte</span></div>
    <div class="table-wrap">
<table>
      <tr><th>Como fazer</th><th>Dose de ataque</th><th>Maior impacto</th></tr>
      <tr><td>Manutenção em infusão <strong>estendida</strong> (ao longo de ≥ metade do intervalo entre doses) ou <strong>contínua</strong> — em vez de bólus de ≤ 30 min</td><td><strong>Obrigatória antes</strong> de iniciar a infusão prolongada — sem ela, há atraso para atingir concentração efetiva</td><td>Fármacos de meia-vida curta: <strong>piperacilina-tazobactam</strong> e <strong>carbapenêmicos</strong></td></tr>
    </table>
</div>
    <div class="alert-box"><div class="icon">i</div><div class="content"><strong>Por que mudou para recomendação forte</strong>Na sepse, a farmacocinética do betalactâmico se altera e as concentrações podem ficar subterapêuticas. A infusão prolongada mantém concentração estável e maximiza a farmacodinâmica (tempo acima da CIM). Metanálise de 18 ensaios randomizados (9.108 participantes), incluindo o BLING III, mostrou <strong>redução de mortalidade de curto prazo — RR 0,91 (IC 95% 0,85–0,97)</strong>, o equivalente a 25 mortes a menos por 1.000 pacientes tratados. Em 2021 a recomendação era condicional; com o BLING III passou a forte.</div></div>
    <div class="alert-box danger"><div class="icon">!</div><div class="content"><strong>Antes de prescrever</strong>Exige acesso venoso adequado e bomba de infusão disponível pelo tempo todo da infusão. O lúmen fica ocupado por mais tempo que no bólus — verificar estabilidade do fármaco e compatibilidade com as outras drogas em curso. Não substitui a dose de ataque.</div></div>
  </div>
</div>
```

**Outras recomendações do SSC 2026 que pertencem ao mesmo módulo** (nenhuma está
no site — vale montar junto quando o infecto existir): Rec. 20 (tempo até a
primeira dose), Rec. 25–29 (cobertura para MDR e anaeróbios), Rec. 39 (duração
do tratamento).

**Divisão com o Hub UTI:** o guia ensina conduta; o Hub registra o que foi
prescrito (a aba de Antimicrobianos já existe lá). Definir isso antes de expandir.

### ⏳ Não aplicado — decisão de escopo pendente

| Recomendação | Observação |
|---|---|
| **Rec. 4** — NEWS/NEWS2/MEWS/SIRS **sobre qSOFA** para rastreio (**forte**) | O qSOFA foi rebaixado como ferramenta única. NEWS2 teve melhor desempenho absoluto (S 73,1%; AUC 0,77), mas especificidade 81,6% e VPP 6,5%. É conteúdo de **triagem/PS**, não de hemodinâmica — provavelmente merece página própria, não encaixe em hemo. |
| **Rec. 3** — rastreio pré-hospitalar em ambulância (condicional, "New") | Mesmo caso: escopo de PS. |
| **Rec. 89** — remoção ativa de fluido após fase aguda (condicional, evidência muito baixa) | Desressuscitação. Conversa direto com o gráfico de BH do Hub UTI. Evidência fraca — decidir se entra. |
| **Rec. 96** — bicarbonato em pH ≤ 7,2 + LRA (AKIN 2–3) | Hoje só aparece em `vm/hipercapnia.html`, fora do contexto de choque. |
| **Rec. 90/92** — transfusão restritiva (**forte**), insulina a partir de ≥ 180 mg/dL (**forte**) | Verificar se `do2.html` e `pratica.html` estão alinhados. |

### ✅ Verificado — sem divergência

- **Rec. 75** (recomendação **forte contra** titulação incremental de PEEP em
  SDRA moderada-grave): `vm/sdra.html` usa a **tabela ARDSnet Low PEEP**, que
  não é titulação incremental. Não há conflito.

---

## Achado fora de escopo — módulo VM

`vm/` tem **46 referências que citam UpToDate ou FCCS** (ex.: `vm/bnm.html`,
`capnografia.html`, `complicacoes.html`, `dissincronia.html`, `sdra.html`).
Mesmo problema que hemo tinha: fonte terciária no lugar da primária. Algumas já
citam a primária junto (`ACURASYS 2010; ROSE 2019`), o que facilita.

Não mexi — está fora do que foi combinado para esta sessão. Fica registrado
como próxima frente, se vocês quiserem o mesmo tratamento em VM.
