#!/usr/bin/env node
/**
 * pre-commit-check.mjs — a rede de segurança do be·aside antes de commitar.
 *
 * Verifica TUDO que uma máquina consegue verificar sozinha. O que exige
 * julgamento (conteúdo clínico correto, se a mudança faz a pessoa raciocinar
 * ou só reproduzir) fica com a skill "checar antes de commitar" e com o Cesar.
 *
 * Uso:
 *   npm run pre-commit          → roda tudo, imprime relatório, sai 1 se houver falha
 *   npm run pre-commit -- --v   → mostra também o detalhe de cada item aprovado
 *
 * Regra: este script NUNCA escreve nada no repositório. Só lê e compara.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, sep } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const VERBOSE = process.argv.includes('--v');
const R = { falha: [], alerta: [], ok: [] };
const falha = (t, d) => R.falha.push({ t, d });
const alerta = (t, d) => R.alerta.push({ t, d });
const ok = (t, d) => R.ok.push({ t, d });

const ler = (p) => readFileSync(join(root, p), 'utf8');
const existe = (p) => existsSync(join(root, p));
const sh = (cmd) => {
  try { return { out: execSync(cmd, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }), code: 0 }; }
  catch (e) { return { out: (e.stdout || '') + (e.stderr || ''), code: e.status ?? 1 }; }
};
function todosHtml(dir = '', acc = []) {
  const SKIP = new Set(['node_modules', '.git', 'hub-uti', '_to_delete_lixo_git']);
  for (const f of readdirSync(join(root, dir))) {
    if (SKIP.has(f) || f.startsWith('.')) continue;
    const rel = dir ? `${dir}/${f}` : f;
    if (statSync(join(root, rel)).isDirectory()) todosHtml(rel, acc);
    else if (f.endsWith('.html')) acc.push(rel);
  }
  return acc;
}
const semTags = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');

// arquivos que ESTE commit toca (working tree + staged, comparado com HEAD)
const ALTERADOS = new Set(
  [
    ...sh('git status --porcelain').out.split('\n').map((l) => l.slice(3).trim()),
    ...sh('git diff --name-only HEAD').out.split('\n').map((l) => l.trim()),
  ].filter(Boolean)
);

const manifest = JSON.parse(ler('conteudo/manifest.json'));

// ── 1. sintaxe de todo JS/MJS e validade de todo JSON ──────────────────
{
  const alvos = [];
  const walk = (dir) => {
    const SKIP = new Set(['node_modules', '.git', 'hub-uti', '_to_delete_lixo_git']);
    for (const f of readdirSync(join(root, dir || '.'))) {
      if (SKIP.has(f) || f.startsWith('.')) continue;
      const rel = dir ? `${dir}/${f}` : f;
      if (statSync(join(root, rel)).isDirectory()) walk(rel);
      else if (/\.(mjs|js|json)$/.test(f)) alvos.push(rel);
    }
  };
  walk('');
  const quebrados = [];
  for (const a of alvos) {
    if (a.endsWith('.json')) { try { JSON.parse(ler(a)); } catch (e) { quebrados.push(`${a}: ${e.message}`); } }
    else { const r = sh(`node --check "${a}"`); if (r.code !== 0) quebrados.push(`${a}: ${r.out.trim().split('\n')[0]}`); }
  }
  quebrados.length ? falha('Sintaxe JS/JSON', quebrados) : ok('Sintaxe JS/JSON', `${alvos.length} arquivos válidos`);
}

// ── 2. conteúdo em sincronia com o manifest ────────────────────────────
{
  const r = sh('node scripts/build-content.js --check');
  const mudariam = /Arquivos que MUDARIAM:/.test(r.out);
  if (mudariam) {
    falha('Conteúdo fora de sincronia', ['Rode `npm run build:content` — há arquivo gerado divergindo do manifest.',
      ...r.out.split('\n').filter((l) => l.trim().startsWith('·'))]);
  } else ok('Conteúdo em sincronia', 'manifest → sidebar, hubs, artigos, IA, llms.txt, farmacos');
  const avisos = r.out.split('\n').filter((l) => l.trim().startsWith('!')).map((l) => l.trim().slice(2));
  // Órfãs de proc e os 3 assistentes são pendências conhecidas, aguardando decisão do Cesar.
  const CONHECIDOS = /assistente\.html|proc\/(acessos|drenagem|monitorizacao|vias-aereas)\.html/;
  const novos = avisos.filter((a) => !CONHECIDOS.test(a));
  if (novos.length) falha('Auditoria do manifest — pendência NOVA', novos);
  else if (avisos.length) alerta('Pendências conhecidas do manifest', [`${avisos.length} avisos, todos já mapeados (4 órfãs de proc + 3 assistentes)`]);
}

// ── 2b. índice das prescrições: gerado, tem que estar em dia ──────────
{
  // Mesmo contrato do knowledge.js: guardamos, rodamos, comparamos e devolvemos
  // os bytes originais — a checagem não deixa rastro no repositório.
  const alvos = ['conteudo/prescricoes-indice.json', 'api/prescricoes-indice.js'];
  const antes = alvos.map((f) => (existe(f) ? ler(f) : ''));
  const r = sh('node scripts/indice-prescricoes.mjs');
  if (r.code !== 0) {
    falha('Índice das prescrições não gerou', [r.out.trim().split('\n').slice(-3).join(' · ')]);
  } else {
    const mudou = alvos.filter((f, i) => antes[i] && ler(f) !== antes[i]);
    if (mudou.length) {
      falha('Índice das prescrições desatualizado', [
        `${mudou.join(' e ')} não corresponde às páginas atuais.`,
        'Rode `npm run indice-prescricoes` e commite o resultado junto.',
      ]);
      alvos.forEach((f, i) => { if (antes[i]) writeFileSync(join(root, f), antes[i]); });
    } else {
      const n = (r.out.match(/(\d+) páginas/) || [])[1] || '?';
      ok('Índice das prescrições', `${n} páginas mapeadas para o app de IA`);
    }
  }
}

// ── 3. base da IA: nunca encolher, nunca conter página magra ───────────
{
  // extract-knowledge.js escreve api/knowledge.js. Guardamos o conteúdo antes,
  // rodamos, comparamos, e devolvemos os bytes originais — este script não
  // pode deixar rastro no repositório.
  const antes = existe('api/knowledge.js') ? ler('api/knowledge.js') : '';
  const r = sh('node scripts/extract-knowledge.js');
  const gerado = existe('api/knowledge.js') ? ler('api/knowledge.js') : '';
  if (antes && gerado !== antes) {
    falha('Base da IA desatualizada', [
      'api/knowledge.js não corresponde ao conteúdo atual das páginas.',
      'Rode `npm run extract-knowledge` e commite o resultado junto.',
    ]);
    writeFileSync(join(root, 'api/knowledge.js'), antes); // devolve como estava
  }

  const magras = r.out.split('\n').filter((l) => l.includes('⚠'));
  if (magras.length) falha('Página magra na base da IA', [...magras.map((l) => l.trim()),
    'Escreva o conteúdo, ou marque ia:false / status:"em-breve" no manifest.']);
  else ok('Base da IA', 'nenhuma página abaixo do mínimo de conteúdo');

  // a comparação de tamanho usa o que as páginas produzem HOJE, não o arquivo em disco
  const atual = gerado || antes;
  const head = sh('git show HEAD:api/knowledge.js');
  if (head.code !== 0) {
    alerta('Base da IA: sem comparação', ['não consegui ler api/knowledge.js do HEAD para comparar.']);
  } else {
    // A lista sai do próprio arquivo, não de uma constante escrita à mão — módulo
    // novo entra na conferência sozinho. Só exports com literal de string contam:
    // o alias KNOWLEDGE_BASE aponta para outro export e fica de fora.
    // A régua é o HEAD: o que existia lá tem que continuar existindo. Base que só
    // existe agora é módulo novo — não há com o que comparar, e isso não é perda.
    const nomes = (s) => [...s.matchAll(/export const (KNOWLEDGE_\w+) = "/g)].map((m) => m[1]);
    const BASES = nomes(head.out);
    const NOVAS = nomes(atual).filter((k) => !BASES.includes(k));
    const literal = (s, k) => {
      const m = s.match(new RegExp(`export const ${k} = ("(?:[^"\\\\]|\\\\.)*")`));
      return m ? m[1] : null;
    };
    // cada página vira um "# Título" dentro da string — comparar os títulos pega
    // página que sumiu, coisa que só o tamanho total não pega.
    const titulos = (lit) => new Set([...lit.matchAll(/\\n# ([^\\"]+)/g)].map((m) => m[1].trim()));
    const perdas = [];
    for (const k of BASES) {
      const a = literal(atual, k), b = literal(head.out, k);
      if (!a) { perdas.push(`${k}: existia no HEAD e sumiu da base gerada — export renomeado ou removido?`); continue; }
      const ta = titulos(a), tb = titulos(b);
      const sumiram = [...tb].filter((t) => !ta.has(t));
      if (sumiram.length) perdas.push(`${k}: ${sumiram.length} página(s) sumiram da base — ${sumiram.slice(0, 4).join(' · ')}${sumiram.length > 4 ? ' …' : ''}`);
      else if (a.length < b.length * 0.9) perdas.push(`${k}: ${b.length} → ${a.length} chars (${Math.round((1 - a.length / b.length) * 100)}% a menos, sem página ter sumido)`);
    }
    perdas.length
      ? falha('Conteúdo sumiu da base da IA', [...perdas, 'Se foi de propósito, tudo bem — mas confirme antes de commitar.'])
      : ok('Base da IA não encolheu', `${BASES.length} base(s) com as mesmas páginas do HEAD`
          + (NOVAS.length ? ` · ${NOVAS.length} base(s) nova(s): ${NOVAS.join(', ')}` : ''));
  }
}

// ── 4. camada 0 de fármacos: contas conferidas contra a página clínica ─
{
  const fx = JSON.parse(ler('conteudo/farmacos.json'));
  const pag = semTags(ler('hemo/drogas.html'));
  const erros = [];

  for (const f of fx.farmacos) for (const d of f.diluicoes || []) {
    if (!pag.includes(d.preparo)) erros.push(`${f.nome}: diluição "${d.preparo}" não existe em hemo/drogas.html`);
  }
  for (const c of fx._conferencias || []) {
    const f = fx.farmacos.find((x) => x.id === c.farmaco);
    if (!f) { erros.push(`conferência aponta para fármaco inexistente: ${c.farmaco}`); continue; }
    const d = (f.diluicoes || []).find((x) => x.rotulo === c.diluicao);
    if (!d) { erros.push(`conferência de ${c.farmaco}: diluição "${c.diluicao}" não existe`); continue; }
    const calc = (c.dose * (f.por_peso ? c.peso : 1) * (f.por_min ? 60 : 1)) / d.concentracao;
    if (Math.abs(calc - c.esperado_mL_h) > 0.1) erros.push(`${f.nome} (${c.dose} ${f.unidade_dose}${c.peso ? `, ${c.peso} kg` : ''}): a fórmula dá ${calc.toFixed(2)} mL/h, mas _conferencias espera ${c.esperado_mL_h}. Um dos dois está errado — confira contra ${f.fonte}.`);
    if (c.texto_na_pagina && !pag.includes(c.texto_na_pagina)) erros.push(`${f.nome}: "${c.texto_na_pagina}" sumiu de hemo/drogas.html — a página mudou e a tabela não`);
  }
  const gerado = existe('api/farmacos.js') ? ler('api/farmacos.js') : '';
  if (!gerado.includes('KNOWLEDGE_FARMACOS')) erros.push('api/farmacos.js não foi gerado — rode `npm run build:content`');

  erros.length ? falha('Camada 0 de fármacos', erros)
    : ok('Camada 0 de fármacos', `${fx.farmacos.length} fármacos · ${(fx._conferencias || []).length} contas conferidas contra a página`);

  const rev = fx._revisao_clinica || {};
  if (String(rev.por).includes('[PREENCHER]')) alerta('Revisão clínica da tabela de fármacos', ['_revisao_clinica ainda está [PREENCHER] — a tabela não vale como referência publicada até o Cesar/João conferirem.']);
}

// ── 5. SEO: sitemap, noindex e o que está publicado ────────────────────
{
  const erros = [];
  const sm = existe('sitemap.xml') ? ler('sitemap.xml') : '';
  const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const base = manifest.site.url.replace(/\/$/, '');
  const noindex = new Set();
  for (const h of todosHtml()) if (/name=["']robots["'][^>]*noindex/i.test(ler(h))) noindex.add(h);

  for (const u of urls) {
    let rel = u.replace(base, '').replace(/^\//, '');
    if (rel === '' || rel.endsWith('/')) rel += 'index.html';
    if (!existe(rel)) erros.push(`sitemap aponta para arquivo inexistente: ${u}`);
    else if (noindex.has(rel)) erros.push(`sitemap lista página marcada noindex: ${u}`);
  }
  // O hub de um módulo tem canonical de DIRETÓRIO (…/prescricoes/), não do
  // arquivo — então é assim que ele entra no sitemap. Procurar só por
  // "…/index.html" daria falso positivo. Mesma normalização do grupo 8.
  const noSitemapUrls = (rel) =>
    rel.endsWith('/index.html')
      ? !urls.some((u) => u.endsWith('/' + rel) || u.endsWith('/' + rel.slice(0, -10)))
      : !urls.some((u) => u.endsWith('/' + rel));
  for (const m of manifest.modulos) for (const p of m.paginas) {
    const rel = m.root + p.arquivo;
    if (p.status === 'publicado' && existe(rel) && !noindex.has(rel) && noSitemapUrls(rel)) {
      erros.push(`publicada e indexável mas fora do sitemap: ${rel}`);
    }
    if (p.status === 'em-breve' && existe(rel) && !noindex.has(rel)) erros.push(`status em-breve sem noindex: ${rel} — rode \`node scripts/seo-tags.js\``);
  }
  // Hub indexável cujas páginas são todas noindex: o Google entra numa landing
  // page cujo conteúdo inteiro está murado. Isso é "thin content", e em site de
  // conteúdo médico a avaliação de qualidade recai sobre o domínio inteiro, não
  // só sobre aquela URL. As duas saídas coerentes são publicar o módulo junto
  // com o hub, ou segurar o hub até a revisão clínica sair.
  const hubsMurados = [];
  for (const m of manifest.modulos) {
    if (m.semHub || !m.paginas || !m.paginas.length) continue;
    const hub = m.root + 'index.html';
    if (!existe(hub) || noindex.has(hub)) continue;
    if (!urls.some((u) => u.endsWith('/' + m.root) || u.endsWith('/' + hub))) continue;
    const indexaveis = m.paginas.filter((p) => existe(m.root + p.arquivo) && !noindex.has(m.root + p.arquivo));
    if (!indexaveis.length) {
      hubsMurados.push(`${m.root} está no sitemap e indexável, mas nenhuma das ${m.paginas.length} páginas do módulo é — o Google indexaria um índice sem conteúdo por trás.`);
    }
  }
  if (hubsMurados.length) {
    alerta('Hub indexável sem conteúdo indexável', [
      ...hubsMurados,
      'Decisão do Cesar: publicar o módulo (status "publicado" no manifesto, depois `npm run build:content` e `node scripts/seo-tags.js`)',
      'ou segurar o hub junto (noindex + fora do sitemap) até a revisão clínica sair.',
    ]);
  }

  erros.length ? falha('SEO / sitemap', erros) : ok('SEO / sitemap', `${urls.length} URLs, todas com arquivo e sem contradizer noindex`);
}

// ── 6. links internos quebrados ────────────────────────────────────────
{
  const quebrados = [];
  for (const h of todosHtml()) {
    const html = ler(h).replace(/<script[\s\S]*?<\/script>/gi, ' ');
    const dir = h.includes('/') ? h.slice(0, h.lastIndexOf('/')) : '';
    for (const m of html.matchAll(/(?:href|src)=["']([^"'#?]+)["']/g)) {
      const alvo = m[1];
      if (/^(https?:|mailto:|tel:|data:|javascript:|\/\/)/i.test(alvo) || !alvo) continue;
      let rel = alvo.startsWith('/') ? alvo.slice(1) : (dir ? dir + '/' + alvo : alvo);
      rel = rel.split('/').reduce((a, p) => (p === '.' ? a : p === '..' ? (a.pop(), a) : (a.push(p), a)), []).join('/');
      if (rel.endsWith('/')) rel += 'index.html';
      if (!existe(rel) && !existe(rel + '/index.html')) quebrados.push(`${h} → ${alvo}`);
    }
  }
  quebrados.length ? falha('Links internos quebrados', quebrados) : ok('Links internos', 'nenhum quebrado');
}

// ── 7. nada inacabado no ar ────────────────────────────────
// [PREENCHER] em página publicada é sempre problema. O que BLOQUEIA, porém, é
// este commit PIORAR a situação — buraco novo, ou mais buracos que antes.
// "Tocou o arquivo" não serve de régua: um gerador de metadados reescreve as
// 95 páginas de uma vez e transformaria toda dívida antiga em bloqueio, o que
// treina a gente a ignorar o alarme. A régua é a contagem no HEAD.
{
  const achados = [];
  const olhar = (rel, publicado) => {
    if (!publicado || !existe(rel)) return;
    const txt = semTags(ler(rel));
    const n = (txt.match(/\[PREENCHER\]/g) || []).length;
    if (n) achados.push({ rel, n, re: /\[PREENCHER\]/g, o: `${n}× [PREENCHER] visível` });
    const li = (txt.match(/lorem ipsum/gi) || []).length;
    if (li) achados.push({ rel, n: li, re: /lorem ipsum/gi, o: `${li}× lorem ipsum visível` });
  };
  for (const m of manifest.modulos) for (const p of m.paginas) olhar(m.root + p.arquivo, p.status === 'publicado');
  for (const a of manifest.artigos) olhar('artigos/' + a.arquivo, a.status === 'publicado');

  // quantas vezes o mesmo padrão aparecia na versão commitada. null = arquivo novo.
  const noHead = (rel, re) => {
    const r = sh(`git show HEAD:"${rel}"`);
    if (r.code !== 0) return null;
    return (semTags(r.out).match(re) || []).length;
  };

  const piorou = [], herdados = [];
  for (const a of achados) {
    const antes = noHead(a.rel, a.re);
    (antes === null || a.n > antes ? piorou : herdados).push({ ...a, antes });
  }
  if (piorou.length) {
    falha('Conteúdo inacabado ENTRANDO neste commit', [
      ...piorou.map((a) => `${a.rel}: ${a.o}${a.antes === null ? ' (arquivo novo)' : ` — eram ${a.antes} no HEAD`}`),
      'Ou preencha, ou troque o status para "rascunho" antes de commitar.',
    ]);
  }
  if (herdados.length) {
    alerta('Dívida antiga: conteúdo inacabado em página publicada', [
      ...herdados.map((a) => `${a.rel}: ${a.o}`),
      'Já estava assim no HEAD — este commit não piorou. Mas está no ar assim.',
    ]);
  }
  if (!achados.length) ok('Conteúdo inacabado', 'nenhum [PREENCHER] em página publicada');
}

// ── 8. rascunho no ar: o site convidando o Google a ler o que não está pronto ──
// Uma página com status "rascunho" que ainda assim está no sitemap.xml e sem
// noindex é o pior dos dois mundos: ela mostra o banner "Rascunho — não
// publicado" para o leitor E pede para ser indexada. Num domínio novo, sem
// autoridade acumulada, isso gasta a primeira impressão justo na área que o
// roadmap elegeu como porta de entrada (a Central de Conhecimento).
//
// A régua é a mesma do grupo 7: o HEAD. Exposição herdada vira alerta — é
// decisão editorial do Cesar, não erro de código. Exposição NOVA bloqueia,
// porque aí o commit está piorando a situação. Sem isso, um gerador de sitemap
// que reescreve o arquivo inteiro transformaria toda dívida antiga em bloqueio.
{
  const sitemapAgora = existe('sitemap.xml') ? ler('sitemap.xml') : '';
  const rHead = sh('git show HEAD:sitemap.xml');
  const sitemapHead = rHead.code === 0 ? rHead.out : '';

  const noSitemap = (txt, rel) => {
    if (!txt) return false;
    if (rel.endsWith('/index.html')) return txt.includes('/' + rel.slice(0, -10));
    return txt.includes('/' + rel);
  };
  const semNoindex = (html) =>
    !/<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);

  // como esta página está exposta, hoje ou no HEAD
  const exposicao = (rel, html, smap) => {
    const e = [];
    if (semNoindex(html)) e.push('sem noindex');
    if (noSitemap(smap, rel)) e.push('no sitemap.xml');
    return e;
  };

  const rascunhos = [];
  for (const a of manifest.artigos) if (a.status !== 'publicado') rascunhos.push(['artigos/' + a.arquivo, a.status]);
  for (const m of manifest.modulos) for (const p of m.paginas) if (p.status !== 'publicado') rascunhos.push([m.root + p.arquivo, p.status]);

  const novas = [], herdadas = [];
  for (const [rel, status] of rascunhos) {
    if (!existe(rel)) continue;                         // "em-breve" sem arquivo não é exposição
    const agora = exposicao(rel, ler(rel), sitemapAgora);
    if (!agora.length) continue;
    const h = sh(`git show HEAD:"${rel}"`);
    const antes = h.code !== 0 ? [] : exposicao(rel, h.out, sitemapHead);
    const virou = agora.filter((x) => !antes.includes(x));
    const linha = `${rel} (${status}): ${(virou.length ? virou : agora).join(' + ')}`;
    (virou.length ? novas : herdadas).push(linha);
  }

  if (novas.length) {
    falha('Rascunho ficando indexável NESTE commit', [
      ...novas,
      'Ou publique de verdade (status "publicado"), ou ponha <meta name="robots" content="noindex, follow">',
      'e tire do sitemap.xml enquanto ainda for rascunho.',
    ]);
  }
  if (herdadas.length) {
    alerta('Rascunho no ar e indexável', [
      ...herdadas,
      'Já estava assim no HEAD. Enquanto não for revisado, o buscador e as IAs leem',
      'uma página que ela mesma se anuncia como não publicada.',
    ]);
  }
  if (!novas.length && !herdadas.length) ok('Rascunho no ar', 'nenhum rascunho indexável');
}

// ── 9. sujeira e segredo no que vai ser commitado ────────────────────────
{
  const arquivos = [...ALTERADOS];
  const sujeira = arquivos.filter((f) => /\.fuse_hidden|\.DS_Store|_to_delete|\.env$|\.env\.|tmp_obj_/.test(f));
  sujeira.length ? falha('Artefato que não deve ser versionado', sujeira) : ok('Higiene do commit', `${arquivos.length} arquivos alterados, nenhum artefato do mount`);

  const segredos = [];
  const PADRAO = /(sk-ant-[A-Za-z0-9_-]{8,}|ANTHROPIC_API_KEY\s*=\s*['"][^'"]+|VMGUIDE_SENHA\s*=\s*['"][^'"]+)/;
  for (const f of arquivos) {
    if (!existe(f) || /\.(png|jpg|jpeg|svg|webp|ico|woff2?)$/i.test(f)) continue;
    try { const m = ler(f).match(PADRAO); if (m) segredos.push(`${f}: "${m[0].slice(0, 24)}…"`); } catch {}
  }
  segredos.length ? falha('SEGREDO no código', [...segredos, 'Chave e senha só em variável de ambiente na Vercel.']) : ok('Segredos', 'nenhuma chave ou senha embutida');
}

// ── relatório ──────────────────────────────────────────────────────────
const linha = '─'.repeat(64);
console.log(`\n${linha}\nbe·aside — checagem antes do commit\n${linha}`);
for (const { t, d } of R.ok) console.log(`  ✅ ${t}${VERBOSE && d ? `\n       ${d}` : ''}`);
for (const { t, d } of R.alerta) { console.log(`  ⚠️  ${t}`); for (const l of [].concat(d)) console.log(`       ${l}`); }
for (const { t, d } of R.falha) { console.log(`  ❌ ${t}`); for (const l of [].concat(d)) console.log(`       ${l}`); }
console.log(linha);
if (R.falha.length) {
  console.log(`${R.falha.length} item(ns) bloqueando o commit. Corrija antes de seguir.\n`);
  process.exit(1);
}
console.log(`Tudo verde${R.alerta.length ? ` (${R.alerta.length} pendência(s) aguardando decisão do Cesar)` : ''}.`);
console.log('A parte mecânica está limpa. Falta o julgamento: conteúdo clínico correto,');
console.log('com fonte, e a mudança fazendo a pessoa raciocinar — não só reproduzir.\n');
