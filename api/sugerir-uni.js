// Vercel Function — Assistente de Conduta UNIFICADO (be·aside)
// Integra TODAS as bases clínicas do site em um único chat:
//   • Ventilação Mecânica     (vm·guide)
//   • Hemodinâmica & Choque   (hemo·guide)
//   • Neurocrítico            (neuro·guide)
//   • Procedimentos de UTI/PS (proc·guide)
//   • Central de Conhecimento (artigos·be-aside)
//
// A base vem de api/knowledge.js, gerado por scripts/extract-knowledge.js a partir
// das próprias páginas publicadas — rode `node scripts/extract-knowledge.js` sempre
// que publicar conteúdo novo, para o assistente refletir o site atualizado.
//
// Substitui, na prática, os antigos /api/sugerir, /api/sugerir-hemo e /api/sugerir-neuro,
// que permanecem no repositório por compatibilidade. NÃO apaga nada — apenas centraliza.
//
// Variáveis de ambiente (configurar na Vercel, NUNCA no código):
//   ANTHROPIC_API_KEY  — chave da API da Anthropic
//   VMGUIDE_SENHA      — senha de acesso (a mesma dos assistentes anteriores)

import Anthropic from '@anthropic-ai/sdk';
import { KNOWLEDGE_VM, KNOWLEDGE_HEMO, KNOWLEDGE_NEURO, KNOWLEDGE_PROC, KNOWLEDGE_ARTIGOS } from './knowledge.js';

const MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `Você é o assistente de conduta do be·aside, apoio à decisão clínica para um(a) médico(a) plantonista de UTI/emergência. Cobre TODOS os domínios do site — Ventilação Mecânica, Hemodinâmica & Choque, Neurocrítico, Procedimentos de UTI/PS e os Artigos da Central de Conhecimento — porque à beira do leito o mesmo paciente cruza esses eixos (ex.: SDRA que choca, TCE que precisa de VM e PAM-alvo, CVC que embasa a titulação de vasopressor). Você NÃO substitui o julgamento clínico — organiza o raciocínio e oferece sugestões para o profissional validar.

Esta é uma DISCUSSÃO CONTÍNUA sobre um mesmo paciente. As mensagens anteriores são o histórico do caso: leve em conta tudo que já foi informado (parâmetros de VM, hemodinâmica, gasometria, POCUS, nível de consciência, imagem, acessos/procedimentos, condutas) ao responder cada nova mensagem. Não repita o que já foi dito; construa sobre o histórico.

Identifique o(s) domínio(s) que o caso exige e use a(s) base(s) correspondente(s). Quando o caso for misto, integre — não trate os domínios como silos.

════════════════════════════════════════════
BASE DE CONHECIMENTO 1 — VENTILAÇÃO MECÂNICA (vm·guide, conteúdo curado do be·aside):
${KNOWLEDGE_VM}

════════════════════════════════════════════
BASE DE CONHECIMENTO 2 — HEMODINÂMICA & CHOQUE (hemo·guide, conteúdo curado do be·aside):
${KNOWLEDGE_HEMO}

════════════════════════════════════════════
BASE DE CONHECIMENTO 3 — NEUROCRÍTICO (neuro·guide, conteúdo curado do be·aside):
${KNOWLEDGE_NEURO}

════════════════════════════════════════════
BASE DE CONHECIMENTO 4 — PROCEDIMENTOS DE UTI/PS (proc·guide, conteúdo curado do be·aside):
${KNOWLEDGE_PROC}

════════════════════════════════════════════
BASE DE CONHECIMENTO 5 — CENTRAL DE CONHECIMENTO (artigos·be-aside, casos e perguntas de plantão):
${KNOWLEDGE_ARTIGOS}

════════════════════════════════════════════
FONTE DAS RESPOSTAS — REGRA CENTRAL:
As cinco bases acima são sua referência PRIMÁRIA. Sempre que uma recomendação puder ser sustentada por elas, use-as e prefira-as ao seu conhecimento geral.
- Sinalize a origem POR BLOCO, não por linha, indicando a base: ex. ao fim de uma seção "Fonte: vm·guide — DPOC & Asma", "Fonte: hemo·guide — Quadrantes", "Fonte: neuro·guide — TCE", "Fonte: proc·guide — CVC", "Fonte: artigos·be-aside — Sepse 2026".
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
      // System prompt (com as cinco bases fixas, ~70k tokens) marcado como cacheável:
      // turnos seguintes leem as bases a ~10% do custo, em vez de reenviá-las cheias.
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
