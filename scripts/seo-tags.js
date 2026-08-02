#!/usr/bin/env node
// scripts/seo-tags.js — adiciona tags de SEO/GEO (canonical, Open Graph, Twitter Card,
// meta description) que estejam faltando, sem tocar em conteúdo visual nem em CSS/JS.
// Reaproveita texto editorial já existente na própria página (title, .section-subtitle,
// .lp-desc, .sec-lead) — nunca inventa descrição clínica nova.
// Também marca páginas utilitárias (login, sso-callback) como noindex, e gera
// sitemap.xml a partir do resultado final (só entra o que não é noindex).
//
// Além disso, a partir de conteudo/manifest.json:
//   · pula as páginas aposentadas (manifest.redirecionadas) — elas são servidas
//     como 301, então não podem receber canonical nem entrar no sitemap;
//   · injeta og:image / twitter:image (cartão social);
//   · injeta BreadcrumbList (be·aside → módulo → página) e, nas páginas
//     clínicas, o tipo MedicalWebPage com o público (médico) e a especialidade.
// Nada disso inventa texto: todo rótulo vem do manifesto ou da própria página.
//
// Executar: node scripts/seo-tags.js [--dry-run]

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, dirname, sep } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const BASE_URL = 'https://beaside.com.br';
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
// Artigos ainda em rascunho: o Cesar não validou o conteúdo clínico, então eles
// mostram o banner "Rascunho — não publicado" para quem lê. Enquanto isso valer,
// não podem pedir indexação — texto clínico não validado no Google, num site de
// saúde, é risco antes de ser problema de SEO. É estado temporário: quando o
// status virar "publicado" no manifesto, a tag sai sozinha (ver mais abaixo).
const RASCUNHOS = new Set([
  ...(manifesto.artigos || []).filter((a) => a.status !== 'publicado').map((a) => 'artigos/' + a.arquivo),
  ...manifesto.modulos.flatMap((m) => m.paginas
    .filter((p) => p.status !== 'publicado' && p.status !== 'em-breve')
    .map((p) => m.root + p.arquivo)),
  // O hub do módulo não é uma "página" do manifesto, então até aqui ele não
  // herdava status nenhum. Deu no que deu: um módulo inteiro em rascunho ficava
  // com as quatro páginas noindex e o índice delas indexado — o Google entrando
  // numa landing page cujo conteúdo está todo murado. Agora o campo "status" no
  // próprio módulo manda no hub, e trocá-lo para "publicado" solta hub e páginas
  // de uma vez, sem ninguém precisar lembrar do índice.
  ...manifesto.modulos
    .filter((m) => !m.semHub && m.status && m.status !== 'publicado')
    .map((m) => m.root + 'index.html'),
]);

// Toda página cujo estado o manifesto controla.
const GERENCIADAS = new Set([
  ...(manifesto.artigos || []).map((a) => 'artigos/' + a.arquivo),
  ...manifesto.modulos.flatMap((m) => m.paginas.map((p) => m.root + p.arquivo)),
  ...manifesto.modulos.filter((m) => !m.semHub && m.status).map((m) => m.root + 'index.html'),
]);

// A marca que autoriza a remoção. A tag que ESTE script escreve a carrega; ela
// significa "esta tag existe por causa do status no manifesto". Sem ela, o script
// não mexe: consulte/index.html, os assistentes, login, conta e 404 carregam
// noindex escrito à mão, por decisão, e não podem ser desfeitos por automação.
const MARCA_STATUS = ' data-beaside="status"';

const UTILITY_NOINDEX = new Set(['login.html', 'sso-callback.html']);
// Paginas ja corretas ou sem valor de conteudo indexavel — nao mexer.
// 404.html nao entra no fluxo: a Vercel a serve em QUALQUER caminho inexistente,
// entao um canonical fixo (ou uma linha no sitemap) mentiria sobre o endereco.
// Ela carrega os proprios metadados a mao, com robots noindex.
const SKIP_FILES = new Set(['conta.html', 'sso-callback.html', '404.html']);

