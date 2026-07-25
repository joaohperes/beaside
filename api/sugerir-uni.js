// Vercel Function — Assistente de Conduta UNIFICADO (be·aside)
// Integra as três bases clínicas do site em um único chat:
//   • Ventilação Mecânica  (vm.guide → api/knowledge.js, gerado por scripts/extract-knowledge.js)
//   • Hemodinâmica & Choque (hemo·guide)
//   • Neurocrítico          (neuro·guide)
//
// Substitui, na prática, os antigos /api/sugerir, /api/sugerir-hemo e /api/sugerir-neuro,
// que permanecem no repositório por compatibilidade. NÃO apaga nada — apenas centraliza.
//
// Variáveis de ambiente (configurar na Vercel, NUNCA no código):
//   ANTHROPIC_API_KEY  — chave da API da Anthropic
//   VMGUIDE_SENHA      — senha de acesso (a mesma dos assistentes anteriores)

import Anthropic from '@anthropic-ai/sdk';
import { KNOWLEDGE_BASE } from './knowledge.js';

const MODEL = 'claude-sonnet-4-6';

// Bases clínicas de Hemodinâmica e Neurocrítico (curadas no próprio site).
// Mantidas aqui como texto para o assistente unificado; a base de VM entra via KNOWLEDGE_BASE.
const HEMO_KB = "## Classificação dos Padrões de Choque\n- Hipovolêmico: DC ↓, RVS ↑, PVC ↓. VCI colapsável, pele fria, sangramento/perdas. Volume é a 1ª intervenção.\n- Distributivo (sepse/anafilaxia/neurogênico): DC ↑, RVS ↓. Pele quente, PP alargada. Vasopressor precoce (Nora). Volume guiado por dinâmicos (PLR/VPP).\n- Cardiogênico: DC ↓, RVS ↑, PVC ↑. FE reduzida, linhas B, IAM/miocardite/arritmia. Nora se PAM < 65, dobutamina se hipoperfusão persistente. Não dar volume cego.\n- Obstrutivo: DC ↓, RVS ↑, PVC ↑. VD dilatado, derrame pericárdico, ausência de sliding pleural. Tratar a causa: drenar tamponamento, trombolisar TEP, descomprimir pneumotórax.\n\n## Gasometria Pareada — SvcO₂ × Δ pCO₂\nColetar arterial + venosa central (CVC) simultaneamente.\n- Δ pCO₂ = pCO₂ venosa − pCO₂ arterial. Alvo: < 6 mmHg.\n- SvcO₂ alvo: ≥ 70%.\n\nQuadrantes interpretativos:\n- Q1 (SvcO₂ ≥ 70% + Δ < 6): Adequado. Sem hipoperfusão global. Manter monitoramento + lactato seriado.\n- Q2 (SvcO₂ < 70% + Δ < 6): Problema na oferta (DO₂). Avaliar Hb, SaO₂, DC. Transfundir se Hb < 7. Inotrópico se DC baixo.\n- Q3 (SvcO₂ ≥ 70% + Δ ≥ 6): Falsa segurança. Fluxo ruim apesar de SvcO₂ normal — shunting microcirculatório, hipóxia citopática. Não confiar na SvcO₂ isolada.\n- Q4 (SvcO₂ < 70% + Δ ≥ 6): Choque confirmado, baixo débito. Eco urgente. Volume, vasopressor ou inotrópico conforme padrão.\n\n## Oferta de O₂ (DO₂)\nDO₂ = DC × CaO₂ × 10. CaO₂ = (Hb × 1,34 × SaO₂) + (pO₂ × 0,003).\nHb domina o transporte (~98%). Transfundir se Hb < 7 g/dL em sepse; < 8–10 em cardiopata.\n\n## POCUS VCI + Dinâmicos\n- VCI < 1,5 cm / cIVC > 50% / dIVC > 18%: VCI colapsável → repor volume (cristaloide 250–500 mL).\n- VCI 1,5–2,1 cm / cIVC 20–50%: Zona cinzenta → PLR + medir VTI. Aumento > 12–15% no VTI → dar volume.\n- VCI > 2,1 cm / colapso < 20%: VCI dilatada → não dar volume. Eco urgente, vasopressor/inotrópico.\n- Em arritmia, esforço ou janela ruim: preferir PLR com VTI ou VPP (intubado).\n\n## Drogas Vasoativas — SSC 2026\nAlvo PAM ≥ 65 mmHg (60–65 se ≥ 65 anos). Vasopressor pode ser iniciado em acesso periférico de bom calibre.\n- 1ª droga: Noradrenalina 0,01–0,05 μg/kg/min (titular a cada 2–5 min). > 0,25–0,5 μg/kg/min → considerar 2ª.\n- 2ª droga: Vasopressina 0,03 U/min (dose fixa). Permite reduzir Nora.\n- Hidrocortisona 200 mg/dia se vasopressor crescente > 4 h.\n- Inotrópico: Dobutamina 2,5–5 μg/kg/min se DC baixo + hipoperfusão persiste (FE reduzida no eco).\n\n## Metas de Ressuscitação\nΔ pCO₂ < 6 · SvcO₂ ≥ 70% · Lactato em queda · PAM em alvo · Enchimento capilar < 3 s · Diurese ≥ 0,5 mL/kg/h.\nSe metas não atingidas: repetir gasometria pareada, POCUS, reconsiderar diagnóstico, escalonar drogas.\n\n## Protocolo RUSH (Rapid Ultrasound for Shock)\nPump (eco cardíaco): FE, VD, tamponamento.\nTank (volume): VCI, sliding pleural, linhas B, livre abdominal.\nPipes (vasos): aorta abdominal (AAA), TVP femoral/poplítea.\n\n## Lactato e Lactato Clearance\nLactato > 2 mmol/L = hipoperfusão tecidual. > 4 mmol/L = choque grave (mortalidade ↑).\nLactato clearance ≥ 10% em 2 h é meta de ressuscitação (SSC 2026 alternativa ao ScvO₂).\nCausas de lactato elevado SEM hipoperfusão: doença hepática grave, medicações (metformina, adrenalina), alcalose respiratória grave, leucemia/linfoma (Warburg).\n\n## Choque Séptico — SSC 2026 destaques\n- Bundle 1h: colher culturas → ATB amplo espectro → cristaloide balanceado 30 mL/kg se hipoperfusão → vasopressor se PAM < 65 → medir lactato.\n- Cristaloide balanceado preferencial (Ringer lactato) vs SF (↑ risco de acidose hiperclorêmica e AKI com SF).\n- Parâmetros dinâmicos (PLR, VPP) superiores a estáticos (PVC, PAOP) para responsividade a volume.\n- PAM alvo 60–65 mmHg em pacientes ≥ 65 anos (OVATION trial; sem diferença em desfechos vs ≥ 65 mmHg).\n\n## Tamponamento Cardíaco\nBeck's triad: hipotensão + jugulares distendidas + bulhas abafadas. Pulso paradoxal > 10 mmHg.\nEco: derrame + colapso diastólico de AD/VD + VCI dilatada sem colapso. Conduta: pericardiocentese urgente.\n\n## TEP com Choque Obstrutivo\nVD dilatado + septo paradoxal + VCI dilatada + hipoxemia. D-dímero + TC de tórax (AngioTC) se estável.\nInstável (choque/parada): trombolítico sistêmico (alteplase 100 mg em 2h). Embolectomia se contraindicação absoluta.\n\n## Choque Cardiogênico — Pitfalls\nInotrópico (dobutamina) ANTES de vasopressor se PAM > 50–55 mmHg com DC muito baixo → pode melhorar perfusão sem excessiva vasoconstrição.\nBalão intra-aórtico (BIA): não melhora mortalidade em IAM + choque (IABP-SHOCK II) — mas ainda usado como ponte.\nDispositivos de assistência ventricular percutâneos (Impella) em centros especializados.";

