#!/usr/bin/env node
// Extrai o texto médico/clínico dos HTMLs do site e gera api/knowledge.js
// Cobre TODOS os módulos de conteúdo: VM, Hemo, Neuro, Procedimentos e Artigos
// (Perguntas de Plantão) — a mesma base que alimenta o Assistente de Conduta
// unificado (api/sugerir-uni.js).
//
// Execute: node scripts/extract-knowledge.js  (ou: npm run extract-knowledge)
//
// Como manter atualizado:
//   Ao publicar uma página nova de conteúdo clínico, adicione o arquivo na lista
//   do módulo correspondente em PAGES_BY_MODULE abaixo e rode este script de novo.
//   O título é extraído automaticamente do <h1>/<title> da própria página — não
//   precisa duplicar o texto do título aqui, só o caminho do arquivo.
//   Páginas puramente interativas (calculadoras, quiz) ficam de fora de propósito:
//   têm pouco texto estático e adicionam ruído/tokens sem ganho real de conteúdo.

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// ── Páginas por módulo ──────────────────────────────────────────────────
// (title omitido = extraído automaticamente do <h1 class="section-title"> ou <title>)
/* ⚠️  Bloco gerado por scripts/build-content.js a partir de conteudo/manifest.json.
   Não editar à mão: rode `npm run build:content` depois de mudar o manifesto. */
/* AUTO:conteudo */
const PAGES_BY_MODULE = {
  vm: [
    'fluxograma.html', 'fisiologia.html', 'modos.html', 'parametros.html',
    'indutores.html', 'sedoanalgesia.html', 'sdra.html', 'prona.html',
    'dpoc-asma.html', 'hipercapnia.html', 'tce.html', 'complicacoes.html',
    'capnografia.html', 'dissincronia.html', 'bnm.html', 'desmame.html',
    'vni.html', 'tabelas.html', 'pearls.html',
  ],
  hemo: [
    'fluxograma.html', 'fisio.html', 'do2.html', 'rush.html', 'vci.html',
    'ecg.html', 'scvo2.html', 'dpco2.html', 'quadrantes.html', 'vti.html',
    'integracao.html', 'padroes.html', 'drogas.html', 'pratica.html',
    'siglas.html', 'pearls.html',
  ],
  neuro: [
    'fluxograma.html', 'fisio.html', 'tce.html', 'avc-h.html', 'vm.html',
    'metabolico.html', 'pos-op.html', 'sedoanalgesia.html',
  ],
  proc: [
    'cvc.html', 'linha-arterial.html', 'io.html', 'iot.html', 'vad.html',
    'traqueo.html', 'toracocentese.html', 'dreno.html', 'paracentese.html',
    'pl.html', 'pai.html', 'swan.html', 'ritmo.html', 'pearls.html',
  ],
  peri: [
    'pre-op.html', 'atb.html', 'manejo.html', 'pocus.html',
  ],
  infecto: [
    'empirico.html', 'pkpd.html', 'resistencia.html', 'mdr.html',
    'pneumonia.html', 'abdome.html', 'urinario.html', 'partesmoles.html',
    'snc.html', 'bacteremia.html', 'candidemia.html', 'cdiff.html',
    'neutropenia.html',
  ],
  artigos: [
    'perguntas-plantao-hemodinamica.html', 'medidas-gerais-neurocritico.html',
    'hipotensao-pos-intubacao.html', 'peep-alta-queda-pressao.html',
    'dissincronia-paciente-ventilador.html',
    'shiley-saiu-decanulacao-acidental.html',
    'rebaixamento-consciencia-paciente-ventilado.html',
    'sepsis-2026-o-que-mudou.html',
  ],
};
/* /AUTO:conteudo */

// Nome de export por módulo (usado em api/knowledge.js e no system prompt do assistente)
const EXPORT_NAME = {
  vm: 'KNOWLEDGE_VM',
  hemo: 'KNOWLEDGE_HEMO',
  neuro: 'KNOWLEDGE_NEURO',
  proc: 'KNOWLEDGE_PROC',
  peri: 'KNOWLEDGE_PERI',
  infecto: 'KNOWLEDGE_INFECTO',
  artigos: 'KNOWLEDGE_ARTIGOS',
};

// PAGES_BY_MODULE é gerado a partir do manifesto; EXPORT_NAME é escrito à mão.
// Módulo novo entrando no manifesto sem a linha correspondente aqui gerava
// `export const undefined = ""` — que é JavaScript VÁLIDO, então nem a checagem
// de sintaxe pegava: a base do módulo simplesmente não existia e ninguém via.
// Agora o build para e diz o que falta.
function exportName(mod) {
  const nome = EXPORT_NAME[mod];
  if (!nome) {
    console.error(`\n✗ Módulo "${mod}" está em PAGES_BY_MODULE mas não tem nome de export em EXPORT_NAME.`);
    console.error(`  Adicione  ${mod}: 'KNOWLEDGE_${mod.toUpperCase()}',  em scripts/extract-knowledge.js e rode de novo.`);
    console.error('  Lembre também de importar o export novo em api/sugerir-uni.js quando o módulo sair do rascunho.');
    process.exit(1);
  }
  return nome;
}

