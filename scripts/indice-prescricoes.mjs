#!/usr/bin/env node
/**
 * indice-prescricoes.mjs — o mapa das prescrições comentadas para o app de IA.
 *
 * Por que existe: as 40 prescrições somam ~850 mil caracteres. Jogar isso no
 * prompt do assistente dobraria a base de conhecimento e estouraria o contexto.
 * A saída aqui é o caminho inverso — um índice PEQUENO (uma entrada por página)
 * que permite ao aplicativo:
 *
 *   1. escolher QUAL prescrição responde ao caso (pelos gatilhos e pelo escopo);
 *   2. carregar SÓ aquela página, sob demanda, quando precisar do texto inteiro;
 *   3. apontar o leitor para a âncora certa dentro dela (os itens da prescrição).
 *
 * Nada aqui é escrito à mão: tudo é EXTRAÍDO das próprias páginas e do
 * manifesto. Se a página mudar, o índice muda junto — rodar de novo e commitar.
 *
 * Rodar:  npm run indice-prescricoes
 * Saída:  conteudo/prescricoes-indice.json  (fonte legível, versionada)
 *         api/prescricoes-indice.js         (o módulo que o app importa)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(RAIZ, 'consulte', 'prescricoes');

const manifest = JSON.parse(fs.readFileSync(path.join(RAIZ, 'conteudo', 'manifest.json'), 'utf8'));
const modulo = manifest.modulos.find((m) => m.id === 'prescricoes');
if (!modulo) throw new Error('módulo "prescricoes" não está no manifesto');

/* ── utilidades de extração ─────────────────────────────────────────── */

const semTags = (s) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&rarr;/g, '→')
    .replace(/\s+/g, ' ')
    .trim();

const primeiro = (html, re) => {
  const m = html.match(re);
  return m ? semTags(m[1]) : null;
};

const todos = (html, re) => {
  const out = [];
  let m;
  const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  while ((m = r.exec(html)) !== null) out.push(semTags(m[1]));
  return out;
};

/* Os itens da prescrição: cada card tem um título e a condição em que se aplica.
   É o índice interno da página — e o que o app usa para apontar o trecho certo. */
function itens(html) {
  const out = [];
  const re = /<div class="rx-title">([\s\S]*?)<\/div>\s*(?:<div class="rx-cond">([\s\S]*?)<\/div>)?/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const titulo = semTags(m[1]);
    if (!titulo) continue;
    const quando = m[2] ? semTags(m[2]) : null;
    out.push(quando ? { titulo, quando } : { titulo });
  }
  return out;
}

/* "Serve para ..." — o parágrafo de escopo que toda prescrição abre. É a melhor
   frase única para o app decidir se a página responde ao caso. */
function escopo(html) {
  const p = primeiro(html, /<p class="prose">([\s\S]*?)<\/p>/);
  if (!p) return null;
  const corte = p.indexOf(' — ');
  const frase = corte > 40 ? p.slice(0, p.indexOf('.', corte) + 1 || p.length) : p;
  return (frase || p).trim();
}

/* O tema canônico: o assunto da página, sem o prefixo do formato. É o campo que
   distingue "a página É sobre DPOC" de "a página CITA DPOC". */
const tema = (pagina) => pagina.titulo.replace(/^Prescrição comentada\s*[—-]\s*/, '').trim();

/* Gatilhos: os termos pelos quais um plantonista chegaria nesta página.
   Saem do menu e dos títulos dos cards — nunca inventados. Fragmentos de prosa
   ("e ponto", "não substituir") são ruído: inflam o roteador e casam errado. */
const CONECTIVO = /^(e|ou|mas|se|que|com|sem|não|nem|até|para|por|de|do|da|no|na|em|ao|à|o|a|os|as|um|uma|isso|aqui|antes|depois|quando|onde|só|já|ainda)\b/;
function gatilhos(pagina, html, itensPag, temaPag) {
  const cru = [pagina.menu, temaPag, ...itensPag.map((i) => i.titulo)].join(' · ');
  const termos = new Set();
  for (const t of cru.split(/[·—,()/:]| - /)) {
    const s = t.trim().toLowerCase().replace(/[.?!]+$/, '');
    if (s.length < 4 || s.length > 42) continue;
    if (/^\d/.test(s)) continue;              // "40 mg por 5 dias" não é gatilho
    if (CONECTIVO.test(s)) continue;          // fragmento de frase partida
    if (!/[a-záéíóúâêôãõç]{4}/.test(s)) continue;
    if (s === temaPag.toLowerCase()) continue; // já está em `tema`
    termos.add(s);
  }
  return [...termos].slice(0, 10);
}

/* Calculadoras que a página usa, e páginas irmãs que ela referencia. */
const calculadoras = (html) => [
  ...new Set(todos(html, /href="calculadoras\.html#([a-z0-9-]+)"/).map((s) => s)),
];
const relacionadas = (html) => [
  ...new Set(
    todos(html, /href="([a-z0-9-]+\.html)"/).filter(
      (h) => h !== 'index.html' && h !== 'calculadoras.html'
    )
  ),
];

/* ── monta o índice ─────────────────────────────────────────────────── */