const NEURO_KB = "## Fisiologia Neuro Crítica\n- PPC = PAM − PIC. Alvo de PPC: 60–70 mmHg no TCE grave (Brain Trauma Foundation 2023).\n- Autorregulação cerebral: preserva FSC com PAM 50–150 mmHg. Lesada em TCE/AVC grave → FSC torna-se pressão-dependente. Meta PAM mais alta nesses casos.\n- PIC normal < 15 mmHg. Hipertensão intracraniana (HIC): > 20–22 mmHg por > 5 min.\n- Volume intracraniano = parênquima + LCR + sangue. Doutrina Monroe-Kellie: aumento de um reduz outro.\n- Osmoterapia age reduzindo conteúdo de água do parênquima (mannitol) ou aumentando tonacidade (NaCl hipertônico).\n\n## TCE Grave (GCS ≤ 8)\nMetas primárias:\n- PPC 60–70 mmHg. PAM alvo = PIC + 60.\n- PIC < 20 mmHg (monitorizar com DVE ou parafuso se GCS ≤ 8 + TC alterada).\n- PaO₂ > 80 mmHg / SpO₂ ≥ 94%. PaCO₂ 35–40 mmHg (normoventilação — hiperventilação só como ponte para cirurgia com herniação iminente).\n- Temperatura 36–37,5 °C. Glicemia 140–180 mg/dL.\n- Cabeceira 30° se PIC controlada; posição neutra do pescoço.\n- EVITAR: hipotensão episódica (PAM < 80 mata neurônios), hipóxia, hipo/hipernatremia, agitação sem sedação.\n\nEscalonamento para HIC refratária:\n1. HOB 30° + pescoço neutro + tratar dor/agitação.\n2. DVE + drenagem de LCR se posicionado.\n3. Osmoterapia: NaCl 3% 150–250 mL ou Manitol 0,5–1 g/kg.\n4. Sedação profunda (fentanil + midazolam/propofol). BNM se necessário.\n5. Hiperventilação temporária (PaCO₂ 30–35) como ponte.\n6. Craniectomia descompressiva / barbitúrico / hipotermia (com neurointensivista/neurocirurgia).\n\n## AVC Isquêmico Agudo\nJanelas terapêuticas:\n- Trombólise IV (alteplase 0,9 mg/kg, máx 90 mg, 10% em bólus): até 4,5 h do início (critérios ECASS 3).\n  Contraindicações absolutas: TC com hemorragia, AVC grave (NIHSS > 25 + área de infarto > 1/3 do MCA), cirurgia major < 14 d, anticoagulação terapêutica.\n- Trombectomia mecânica: até 24 h em oclusão de grande vaso (ICA, M1, basilar) com mismatch de perfusão (DAWN/DEFUSE 3).\n- PA no AVC isquêmico: NÃO tratar < 220/120 mmHg se sem trombólise. Se trombólise: manter < 180/105.\n- Glicemia 140–180. Temperatura ≤ 37,5 °C. SpO₂ ≥ 94%.\n\n## AVC Hemorrágico\n### Hemorragia Intraparenquimatosa (HIP)\n- PA: se PAS > 150 mmHg (ATACH-2): alvo PAS 130–150. Iniciar nicardipino IV ou labetalol. NÃO REDUZIR < 130 (pior desfecho).\n- Reverter anticoagulação IMEDIATAMENTE: warfarina → vit K IV + CCP 4F. NOAC → andexanet α (Xa) ou idarucizumab (dabigatrana).\n- Plaquetas < 100k + em uso de antiplaquetário: transfusão controversa (PATCH trial: pior desfecho).\n- Cirurgia: HIP cerebelar > 3 cm com compressão de tronco ou hidrocefalia → drenagem urgente. HIP supratentorial: indicação limitada (STICH 1 e 2 negativos, exceto lobar superficial).\n\n### Hemorragia Subaracnóidea (HSA)\n- Prioridade: transferência para centro experiente e oclusão completa do aneurisma por clipagem/embolização, preferencialmente em até 24 h.\n- Confirmação: TC sem contraste; completar investigação conforme tempo de início se TC negativa. Angio-TC para fonte; DSA se negativa/inconclusiva com padrão suspeito.\n- Escores: WFNS ou Hunt & Hess (gravidade clínica) e Fisher modificado (carga hemorrágica/risco de DCI).\n- Antes da oclusão: monitorização frequente e anti-hipertensivo IV de curta ação para evitar hipertensão grave, hipotensão e variabilidade. AHA/ASA 2023 não define alvo universal; individualizar com neurocirurgia e preservar PPC.\n- Nimodipino: 60 mg VO/SNG de 4/4 h por 21 dias, iniciado precocemente. Nunca IV. Reduz DCI e melhora desfecho, embora não reverta de forma confiável o vasoespasmo angiográfico.\n- DCI: janela D3–D14, pico ~D7. Exame seriado; DTC/CTA/CTP/EEG conforme exame e recursos. Se DCI sintomática com aneurisma protegido: euvolemia + elevação titulada da PA pela resposta clínica; resgate endovascular se refratária. Não fazer hipertensão/hipervolemia profiláticas.\n- Hidrocefalia sintomática: derivação urgente de LCR, geralmente DVE. Crise nova: tratar por cerca de 7 dias; profilaxia anticonvulsivante não é rotina, apenas alto risco. Evitar fenitoína.\n- Hiponatremia: diferenciar natriurese cerebral/hipovolemia de SIADH pelo estado volêmico, mas NÃO restringir água na HSA. Manter euvolemia, repor sódio/volume e usar salina hipertônica se sintomática conforme protocolo.\n\n## Status Epiléptico (SE)\nDefinição: crise > 5 min ou 2 crises sem recuperação.\nProtocolo de 1ª/2ª/3ª linha:\n- 0–5 min: benzodiazepínico IV (lorazepam 0,1 mg/kg ou diazepam 0,2 mg/kg) ou IM (midazolam 10 mg IM fora-hospital).\n- 5–20 min: fenitoína 20 mg/kg IV (< 50 mg/min) ou valproato 40 mg/kg IV ou levetiracetam 60 mg/kg IV.\n- > 20 min (SE refratário): anestesia (midazolam infusão, propofol ou barbitúrico). IOT + monitorização EEG contínua.\n- SE não convulsivo (SENC): diagnóstico por EEG. Frequente em TCE e pós-cardiac arrest. Alta suspeita em alteração de consciência sem causa óbvia.\n\n## Sedoanalgesia no Paciente Neuro\n- RASS alvo: 0 a −1 para exame neurológico (TCE/HSA/AVC). Sedação profunda (−4/−5) apenas com HIC refratária.\n- PROPOFOL: CUIDADO — reduz PIC (vasoconstrição cerebral) mas pode piorar PAM → PPC cai. PRIS (propofol infusion syndrome): > 48h + alta dose (> 4 mg/kg/h) → acidose metabólica + hipertrigliceridemia + CK elevada + insuficiência cardíaca. Suspender imediatamente.\n- MIDAZOLAM: acúmulo com uso prolongado, dificulta exame neurológico. Preferir quando necessário.\n- DEXMEDETOMIDINA: boa para agitação sem depressão respiratória. Não para HIC aguda.\n- FENTANIL: analgesia padrão. Não eleva PIC.\n- CETAMINA: CONTRAINDICADA historicamente em TCE (↑ PIC). Evidência atual mais nuançada — evitar até redefinição.\n- HALOPERIDOL: delirium agitado no neuro. Cautela com QTc.\n\n## Metas Gerais no Neurocrítico\n- PAM: suficiente para PPC ≥ 60–70 mmHg. Vasopressor (Nora) se necessário.\n- Glicemia: 140–180 mg/dL (hipoglicemia é tão danosa quanto hiperglicemia).\n- Sódio: evitar hipo/hipernatremia. Na HIC, preferir osmoterapia em bólus guiada por sintomas/PIC; não perseguir 145–155 como hiperosmolaridade profilática sem indicação individualizada.\n- Temperatura: normotermia ativa (36–37°C). Febre deteriora desfecho neurológico.\n- Profilaxia TVP: heparina SC após 24–48h de estabilidade hemorrágica. CPI precoce.";

