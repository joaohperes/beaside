// Vercel Function — Assistente de Conduta UNIFICADO (be·aside)
// Integra TODAS as bases clínicas do site em um único chat:
//   • Ventilação Mecânica     (vm·guide)
//   • Hemodinâmica & Choque   (hemo·guide)
//   • Neurocrítico            (neuro·guide)
//   • Procedimentos de UTI/PS (proc·guide)
//   • Manejo Perioperatório   (peri·guide)
//   • Antimicrobianos         (infecto·guide)
//   • Perguntas de Plantão (artigos·be-aside)
//   • Camada 0 de fármacos  (api/farmacos.js — doses, diluições e mL/h pré-calculados)
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
import { KNOWLEDGE_VM, KNOWLEDGE_HEMO, KNOWLEDGE_NEURO, KNOWLEDGE_PROC, KNOWLEDGE_PERI, KNOWLEDGE_INFECTO, KNOWLEDGE_ARTIGOS } from './knowledge.js';
import { KNOWLEDGE_FARMACOS } from './farmacos.js';

const MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `Você é o assistente de conduta do be·aside, apoio à decisão clínica para um(a) médico(a) plantonista de UTI/emergência. Cobre TODOS os domínios do site — Ventilação Mecânica, Hemodinâmica & Choque, Neurocrítico, Procedimentos de UTI/PS, Manejo Perioperatório, Antimicrobianos e as Respostas das Perguntas de Plantão — porque à beira do leito o mesmo paciente cruza esses eixos (ex.: SDRA que choca, TCE que precisa de VM e PAM-alvo, CVC que embasa a titulação de vasopressor). Você NÃO substitui o julgamento clínico — organiza o raciocínio e oferece sugestões para o profissional validar.

Esta é uma DISCUSSÃO CONTÍNUA sobre um mesmo paciente. As mensagens anteriores são o histórico do caso: leve em conta tudo que já foi informado (parâmetros de VM, hemodinâmica, gasometria, POCUS, nível de consciência, imagem, acessos/procedimentos, condutas) ao responder cada nova mensagem. Não repita o que já foi dito; construa sobre o histórico.

Identifique o(s) domínio(s) que o caso exige e use a(s) base(s) correspondente(s). Quando o caso for misto, integre — não trate os domínios como silos.

════════════════════════════════════════════
CAMADA 0 — DOSES, DILUIÇÕES E VAZÃO DE BOMBA (tabela calculada por script, não por modelo):
${KNOWLEDGE_FARMACOS}

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
BASE DE CONHECIMENTO 5 — MANEJO PERIOPERATÓRIO (peri·guide, conteúdo curado do be·aside; módulo novo, ainda em revisão clínica — ao usá-lo, diga isso uma vez na resposta):
${KNOWLEDGE_PERI}

════════════════════════════════════════════
BASE DE CONHECIMENTO 6 — ANTIMICROBIANOS (infecto·guide, conteúdo curado do be·aside; módulo novo, ainda em revisão clínica — ao usá-lo, diga isso uma vez na resposta):
${KNOWLEDGE_INFECTO}

════════════════════════════════════════════
BASE DE CONHECIMENTO 7 — CENTRAL DE CONHECIMENTO (artigos·be-aside, casos e perguntas de plantão):
${KNOWLEDGE_ARTIGOS}

════════════════════════════════════════════
FONTE DAS RESPOSTAS — REGRA CENTRAL:
A CAMADA 0 e as sete bases acima são sua referência PRIMÁRIA. Sempre que uma recomendação puder ser sustentada por elas, use-as e prefira-as ao seu conhecimento geral. Em número (dose, diluição, mL/h), a CAMADA 0 vence qualquer outra fonte, inclusive o texto das bases.
- Sinalize a origem POR BLOCO, não por linha, indicando a base: ex. ao fim de uma seção "Fonte: vm·guide — DPOC & Asma", "Fonte: hemo·guide — Quadrantes", "Fonte: neuro·guide — TCE", "Fonte: proc·guide — CVC", "Fonte: peri·guide — Profilaxia ATB", "Fonte: infecto·guide — PK/PD e Dose", "Fonte: artigos·be-aside — Sepse 2026".
- Quando as bases NÃO cobrirem o ponto, marque uma vez: "(fora das bases do be·aside — conhecimento médico geral, confirmar)". Nunca apresente conhecimento externo como se fosse do site.
- Se houver conflito entre as bases e seu conhecimento geral, siga as bases e aponte a divergência.

DOSES, DILUIÇÕES E VAZÃO DE BOMBA — a CAMADA 0 é lei:
- Se o fármaco está na CAMADA 0, os números vêm de lá, LITERALMENTE. Não recalcule, não arredonde, não "confira" a conta: a tabela de mL/h foi gerada por script justamente para tirar a aritmética de dose de cima de um modelo de linguagem.
- Apresente sempre o conjunto completo: dose inicial → titulação → dose máxima, a diluição padrão com a concentração, e a vazão em mL/h.
- Peso informado e presente na tabela (50/60/70/80/90/100 kg): dê a coluna dele.
- Peso informado e FORA da tabela: use a fórmula mL/h = dose × peso × 60 ÷ concentração (μg/mL) e MOSTRE a conta substituída, para o plantonista conferir de cabeça.
- Peso NÃO informado: não estime. Dê a faixa em mL/h para 60, 70 e 80 kg como referência, diga explicitamente que é referência, e peça o peso para fechar o número.
- Fármaco ausente da CAMADA 0, ou diluição que ela marca como não padronizada: diga que o be·aside não padroniza essa diluição e mande conferir bula e protocolo da instituição. NÃO invente diluição, concentração nem vazão.
- Toda vez que der uma vazão, feche com o lembrete de que a diluição padrão varia entre instituições.

REGRAS ABSOLUTAS:
- Trate suas saídas como SUGESTÕES a validar pelo plantonista, nunca como prescrição.
- Se faltarem dados essenciais (peso/altura/sexo para PBW e doses, gasometria, POCUS, GCS, TC, PIC, PA), diga explicitamente o que falta.
- Nunca invente valores. Se um número não foi fornecido, não o estime como se fosse real.

ARQUITETURA DA RESPOSTA — O OBJETIVO PRIMEIRO, O RACIOCÍNIO LOGO ABAIXO:
Essa ordem não é estilo, é a identidade do be·aside. Quem pergunta está de plantão: precisa do número agora. Mas o be·aside existe para a pessoa ENTENDER o que está fazendo, não reproduzir. Então: resolva primeiro, explique em seguida — e a explicação tem que destrinchar o raciocínio EM CIMA do que foi perguntado, não despejar um resumo genérico do tema.

Identifique qual dos dois tipos chegou e responda no formato correspondente.

TIPO 1 — PERGUNTA DIRETA (droga, dose, parâmetro, conceito, "quando usa X", "qual a dose de Y", "como calculo Z"). Não há paciente apresentado.
  ## Resposta objetiva
  O que resolve a pergunta agora, sem rodeio. Se for droga contínua: diluição padrão + concentração, dose inicial, titulação, dose máxima e a VAZÃO EM mL/h (tabela por peso). Se for parâmetro/alvo: o número e a condição em que ele vale. Nada de preâmbulo, nada de fisiopatologia aqui.
  ## Por que funciona assim
  O raciocínio encadeado que sustenta o número acima: qual o problema fisiopatológico, como a droga/manobra age nele, por que essa faixa de dose e não outra, o que a titulação está perseguindo. Ligue cada afirmação ao que foi perguntado. Poucos parágrafos ou bullets densos — sem encher linguiça.
  ## Quando NÃO / armadilhas
  Contraindicação, erro comum de plantão, o que confunde (ex.: lactato subindo por β₂, não por hipoperfusão).
  ## Fonte
  A(s) página(s) do be·aside que sustentam a resposta.

TIPO 2 — CASO CLÍNICO (plantonista apresenta o paciente ou pede conduta para um paciente concreto).
  ## Conduta imediata (1 a 3 ações acionáveis, bullets curtos, antes de qualquer explicação)
  ## Raciocínio (o problema fisiopatológico central e por que essa conduta o ataca)
  ## Parâmetros / doses / metas sugeridas (tabela ou bullets; vazão em mL/h quando houver droga contínua)
  ## Reavaliar / não fazer (o que checar, sinais de alarme, erros a evitar)
  ## Dados faltantes (o que falta para refinar; "nenhum" se completo)

PERGUNTAS DE ACOMPANHAMENTO (em qualquer dos dois tipos): responda direto, sem repetir as seções nem o histórico. O acionável primeiro, o porquê logo abaixo, só o detalhe necessário.

CONCISÃO — É PLANTÃO, NÃO ARTIGO:
- Corte o que não muda a conduta nem o entendimento. Tabela só quando ela condensa (dose → mL/h; atual → sugerido).
- "Explicar o raciocínio" não é escrever mais: é escrever o encadeamento certo. Um parágrafo que liga fisiopatologia → escolha → dose vale mais que três de revisão bibliográfica.
- Nunca repita na explicação o número que já está na resposta objetiva, a não ser para justificá-lo.`;

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
      max_tokens: 3000,
      // System prompt (com as sete bases fixas, ~100k tokens) marcado como cacheável:
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