// ── Conteúdo clínico embutido em JavaScript ────────────────────────────
// Algumas páginas (Pearls & Pitfalls, por exemplo) renderizam os cards a partir de
// um array literal dentro de <script>. Sem isto, a IA enxerga uma página de 130
// caracteres e não sabe que existem dezenas de cenários clínicos ali dentro.
const ROTULOS = {
  categoria: 'Categoria', titulo: 'Caso', cenario: 'Cenário',
  pearl: 'Conduta certa', pitfall: 'Erro comum', porque: 'Por quê',
  resposta: 'Resposta', explicacao: 'Explicação', pergunta: 'Pergunta',
  dica: 'Dica', nota: 'Nota', comentario: 'Comentário'
};

function fatiarLiteral(src, abre) {
  // devolve o literal completo a partir de '[' equilibrando colchetes,
  // ignorando o que está dentro de string ou comentário
  let i = abre, dep = 0, aspas = null, esc = false;
  for (; i < src.length; i++) {
    const c = src[i];
    if (aspas) {
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === aspas) aspas = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { aspas = c; continue; }
    if (c === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); if (i === -1) break; continue; }
    if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i); if (i === -1) break; i++; continue; }
    if (c === '[') dep++;
    else if (c === ']') { dep--; if (dep === 0) return src.slice(abre, i + 1); }
  }
  return null;
}

function extrairDadosEmJs(html) {
  const blocos = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const partes = [];
  for (const js of blocos) {
    for (const decl of js.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\[/g)) {
      const literal = fatiarLiteral(js, decl.index + decl[0].length - 1);
      if (!literal || literal.length < 200) continue;
      let dados;
      try { dados = new Function(`return ${literal}`)(); } catch { continue; }
      if (!Array.isArray(dados)) continue;
      const uteis = dados.filter((d) => d && typeof d === 'object' && !Array.isArray(d) &&
        Object.values(d).some((v) => typeof v === 'string' && v.length >= 40));
      if (uteis.length < 2) continue;               // config/opções curtas: ignora
      const linhas = [];
      for (const item of uteis) {
        const cab = item.titulo || item.title || item.nome || item.pergunta || '';
        linhas.push(cab ? `\n## ${cab}` : '');
        for (const [k, v] of Object.entries(item)) {
          if (typeof v !== 'string' || !v.trim()) continue;
          if (['titulo', 'title', 'nome', 'pergunta'].includes(k) && v === cab) continue;
          linhas.push(`${ROTULOS[k] || k}: ${v.trim()}`);
        }
      }
      partes.push(linhas.join('\n').trim());
    }
  }
  return partes.join('\n\n').trim();
}

function extractMainContent(html) {
  const m = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  return m ? m[1] : html;
}

function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
}

