#!/usr/bin/env node
// Extrai o texto médico dos HTMLs e gera api/knowledge.js
// Execute: node scripts/extract-knowledge.js

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const PAGES = [
  { file: 'vm/fisiologia.html',    title: 'Fisiologia da Ventilação Mecânica' },
  { file: 'vm/modos.html',         title: 'Modos Ventilatórios' },
  { file: 'vm/parametros.html',    title: 'Parâmetros Ventilatórios Iniciais' },
  { file: 'vm/sdra.html',          title: 'SDRA — Ventilação Protetora (LTVV)' },
  { file: 'vm/desmame.html',       title: 'Desmame e Extubação' },
  { file: 'vm/dissincronia.html',  title: 'Dissincronia Paciente-Ventilador' },
  { file: 'vm/dpoc-asma.html',     title: 'DPOC e Asma em VM' },
  { file: 'vm/hipercapnia.html',   title: 'Hipercapnia e Manejo de CO₂' },
  { file: 'vm/indutores.html',     title: 'Indução e Intubação em Sequência Rápida (ISR)' },
  { file: 'vm/sedoanalgesia.html', title: 'Sedoanalgesia em VM' },
  { file: 'vm/bnm.html',           title: 'Bloqueio Neuromuscular (BNM)' },
  { file: 'vm/prona.html',         title: 'Posição Prona' },
  { file: 'vm/tce.html',           title: 'VM no TCE e Hipertensão Intracraniana' },
  { file: 'vm/vni.html',           title: 'VNI e Oxigenioterapia de Alto Fluxo' },
  { file: 'vm/capnografia.html',   title: 'Capnografia e EtCO₂' },
  { file: 'vm/complicacoes.html',  title: 'Complicações da VM' },
  { file: 'vm/tabelas.html',       title: 'Tabelas de Referência Rápida' },
];

function extractMainContent(html) {
  const m = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  return m ? m[1] : html;
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

const sections = [];
for (const { file, title } of PAGES) {
  try {
    const html = readFileSync(join(root, file), 'utf8');
    const main = extractMainContent(html);
    const text = stripHtml(main);
    sections.push(`# ${title}\n\n${text}`);
    console.log(`  ✓ ${file} — ${text.length} chars`);
  } catch (e) {
    console.warn(`  ✗ ${file}: ${e.message}`);
  }
}

const knowledge = sections.join('\n\n---\n\n');

const output = `// Auto-gerado por scripts/extract-knowledge.js — não editar manualmente.
// Para atualizar: node scripts/extract-knowledge.js

export const KNOWLEDGE_BASE = ${JSON.stringify(knowledge)};
`;

writeFileSync(join(root, 'api', 'knowledge.js'), output);
console.log(`\nKnowledge base: ${knowledge.length} chars | ${Math.round(knowledge.length / 4)} tokens estimados | ${sections.length} seções`);