const entradas = [];
const referencias = [];
for (const pagina of modulo.paginas) {
  if (pagina.status === 'oculto') continue;
  /* hub e calculadoras não são prescrições: são as páginas de apoio do módulo */
  if (pagina.tipo === 'referencia') {
    referencias.push({
      id: pagina.id,
      url: `/consulte/prescricoes/${pagina.arquivo}`,
      titulo: pagina.titulo,
      subtitulo: pagina.subtitulo,
      papel: pagina.id === 'calculadoras' ? 'escores e fórmulas usados pelas prescrições' : 'índice do módulo',
    });
    continue;
  }
  const arquivo = path.join(DIR, pagina.arquivo);
  if (!fs.existsSync(arquivo)) {
    console.warn(`  ! ${pagina.arquivo} está no manifesto e não existe no disco`);
    continue;
  }
  const html = fs.readFileSync(arquivo, 'utf8');
  const corpo = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  const itensPag = itens(corpo);
  const temaPag = tema(pagina);

  entradas.push({
    id: pagina.id,
    arquivo: pagina.arquivo,
    url: `/consulte/prescricoes/${pagina.arquivo}`,
    tema: temaPag,
    titulo: pagina.titulo,
    subtitulo: pagina.subtitulo,
    sistema: pagina.categoria,
    status: pagina.status,
    escopo: escopo(corpo),
    gatilhos: gatilhos(pagina, corpo, itensPag, temaPag),
    itens: itensPag,
    calculadoras: calculadoras(corpo),
    relacionadas: relacionadas(corpo),
    referencias: todos(corpo, /<span class="ref">([\s\S]*?)<\/span>/).length,
    caracteres: semTags(corpo).length,
  });
}

entradas.sort((a, b) => (a.sistema + a.titulo).localeCompare(b.sistema + b.titulo, 'pt-BR'));

const comum = {
  gerado: new Date().toISOString().slice(0, 10),
  total: entradas.length,
  sistemas: [...new Set(entradas.map((e) => e.sistema))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
  referencias,
};

/* Duas camadas, de propósito.
   O ROTEADOR é o que cabe num prompt: só o suficiente para escolher a página.
   O MAPA acrescenta os itens de cada prescrição — carregado sob demanda, ou
   usado no servidor para apontar a âncora certa depois da escolha. */
const roteador = {
  _leia:
    'Roteador das prescrições comentadas do be·aside, para o aplicativo de IA próprio. ' +
    'GERADO por scripts/indice-prescricoes.mjs — não editar à mão. ' +
    'Uso: escolher QUAL prescrição responde ao caso (por escopo e gatilhos) e então carregar o HTML da url. ' +
    'Não contém conduta nem dose: ele diz ONDE a conduta está.',
  ...comum,
  prescricoes: entradas.map(({ itens, relacionadas, referencias: r, caracteres, arquivo, ...resto }) => resto),
};

const mapa = {
  _leia:
    'Mapa completo das prescrições comentadas — o roteador acrescido do índice interno de cada página ' +
    '(os itens da prescrição, com a condição de cada um) e das páginas relacionadas. ' +
    'GERADO por scripts/indice-prescricoes.mjs — não editar à mão.',
  ...comum,
  prescricoes: entradas,
};

const indice = mapa;

const jsonPath = path.join(RAIZ, 'conteudo', 'prescricoes-indice.json');
fs.writeFileSync(jsonPath, JSON.stringify(mapa, null, 1) + '\n');

const jsPath = path.join(RAIZ, 'api', 'prescricoes-indice.js');
fs.writeFileSync(
  jsPath,
  '// Auto-gerado por scripts/indice-prescricoes.mjs — não editar manualmente.\n' +
    '// Para atualizar: npm run indice-prescricoes\n' +
    '//\n' +
    '// Duas camadas: PRESCRICOES_ROTEADOR cabe num prompt e serve para ESCOLHER a\n' +
    '// prescrição; PRESCRICOES_MAPA acrescenta o índice interno de cada página.\n' +
    '// Nenhum dos dois traz dose: eles dizem onde a dose está.\n\n' +
    'export const PRESCRICOES_ROTEADOR = ' +
    JSON.stringify(roteador, null, 1) +
    ';\n\nexport const PRESCRICOES_MAPA = ' +
    JSON.stringify(mapa, null, 1) +
    ';\n'
);

const kb = (n) => (n / 1024).toFixed(0) + ' KB';
const tam = (o) => Buffer.byteLength(JSON.stringify(o));
const chars = entradas.reduce((s, e) => s + e.caracteres, 0);
console.log(`\nÍndice de prescrições — ${mapa.total} páginas, ${mapa.sistemas.length} sistemas`);
console.log(`  roteador  ${kb(tam(roteador))}  (~${Math.round(tam(roteador) / 4 / 1000)} mil tokens) — cabe no prompt`);
console.log(`  mapa      ${kb(tam(mapa))}  (~${Math.round(tam(mapa) / 4 / 1000)} mil tokens) — sob demanda`);
console.log(`  páginas   ${kb(chars)} de texto integral — o roteador é ${((tam(roteador) / chars) * 100).toFixed(1)}% disso`);
console.log(`  ${path.relative(RAIZ, jsonPath)} · ${path.relative(RAIZ, jsPath)}`);
const semEscopo = entradas.filter((e) => !e.escopo);
if (semEscopo.length) console.log(`  ! sem "Serve para": ${semEscopo.map((e) => e.id).join(', ')}`);