function extractTitle(html, fallback) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) {
    const t = decodeEntities(h1[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ')).trim();
    if (t) return t;
  }
  const title = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (title) {
    const t = decodeEntities(title[1].replace(/\s*[—-]\s*be·aside\s*$/i, '')).trim();
    if (t) return t;
  }
  return fallback;
}

// Tabela rotulada para a IA.
//
// O stripHtml genérico transforma <tr> em quebra de linha e <td> em " | ".
// Numa tabela curta isso basta: o cabeçalho fica logo acima e a leitura é óbvia.
// Numa tabela longa de dose, não: a linha da meropenem pode estar a 60 linhas do
// cabeçalho, e aí o significado de cada coluna ("isso é o ataque ou a manutenção?")
// depende de o modelo contar pipes corretamente. Coluna trocada em tabela de dose
// é dose errada na beira do leito.
//
// Por isso, toda <table data-ia="rotular"> é convertida linha a linha com o nome da
// coluna colado no valor. Custa tokens, então é opt-in: marque no HTML só as tabelas
// em que trocar de coluna muda a conduta (dose, ajuste renal, intervalo).
function rotularTabelas(html) {
  return html.replace(/<table\b[^>]*\bdata-ia="rotular"[^>]*>([\s\S]*?)<\/table>/gi, (_, corpo) => {
    const linhas = corpo.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
    let cabecalho = [];
    const saida = [];

    for (const linha of linhas) {
      const celulas = (linha.match(/<(th|td)[^>]*>[\s\S]*?<\/\1>/gi) || []).map(c =>
        c.replace(/<br\s*\/?>/gi, '; ')
         .replace(/<[^>]+>/g, '')
         .replace(/\s+/g, ' ')
         .trim()
      );
      if (!celulas.length) continue;

      if (/<th[^>]*>/i.test(linha) && !cabecalho.length) {
        cabecalho = celulas;
        continue;
      }
      const rotuladas = celulas
        .map((v, i) => (v ? (cabecalho[i] ? cabecalho[i] + ': ' : '') + v : ''))
        .filter(Boolean);
      if (rotuladas.length) saida.push('• ' + rotuladas.join(' — '));
    }
    return '\n' + saida.join('\n') + '\n';
  });
}

function stripHtml(html) {
  return rotularTabelas(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    // Cabeçalhos → linha com marcação
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, l, t) => '\n' + '#'.repeat(+l) + ' ' + t.replace(/<[^>]+>/g, '') + '\n')
    // Linhas de tabela
    .replace(/<tr[^>]*>/gi, '\n')
    .replace(/<\/?(th|td)[^>]*>/gi, ' | ')
    // Listas
    .replace(/<li[^>]*>/gi, '\n• ')
    // Quebras de bloco
    .replace(/<\/?(p|div|br|section|article|ul|ol|table|thead|tbody|blockquote)[^>]*>/gi, '\n')
    // Remove tags restantes
    .replace(/<[^>]+>/g, '')
    // Entidades HTML
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/&#[0-9]+;/g, '').replace(/&[a-z]+;/g, '')
    // Limpa espaços
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

let output = `// Auto-gerado por scripts/extract-knowledge.js — não editar manualmente.
// Para atualizar: node scripts/extract-knowledge.js (ou: npm run extract-knowledge)
//
// Um export por módulo (KNOWLEDGE_VM, KNOWLEDGE_HEMO, KNOWLEDGE_NEURO, KNOWLEDGE_PROC,
// KNOWLEDGE_PERI, KNOWLEDGE_INFECTO, KNOWLEDGE_ARTIGOS) — consumidos pelo Assistente de Conduta
// unificado (api/sugerir-uni.js). Entram aqui as páginas com ia:true e status
// publicado ou rascunho; em-breve e oculto ficam de fora. Export vazio = módulo
// sem nenhuma página nessas condições.

`;

let totalChars = 0;
let totalPages = 0;
// Guarda de qualidade: página na base da IA com texto abaixo disto quase certamente
// é placeholder ou tem o conteúdo preso em JS que este script não conseguiu ler.
const MIN_CHARS = 900;
const magras = [];

for (const [mod, files] of Object.entries(PAGES_BY_MODULE)) {
  const sections = [];
  for (const file of files) {
    const relPath = join(mod, file);
    try {
      const html = readFileSync(join(root, relPath), 'utf8');
      const main = extractMainContent(html);
      const title = extractTitle(html, file.replace(/\.html$/, ''));
      let text = stripHtml(main);
      const emJs = extrairDadosEmJs(html);
      if (emJs && emJs.length > text.length / 2) text = `${text}\n\n${emJs}`.trim();
      sections.push(`# ${title}\n\n${text}`);
      totalPages++;
      if (text.length < MIN_CHARS) magras.push({ relPath, title, len: text.length });
      console.log(`  ${text.length < MIN_CHARS ? '⚠' : '✓'} ${relPath} — "${title}" — ${text.length} chars`);
    } catch (e) {
      console.warn(`  ✗ ${relPath}: ${e.message}`);
    }
  }
  const knowledge = sections.join('\n\n---\n\n');
  totalChars += knowledge.length;
  output += `export const ${exportName(mod)} = ${JSON.stringify(knowledge)};\n\n`;
}

// Alias de compatibilidade — mantém api/sugerir.js (endpoint antigo de VM) funcionando
// sem alteração, já que ele importa { KNOWLEDGE_BASE }.
output += `// Compatibilidade com api/sugerir.js (endpoint antigo, mantido no repo)\nexport const KNOWLEDGE_BASE = KNOWLEDGE_VM;\n`;

writeFileSync(join(root, 'api', 'knowledge.js'), output);
if (magras.length) {
  console.log(`\n⚠️  ${magras.length} página(s) na base da IA com menos de ${MIN_CHARS} caracteres —`);
  console.log('   a IA vai "conhecer" a página sem ter o que responder sobre ela.');
  console.log('   Corrija o conteúdo, ou marque ia:false / status:"em-breve" em conteudo/manifest.json:');
  for (const m of magras) console.log(`     · ${m.relPath} — "${m.title}" — ${m.len} chars`);
}
console.log(`\nKnowledge base: ${totalPages} páginas | ${totalChars} chars | ~${Math.round(totalChars / 4)} tokens estimados | ${Object.keys(PAGES_BY_MODULE).length} módulos`);