const SYSTEM_PROMPT = `Você é o assistente de conduta do be·aside, apoio à decisão clínica para um(a) médico(a) plantonista de UTI/emergência. Cobre TRÊS domínios integrados — Ventilação Mecânica, Hemodinâmica & Choque e Neurocrítico — porque à beira do leito o mesmo paciente cruza esses eixos (ex.: SDRA que choca, TCE que precisa de VM e PAM-alvo). Você NÃO substitui o julgamento clínico — organiza o raciocínio e oferece sugestões para o profissional validar.

Esta é uma DISCUSSÃO CONTÍNUA sobre um mesmo paciente. As mensagens anteriores são o histórico do caso: leve em conta tudo que já foi informado (parâmetros de VM, hemodinâmica, gasometria, POCUS, nível de consciência, imagem, condutas) ao responder cada nova mensagem. Não repita o que já foi dito; construa sobre o histórico.

Identifique o(s) domínio(s) que o caso exige e use a(s) base(s) correspondente(s). Quando o caso for misto, integre — não trate VM, hemodinâmica e neuro como silos.

════════════════════════════════════════════
BASE DE CONHECIMENTO 1 — VENTILAÇÃO MECÂNICA (vm·guide, conteúdo curado do be·aside):
${KNOWLEDGE_BASE}

════════════════════════════════════════════
BASE DE CONHECIMENTO 2 — HEMODINÂMICA & CHOQUE (hemo·guide — SSC 2026 · UpToDate · FCCS):

${HEMO_KB}

════════════════════════════════════════════
BASE DE CONHECIMENTO 3 — NEUROCRÍTICO (neuro·guide — UpToDate · FCCS · AHA/NCS 2023–2025):

${NEURO_KB}

════════════════════════════════════════════
FONTE DAS RESPOSTAS — REGRA CENTRAL:
As três bases acima são sua referência PRIMÁRIA. Sempre que uma recomendação puder ser sustentada por elas, use-as e prefira-as ao seu conhecimento geral.
- Sinalize a origem POR BLOCO, não por linha, indicando a base: ex. ao fim de uma seção "Fonte: vm·guide — DPOC & Asma", "Fonte: hemo·guide — Quadrantes", "Fonte: neuro·guide — TCE".
- Quando as bases NÃO cobrirem o ponto, marque uma vez: "(fora das bases do be·aside — conhecimento médico geral, confirmar)". Nunca apresente conhecimento externo como se fosse do site.
- Se houver conflito entre as bases e seu conhecimento geral, siga as bases e aponte a divergência.

DOSES, DILUIÇÕES E VAZÃO DE BOMBA — quando o caso envolver droga contínua (vasopressor, inotrópico, sedação, osmoterapia etc.):
- Dê a DOSE em faixa terapêutica (ex.: μg/kg/min, mg/kg/h) com a lógica de titulação.
- Quando houver diluição padrão conhecida, apresente-a e derive a VAZÃO DA BOMBA em mL/h para a dose alvo, mostrando a conta (concentração da solução → mL/h para o peso informado).
- Quando fizer sentido, indique a CONCENTRAÇÃO mínima e máxima usual da solução (ex.: padrão vs. concentrada para restrição hídrica/acesso central) e o impacto na vazão.
- SEMPRE exija o peso para cálculos por kg; se o peso não foi informado, peça-o em vez de estimar. Deixe explícito que diluição/concentração seguem o protocolo da instituição, que pode divergir.

REGRAS ABSOLUTAS:
- Trate suas saídas como SUGESTÕES a validar pelo plantonista, nunca como prescrição.
- Se faltarem dados essenciais (peso/altura/sexo para PBW e doses, gasometria, POCUS, GCS, TC, PIC, PA), diga explicitamente o que falta.
- Nunca invente valores. Se um número não foi fornecido, não o estime como se fosse real.

CONCISÃO — É PLANTÃO, NÃO ARTIGO:
- ABRA SEMPRE com a CONDUTA IMEDIATA: 1 a 3 ações acionáveis, em poucas linhas, antes de qualquer explicação.
- O detalhe (raciocínio, tabelas, mecanismo, cálculo de vazão) vem DEPOIS e deve ser enxuto. Corte o que não muda a conduta.
- Prefira bullets curtos. Use tabela só quando ela condensa (ex.: atual → sugerido; dose → mL/h). Não repita o histórico.

FORMATO:
- PRIMEIRA avaliação (plantonista apresenta o paciente):
  ## Conduta imediata (ações prioritárias em bullets curtos)
  ## Raciocínio (o problema fisiopatológico central, em poucas linhas)
  ## Parâmetros / doses / metas sugeridas (tabela ou bullets; inclua vazão em mL/h quando houver droga contínua)
  ## Reavaliar / não fazer (o que checar, sinais de alarme, erros a evitar)
  ## Dados faltantes (o que falta para refinar; "nenhum" se completo)
- PERGUNTAS DE ACOMPANHAMENTO: responda direto à pergunta, sem repetir as seções. A resposta acionável primeiro; só o detalhe necessário.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  // Gate de senha (mesma dos assistentes anteriores)
  const senha = req.headers['x-vmguide-senha'] || (req.body && req.body.senha);
  if (!process.env.VMGUIDE_SENHA || senha !== process.env.VMGUIDE_SENHA) {
    res.status(401).json({ error: 'Senha incorreta ou ausente.' });
    return;
  }

  // Aceita a conversa completa do caso (turnos user/assistant alternados).
  // Compatível com o formato antigo (apenas {anamnese}) como 1º turno.
  let messages = req.body && Array.isArray(req.body.messages) ? req.body.messages : null;
  if (!messages && req.body && typeof req.body.anamnese === 'string') {
    messages = [{ role: 'user', content: req.body.anamnese }];
  }

  if (!messages || messages.length === 0) {
    res.status(400).json({ error: 'Cole os dados do paciente antes de enviar.' });
    return;
  }
  if (messages.length > 60) {
    res.status(400).json({ error: 'Conversa muito longa. Inicie um novo caso.' });
    return;
  }

  let total = 0;
  const clean = [];
  for (const m of messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') {
      res.status(400).json({ error: 'Formato de conversa inválido.' });
      return;
    }
    const content = m.content.trim();
    if (!content) continue;
    total += content.length;
    clean.push({ role: m.role, content });
  }
  if (clean.length === 0 || clean[clean.length - 1].role !== 'user') {
    res.status(400).json({ error: 'Envie uma mensagem do plantonista.' });
    return;
  }
  if (total > 40000) {
    res.status(400).json({ error: 'Conversa muito longa (limite de tamanho). Inicie um novo caso.' });
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'API key não configurada no servidor.' });
    return;
  }

  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      maxRetries: 4, // tolera 429/5xx/529 (sobrecarga) com backoff exponencial
    });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      // System prompt (com as três bases fixas) marcado como cacheável: turnos seguintes
      // leem as bases a ~10% do custo, em vez de reenviá-las cheias.
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: clean,
    });

    const texto = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    res.status(200).json({ sugestao: texto });
  } catch (err) {
    console.error('Erro na API Anthropic:', err && err.message);
    if (err && (err.status === 529 || err.status === 429)) {
      res.status(503).json({ error: 'Serviço de IA sobrecarregado no momento. Aguarde alguns segundos e tente novamente.' });
      return;
    }
    const status = err && err.status >= 400 && err.status < 500 ? 502 : 500;
    res.status(status).json({ error: 'Falha ao consultar o assistente. Tente novamente.' });
  }
}
