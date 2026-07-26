#!/usr/bin/env node
// scripts/seo-tags.js — adiciona tags de SEO/GEO (canonical, Open Graph, Twitter Card,
// meta description) que estejam faltando, sem tocar em conteúdo visual nem em CSS/JS.
// Reaproveita texto editorial já existente na própria página (title, .section-subtitle,
// .lp-desc, .sec-lead) — nunca inventa descrição clínica nova.
// Também marca páginas utilitárias (login, sso-callback) como noindex, e gera
// sitemap.xml a partir do resultado final (só entra o que não é noindex).
//
// Executar: node scripts/seo-tags.js [--dry-run]

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative, dirname, sep } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const BASE_URL = 'https://be-aside.vercel.app';
const SITE_NAME = 'be·aside';
const DRY_RUN = process.argv.includes('--dry-run');

const SKIP_DIRS = new Set(['node_modules', '.git', 'hub-uti']);

// Páginas ainda em elaboração (status "em-breve" em conteudo/manifest.json) não podem
// ser indexadas: são placeholders de ~300 caracteres e entram no Google como conteúdo
// raso, o que derruba a avaliação de qualidade do site inteiro. Saem do sitemap
// automaticamente porque o sitemap só recebe o que não é noindex.
const manifesto = JSON.parse(readFileSync(join(root, 'conteudo/manifest.json'), 'utf8'));
const EM_BREVE = new Set(
  manifesto.modulos.flatMap((m) => m.paginas
    .filter((p) => p.status === 'em-breve')
    .map((p) => m.root + p.arquivo))
);
const UTILITY_NOINDEX = new Set(['login.html', 'sso-callback.html']);
// Paginas ja corretas ou sem valor de conteudo indexavel — nao mexer.
const SKIP_FILES = new Set(['conta.html', 'sso-callback.html', 'vm/assistente.html', 'hemo/assistente.html', 'neuro/assistente.html']);

function walk(dir, acc) {
  acc = acc || [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (entry.endsWith('.html')) acc.push(full);
  }
  return acc;
}

function urlPathFor(relPath) {
  if (relPath === 'index.html') return '/';
  if (relPath.endsWith('/index.html')) return '/' + relPath.slice(0, -'index.html'.length);
  return '/' + relPath;
}

function extractTag(html, re) {
  const m = html.match(re);
  return m ? m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : null;
}