// Páginas aposentadas: continuam no repositório, mas o vercel.json as serve como
// 301 (ver "redirecionadas" no manifesto). Não recebem tag nenhuma e ficam fora
// do sitemap — sitemap que anuncia URL redirecionada é erro de indexação.
const APOSENTADAS = new Set((manifesto.redirecionadas || []).map((r) => r.de.replace(/^\//, '')));

// Índice caminho → { modulo, pagina }, para montar breadcrumb e escolher o tipo
// de schema sem adivinhar nada a partir do nome do arquivo.
const PAGINAS = new Map();
const HUBS = new Map();
for (const m of manifesto.modulos) {
  HUBS.set(m.root + 'index.html', m);
  for (const p of m.paginas) PAGINAS.set(m.root + p.arquivo, { mod: m, pag: p });
}
const ARTIGOS = new Map(manifesto.artigos.map((a) => ['artigos/' + a.arquivo, a]));

// Especialidade médica (vocabulário MedicalSpecialty do schema.org) por módulo.
// Só os módulos clínicos entram: institucional e consulte não são MedicalWebPage.
const ESPECIALIDADE = { vm: 'PulmonaryMedicine', hemo: 'Cardiovascular', neuro: 'Neurologic', proc: 'Emergency', peri: 'Surgical' };

// Cartão social. A imagem é 1200×630 e vive em assets/og-image.png.
const OG_IMAGE = BASE_URL + '/assets/og-image.png';
const OG_IMAGE_ALT = 'be·aside — raciocínio clínico à beira do leito';

function walk(dir, acc) {
  acc = acc || [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    // Diretórios ocultos nunca são conteúdo publicado: worktrees de agentes
    // (.kilo), caches de editor (.vscode) etc. Sem isto, um worktree deixado na
    // raiz entra no sitemap com URLs que não existem em produção.
    if (entry.startsWith('.')) continue;
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

function jsonld(obj) {
  return '<script type="application/ld+json">\n'
    + JSON.stringify(obj, null, 2).replace(/</g, '\\u003c')
    + '\n</script>';
}

// Trilha de navegação. Só monta nível que existe de verdade: se o hub do módulo
// não tiver index.html (caso de institucional/), o nível do meio simplesmente
// não entra — breadcrumb apontando para 404 é pior que breadcrumb curto.
function trilha(rel, canonicalUrl) {
  const itens = [{ name: SITE_NAME, url: BASE_URL + '/' }];
  const hub = HUBS.get(rel);
  const daPagina = PAGINAS.get(rel);
  const artigo = ARTIGOS.get(rel);

  if (hub) {
    itens.push({ name: hub.label, url: BASE_URL + '/' + hub.root });
  } else if (daPagina) {
    if (existsSync(join(root, daPagina.mod.root, 'index.html'))) {
      itens.push({ name: daPagina.mod.label, url: BASE_URL + '/' + daPagina.mod.root });
    }
    itens.push({ name: daPagina.pag.titulo, url: canonicalUrl });
  } else if (artigo) {
    itens.push({ name: 'Central de Conhecimento', url: BASE_URL + '/artigos/' });
    itens.push({ name: artigo.titulo, url: canonicalUrl });
  } else if (rel === 'artigos/index.html') {
    itens.push({ name: 'Central de Conhecimento', url: canonicalUrl });
  } else {
    return null;
  }
  if (itens.length < 2) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: itens.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url
    }))
  };
}

// MedicalWebPage só nas páginas clínicas (guias dos 4 módulos e artigos).
// Institucional, login e assistente não são conteúdo médico — marcar como se
// fossem é declarar autoridade onde não há.
function paginaMedica(rel, title, description, canonicalUrl) {
  const daPagina = PAGINAS.get(rel);
  const hub = HUBS.get(rel);
  const artigo = ARTIGOS.get(rel);
  const modId = (daPagina && daPagina.mod.id) || (hub && hub.id) || (artigo && artigo.modulo);
  const especialidade = ESPECIALIDADE[modId];
  if (!especialidade) return null;

  // o nome vem do manifesto quando existe: é o título editorial, sem o sufixo
  // de marca que o <title> carrega para o Google.
  const nome = (daPagina && daPagina.pag.titulo) || (artigo && artigo.titulo) || (hub && hub.subtitulo) || title;

  const obj = {
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    name: nome,
    url: canonicalUrl,
    inLanguage: 'pt-BR',
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: BASE_URL + '/' },
    specialty: 'https://schema.org/' + especialidade,
    audience: { '@type': 'MedicalAudience', audienceType: 'Physician' }
  };
  if (description) obj.description = description;
  return obj;
}

