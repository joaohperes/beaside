#!/usr/bin/env node
// Extrai o texto médico/clínico dos HTMLs do site e gera api/knowledge.js
// Cobre TODOS os módulos de conteúdo: VM, Hemo, Neuro, Procedimentos e Artigos
// (Central de Conhecimento) — a mesma base que alimenta o Assistente de Conduta
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
    'fisiologia.html', 'modos.html', 'parametros.html', 'indutores.html',
    'sedoanalgesia.html', 'sdra.html', 'prona.html', 'dpoc-asma.html',
    'hipercapnia.html', 'tce.html', 'complicacoes.html', 'capnografia.html',
    'dissincronia.html', 'bnm.html', 'desmame.html', 'vni.html',
    'tabelas.html', 'pearls.html',
  ],
  hemo: [
    'fisio.html', 'do2.html', 'rush.html', 'vci.html', 'ecg.html',
    'scvo2.html', 'dpco2.html', 'quadrantes.html', 'integracao.html',
    'fluxograma.html', 'padroes.html', 'drogas.html', 'pratica.html',
    'siglas.html', 'pearls.html',
  ],
  neuro: [
    'fisio.html', 'tce.html', 'avc-i.html', 'avc-h.html', 'enc.html',
    'vm.html', 'metabolico.html', 'pos-op.html', 'sedoanalgesia.html',
    'pearls.html',
  ],
  proc: [
    'cvc.html', 'linha-arterial.html', 'io.html', 'iot.html', 'vad.html',
    'traqueo.html', 'toracocentese.html', 'dreno.html', 'paracentese.html',
    'pl.html', 'pai.html', 'swan.html', 'ritmo.html', 'pearls.html',
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
  artigos: 'KNOWLEDGE_ARTIGOS',
};

function extractMainContent(html) {
  const m = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  return m ? m[1] : html;
}

function extractTitle(html, fallback) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) {
    const t = h1[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (t) return t;
  }
  const title = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (title) {
    const t = title[1].replace(/\s*[—-]\s*be·aside\s*$/i, '').trim();
    if (t) return t;
  }
  return fallback;
}

function stripHtml(html) {
  return html
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
// KNOWLEDGE_ARTIGOS) — consumidos pelo Assistente de Conduta unificado (api/sugerir-uni.js).

`;

let totalChars = 0;
let totalPages = 0;

for (const [mod, files] of Object.entries(PAGES_BY_MODULE)) {
  const sections = [];
  for (const file of files) {
    const relPath = join(mod, file);
    try {
      const html = readFileSync(join(root, relPath), 'utf8');
      const main = extractMainContent(html);
      const title = extractTitle(html, file.replace(/\.html$/, ''));
      const text = stripHtml(main);
      sections.push(`# ${title}\n\n${text}`);
      totalPages++;
      console.log(`  ✓ ${relPath} — "${title}" — ${text.length} chars`);
    } catch (e) {
      console.warn(`  ✗ ${relPath}: ${e.message}`);
    }
  }
  const knowledge = sections.join('\n\n---\n\n');
  totalChars += knowledge.length;
  output += `export const ${EXPORT_NAME[mod]} = ${JSON.stringify(knowledge)};\n\n`;
}

// Alias de compatibilidade — mantém api/sugerir.js (endpoint antigo de VM) funcionando
// sem alteração, já que ele importa { KNOWLEDGE_BASE }.
output += `// Compatibilidade com api/sugerir.js (endpoint antigo, mantido no repo)\nexport const KNOWLEDGE_BASE = KNOWLEDGE_VM;\n`;

writeFileSync(join(root, 'api', 'knowledge.js'), output);
console.log(`\nKnowledge base: ${totalPages} páginas | ${totalChars} chars | ~${Math.round(totalChars / 4)} tokens estimados | ${Object.keys(PAGES_BY_MODULE).length} módulos`);