function truncate(str, max) {
  if (!str || str.length <= max) return str;
  const cut = str.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim() + '…';
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const files = walk(root).map(f => relative(root, f));
const report = [];
const sitemapEntries = [];

for (const relPath of files) {
  if (SKIP_FILES.has(relPath)) continue;
  const full = join(root, relPath);
  let html = readFileSync(full, 'utf8');
  const original = html;
  const base = relPath.split('/').pop();

  const alreadyNoindexBefore = /name="robots"[^>]*noindex/i.test(html);
  const isUtility = UTILITY_NOINDEX.has(base) || EM_BREVE.has(relPath.split(sep).join('/'));

  if (isUtility && !alreadyNoindexBefore) {
    html = html.replace(/(<title>[\s\S]*?<\/title>)/i, '$1\n<meta name="robots" content="noindex, nofollow">');
  }

  const title = extractTag(html, /<title>([\s\S]*?)<\/title>/i) || SITE_NAME;
  const urlPath = urlPathFor(relPath);
  const canonicalUrl = BASE_URL + urlPath;

  const hasCanonical = /rel="canonical"/i.test(html);
  const hasDescriptionTag = /name="description"/i.test(html);
  const hasOgTitle = /property="og:title"/i.test(html);
  const hasOgDesc = /property="og:description"/i.test(html);
  const hasOgUrl = /property="og:url"/i.test(html);
  const hasOgType = /property="og:type"/i.test(html);
  const hasOgSite = /property="og:site_name"/i.test(html);
  const hasOgLocale = /property="og:locale"/i.test(html);
  const hasTwitter = /name="twitter:card"/i.test(html);

  let description = extractTag(html, /<meta name="description" content="([^"]*)"/i);
  let descSource = description ? 'existente' : null;
  if (!description) {
    description = extractTag(html, /class="section-subtitle"[^>]*>([\s\S]*?)<\/(?:p|h2|div)>/i);
    if (description) descSource = 'section-subtitle';
  }
  if (!description) {
    description = extractTag(html, /class="lp-desc"[^>]*>([\s\S]*?)<\/p>/i);
    if (description) descSource = 'lp-desc';
  }
  if (!description) {
    description = extractTag(html, /class="sec-lead"[^>]*>([\s\S]*?)<\/p>/i);
    if (description) descSource = 'sec-lead';
  }
  description = description ? truncate(description, 165) : null;

  const isArticle = relPath.startsWith('artigos/') && base !== 'index.html';
  const ogType = isArticle ? 'article' : 'website';

  const inject = [];
  if (!hasDescriptionTag && description) inject.push('<meta name="description" content="' + escapeAttr(description) + '">');
  if (!hasCanonical) inject.push('<link rel="canonical" href="' + canonicalUrl + '">');
  if (!hasOgType) inject.push('<meta property="og:type" content="' + ogType + '">');
  if (!hasOgSite) inject.push('<meta property="og:site_name" content="' + SITE_NAME + '">');
  if (!hasOgLocale) inject.push('<meta property="og:locale" content="pt_BR">');
  if (!hasOgTitle) inject.push('<meta property="og:title" content="' + escapeAttr(title) + '">');
  if (!hasOgDesc && description) inject.push('<meta property="og:description" content="' + escapeAttr(description) + '">');
  if (!hasOgUrl) inject.push('<meta property="og:url" content="' + canonicalUrl + '">');
  if (!hasTwitter) {
    inject.push('<meta name="twitter:card" content="summary_large_image">');
    inject.push('<meta name="twitter:title" content="' + escapeAttr(title) + '">');
    if (description) inject.push('<meta name="twitter:description" content="' + escapeAttr(description) + '">');
  }

  if (inject.length) {
    html = html.replace(
      /(<title>[\s\S]*?<\/title>\s*(?:<meta name="description"[^>]*>\s*)?(?:<meta name="robots"[^>]*>\s*)?)/i,
      function (m) { return m + inject.join('\n') + '\n'; }
    );
  }

  const finalNoindex = /name="robots"[^>]*noindex/i.test(html);
  if (!finalNoindex) sitemapEntries.push(canonicalUrl);

  if (html !== original) {
    report.push({
      relPath: relPath,
      added: inject.length,
      noindexAdded: isUtility && !alreadyNoindexBefore,
      descSource: descSource,
      noDescriptionFound: !description
    });
    if (!DRY_RUN) writeFileSync(full, html, 'utf8');
  }
}

console.log((DRY_RUN ? '[DRY RUN] ' : '') + 'Paginas alteradas: ' + report.length + '/' + files.length);
for (const r of report) {
  console.log('  ' + r.relPath + ' — +' + r.added + ' tags'
    + (r.noindexAdded ? ' +noindex' : '')
    + (r.descSource ? ' [desc: ' + r.descSource + ']' : '')
    + (r.noDescriptionFound ? ' (SEM FONTE DE DESCRICAO — revisar manualmente)' : ''));
}
console.log('\nPaginas indexaveis para sitemap.xml: ' + sitemapEntries.length);

if (!DRY_RUN) {
  const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    sitemapEntries.map(function (u) { return '  <url><loc>' + u + '</loc></url>'; }).join('\n') +
    '\n</urlset>\n';
  writeFileSync(join(root, 'sitemap.xml'), sitemap, 'utf8');
  console.log('sitemap.xml escrito com ' + sitemapEntries.length + ' URLs.');
}