const files = walk(root).map(f => relative(root, f));
const report = [];
const sitemapEntries = [];

for (const relPath of files) {
  const rel = relPath.split(sep).join('/');
  if (SKIP_FILES.has(rel) || APOSENTADAS.has(rel)) continue;
  const full = join(root, relPath);
  let html = readFileSync(full, 'utf8');
  const original = html;
  const base = relPath.split('/').pop();

  const alreadyNoindexBefore = /name="robots"[^>]*noindex/i.test(html);
  const rascunho = RASCUNHOS.has(rel);
  const porStatus = EM_BREVE.has(rel) || rascunho;
  const isUtility = UTILITY_NOINDEX.has(base) || porStatus;

  if (isUtility && !alreadyNoindexBefore) {
    // Rascunho leva "follow": o texto não deve ser indexado, mas os links dele
    // para os módulos continuam valendo como caminho de rastreio. Placeholder e
    // página utilitária levam "nofollow" — não há nada adiante que interesse.
    const regra = rascunho ? 'noindex, follow' : 'noindex, nofollow';
    const marca = porStatus ? MARCA_STATUS : '';
    html = html.replace(/(<title>[\s\S]*?<\/title>)/i, '$1\n<meta name="robots" content="' + regra + '"' + marca + '>');
  }

  // Página que já estava noindex por status antes desta marca existir: adota a
  // marca agora, senão ficaria presa em noindex para sempre quando fosse publicada.
  if (porStatus && alreadyNoindexBefore && GERENCIADAS.has(rel) && !/data-beaside=["']status["']/i.test(html)) {
    html = html.replace(/(<meta[^>]+name=["']robots["'][^>]*?)(\s*\/?>)/i, '$1' + MARCA_STATUS + '$2');
  }

  // O caminho de volta, que é o que faz isto ser reversível de verdade: quando o
  // Cesar valida um rascunho e troca o status para "publicado" no manifesto, a tag
  // precisa SAIR sozinha. Sem isto, o artigo revisado entraria no ar carregando um
  // noindex herdado e ninguém descobriria antes de estranhar o silêncio no Google.
  // Só sai o que este script pôs — a marca é a autorização.
  if (!isUtility && GERENCIADAS.has(rel)) {
    html = html.replace(/\s*<meta[^>]*data-beaside=["']status["'][^>]*>/i, '');
  }
  // página noindex não recebe schema: dados estruturados de página que não vai
  // ser indexada só servem para o Google achar contradição.
  const ficaNoindex = /name="robots"[^>]*noindex/i.test(html);

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
  const hasOgImage = /property="og:image"/i.test(html);
  const hasTwitterImage = /name="twitter:image"/i.test(html);
  const hasBreadcrumb = /"@type":\s*"BreadcrumbList"/.test(html);
  const hasMedicalPage = /"@type":\s*"MedicalWebPage"/.test(html);

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
  if (!hasOgImage) {
    inject.push('<meta property="og:image" content="' + OG_IMAGE + '">');
    inject.push('<meta property="og:image:width" content="1200">');
    inject.push('<meta property="og:image:height" content="630">');
    inject.push('<meta property="og:image:alt" content="' + escapeAttr(OG_IMAGE_ALT) + '">');
  }
  if (!hasTwitterImage) inject.push('<meta name="twitter:image" content="' + OG_IMAGE + '">');

  if (!ficaNoindex && !hasBreadcrumb) {
    const t = trilha(rel, canonicalUrl);
    if (t) inject.push(jsonld(t));
  }
  if (!ficaNoindex && !hasMedicalPage) {
    const mp = paginaMedica(rel, title, description, canonicalUrl);
    if (mp) inject.push(jsonld(mp));
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
