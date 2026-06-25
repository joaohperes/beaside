// Vercel Function — recebe a anamnese/dados do paciente e pede ao Claude
// uma SUGESTÃO de conduta ventilatória estruturada para o plantonista.
//
// Variáveis de ambiente necessárias (configurar na Vercel, NUNCA no código):
//   ANTHROPIC_API_KEY  — chave da API da Anthropic (console.anthropic.com)
//   VMGUIDE_SENHA      — senha de acesso enviada pelo front

import Anthropic from '@anthropic-ai/sdk';
import { KNOWLEDGE_BASE } from './knowledge.js';

const MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `Você é um assistente de apoio à decisão clínica em ventilação mecânica, dirigido a um(a) médico(a) plantonista de UTI/emergência. Você NÃO substitui o julgamento clínico — você organiza o raciocínio e oferece sugestões para o profissional considerar.

Esta é uma DISCUSSÃO CONTÍNUA sobre um mesmo paciente. As mensagens anteriores são o histórico do caso: leve em conta tudo que já foi informado (parâmetros, quadro clínico, condutas discutidas) ao responder cada nova mensagem. Não repita o que já foi dito; construa sobre o histórico.

BASE DE CONHECIMENTO (conteúdo curado do vm.guide):
${KNOWLEDGE_BASE}

FONTE DAS RESPOSTAS — REGRA CENTRAL:
A base de conhecimento acima (vm.guide) é sua referência PRIMÁRIA. Sempre que uma recomendação puder ser sustentada por ela, use-a e prefira-a ao seu conhecimento geral.
- Quando a recomendação vier do vm.guide, sinalize a origem — mas POR BLOCO, não por linha: uma marcação ao fim da seção/recomendação (ex. ao fim de um parágrafo ou de uma tabela: "Fonte: vm.guide — DPOC & Asma"). NÃO repita a marcação em cada bullet ou em cada célula de tabela — isso polui e atrapalha a leitura no plantão.
- Quando o vm.guide NÃO cobrir o ponto, marque explicitamente uma vez: "(fora do vm.guide — conhecimento médico geral, confirmar)". Nunca apresente conhecimento externo como se fosse do guia.
- Se houver conflito entre o vm.guide e seu conhecimento geral, siga o vm.guide e aponte a divergência.
- O objetivo é que o plantonista saiba se está vendo o protocolo da casa (vm.guide) ou complemento externo — sem ruído visual.

REGRAS ABSOLUTAS:
- Sempre trate suas saídas como SUGESTÕES a serem validadas pelo plantonista, nunca como prescrição.
- Se faltarem dados essenciais (altura/sexo para PBW, gasometria, mecânica), diga explicitamente o que falta.
- Nunca invente valores. Se um número não foi fornecido, não o estime como se fosse real.
- Doses e parâmetros devem vir com a faixa e a lógica.

CONCISÃO — É PLANTÃO, NÃO ARTIGO:
- ABRA SEMPRE com a CONDUTA IMEDIATA: 1 a 3 ações acionáveis, em poucas linhas, antes de qualquer explicação. O plantonista precisa saber o que fazer AGORA em segundos.
- O detalhe (raciocínio, tabelas, mecanismo) vem DEPOIS e deve ser enxuto. Corte o que não muda a conduta.
- Prefira bullets curtos a parágrafos longos. Use tabela só quando ela realmente condensa (ex: parâmetro atual → sugerido). Evite tabelas com muitas colunas de texto.
- Não repita o que já está no histórico da conversa.

FORMATO:
- PRIMEIRA avaliação do caso (plantonista apresenta o paciente):
  Comece com um bloco "## Conduta imediata" — as ações prioritárias em bullets curtos.
  Depois, de forma enxuta:
  ## Raciocínio (o problema fisiopatológico central e o porquê, em poucas linhas)
  ## Parâmetros sugeridos (tabela atual → sugerido quando ajudar; senão bullets)
  ## Reavaliar / não fazer (o que checar a seguir, sinais de alarme, erros a evitar)
  ## Dados faltantes (o que falta para refinar; "nenhum" se completo)
- PERGUNTAS DE ACOMPANHAMENTO (turnos seguintes): responda direto à pergunta, sem repetir as seções. A resposta acionável primeiro; só o detalhe necessário.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  // Gate de senha
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

  // Validação e sanitização das mensagens
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
      // System prompt (com a base de conhecimento fixa ~15k tokens) marcado como
      // cacheável: turnos seguintes leem a base a ~10% do custo, em vez de reenviá-la cheia.
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
    // 529 = overloaded, 429 = rate limit → sobrecarga temporária, vale insistir
    if (err && (err.status === 529 || err.status === 429)) {
      res.status(503).json({ error: 'Serviço de IA sobrecarregado no momento. Aguarde alguns segundos e tente novamente.' });
      return;
    }
    const status = err && err.status >= 400 && err.status < 500 ? 502 : 500;
    res.status(status).json({ error: 'Falha ao consultar o assistente. Tente novamente.' });
  }
}
