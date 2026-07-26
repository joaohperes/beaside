#!/usr/bin/env node
/**
 * build-content.js — o gerador do be·aside.
 *
 * Fonte única de verdade: conteudo/manifest.json
 * A partir dele, este script REGENERA automaticamente:
 *   1. assets/app.js .............. MODULES + MODULE_PAGES (menu lateral, prev/próximo, busca ⌘K)
 *   2. <modulo>/index.html ........ os cards do hub de cada módulo (numeração automática)
 *   3. artigos/index.html ......... os cards da Central de Conhecimento
 *   4. scripts/extract-knowledge.js  a lista de páginas que alimentam a IA
 *   5. llms.txt ................... o mapa completo do conteúdo para os robôs de IA
 *   6. api/farmacos.js ........... doses, diluições e vazão de bomba pré-calculada (fonte: conteudo/farmacos.json)
 *
 * Uso:
 *   node scripts/build-content.js          → gera tudo
 *   node scripts/build-content.js --check  → não escreve nada; só relata o que está fora de sincronia
 *
 * Regra: tudo que está entre marcadores AUTO:conteudo é gerado. Não editar à mão —
 * a próxima execução sobrescreve. Para mudar, edite conteudo/manifest.json.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const manifest = JSON.parse(readFileSync(join(root, 'conteudo/manifest.json'), 'utf8'));

const escritos = [];
const iguais = [];
const avisos = [];

// ── helpers ────────────────────────────────────────────────────────────
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const jsStr = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
const pad = (s, n) => s + ' '.repeat(Math.max(0, n - s.length));
const nn = (i) => String(i).padStart(2, '0');
const rgb = (hex) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',');
};
const mods = (ids) => manifest.modulos.filter((m) => ids.includes(m.id));
const modById = (id) => manifest.modulos.find((m) => m.id === id);
const RACIOCINE = ['vm', 'hemo', 'neuro', 'proc'];

function aplicar(relPath, gerado, marcadorInicio, marcadorFim) {
  const abs = join(root, relPath);
  const original = readFileSync(abs, 'utf8');
  const i = original.indexOf(marcadorInicio);
  const j = original.indexOf(marcadorFim);
  if (i === -1 || j === -1) {
    avisos.push(`${relPath}: marcadores AUTO:conteudo não encontrados — arquivo ignorado.`);
    return;
  }
  const novo = original.slice(0, i + marcadorInicio.length) + gerado + original.slice(j);
  if (novo === original) { iguais.push(relPath); return; }
  if (!CHECK) writeFileSync(abs, novo);
  escritos.push(relPath);
}

const HTML_INI = '<!-- AUTO:conteudo -->';
const HTML_FIM = '<!-- /AUTO:conteudo -->';
const JS_INI = '/* AUTO:conteudo */';
const JS_FIM = '/* /AUTO:conteudo */';

// ── 1. assets/app.js — MODULES + MODULE_PAGES ──────────────────────────
function gerarAppJs() {
  let out = '\n// ── Módulos disponíveis ──────────────────────────────────────\n';
  out += 'const MODULES = {\n';
  for (const m of manifest.modulos) {
    out += `  ${m.id}: {\n`;
    out += `    id: ${jsStr(m.id)},\n`;
    out += `    label: ${jsStr(m.label)},\n`;
    out += `    area: ${jsStr(m.area)},\n`;
    out += `    subtitle: ${jsStr(m.subtitulo)},\n`;
    out += `    root: ${jsStr(m.root)},\n`;
    // módulo sem index.html próprio: o shell aponta para a 1ª página em vez do diretório
    if (m.semHub) out += `    semHub: true,\n`;
    out += `    color: ${jsStr(m.cor)},\n`;
    out += `  },\n`;
  }
  out += '};\n\n';
  out += '// ── Índice de páginas por módulo ─────────────────────────────\n';
  out += 'const MODULE_PAGES = {\n';
  for (const m of manifest.modulos) {
    const pubs = m.paginas.filter((p) => p.status !== 'oculto');
    const w = (k, f) => Math.max(...pubs.map((p) => (f(p) || '').length)) + 1;
    const wId = w('id', (p) => jsStr(p.id)), wFile = w('f', (p) => jsStr(p.arquivo));
    const wCat = w('c', (p) => jsStr(p.categoria)), wLab = w('l', (p) => jsStr(p.menu));
    const wTit = w('t', (p) => jsStr(p.titulo));
    out += `  ${m.id}: [\n`;
    for (const p of pubs) {
      out += `    {id:${pad(jsStr(p.id) + ',', wId + 1)}file:${pad(jsStr(p.arquivo) + ',', wFile + 1)}`;
      out += `cat:${pad(jsStr(p.categoria) + ',', wCat + 1)}label:${pad(jsStr(p.menu) + ',', wLab + 1)}`;
      out += `title:${pad(jsStr(p.titulo) + ',', wTit + 1)}subtitle:${jsStr(p.subtitulo)}},\n`;
    }
    out += `  ],\n`;
  }
  out += '};\n';
  aplicar('assets/app.js', out, JS_INI, JS_FIM);
}

// ── 2. hubs dos módulos ────────────────────────────────────────────────
function gerarHubs() {
  for (const m of mods(RACIOCINE)) {
    const grupos = [];
    const push = (grupo, card) => {
      let g = grupos.find((x) => x.rotulo === grupo);
      if (!g) { g = { rotulo: grupo, cards: [] }; grupos.push(g); }
      g.cards.push(card);
    };
    for (const p of m.paginas) {
      if (!p.hub || p.status === 'oculto') continue;
      push(p.hub.grupo, { href: p.arquivo, selo: p.hub.selo, titulo: p.hub.titulo, resumo: p.hub.resumo, estado: p.status === 'em-breve' ? 'em-breve' : undefined });
    }
    // cards que não são páginas do módulo (ponte para o assistente, por ex.):
    // entram na grade e na numeração, mas não contam no painel "Páginas".
    for (const e of m.hubExtras || []) push(e.grupo, { ...e, extra: true });

    let idx = 0, prontas = 0, paginas = 0, out = '\n';
    for (const g of grupos) {
      out += `  <div class="lp-section-label">${esc(g.rotulo)}</div>\n  <div class="lp-grid">\n`;
      for (const c of g.cards) {
        idx++;
        const soon = c.estado === 'em-breve';
        if (!c.extra) { paginas++; if (!soon) prontas++; }
        out += soon
          ? `    <a class="lp-card empty" href="${c.href}" aria-disabled="true" tabindex="-1">\n`
          : `    <a class="lp-card" href="${c.href}">\n`;
        out += `      <div class="lp-card-top"><div class="lp-card-cat">${esc(c.selo)}</div>`;
        out += soon ? `<span class="lp-badge-soon">em breve</span></div>\n`
                    : `<span class="lp-card-idx">${nn(idx)}</span></div>\n`;
        out += `      <div class="lp-card-title">${esc(c.titulo)}</div>\n`;
        out += `      <div class="lp-card-sub">${esc(c.resumo)}</div>\n`;
        if (!soon) out += `      <div class="lp-card-cta">Abrir <span>→</span></div>\n`;
        out += `    </a>\n`;
      }
      out += `  </div>\n\n`;
    }
    aplicar(`${m.id}/index.html`, out, HTML_INI, HTML_FIM);

    // painel "Páginas: N" do topo do hub
    const abs = join(root, `${m.id}/index.html`);
    const html = readFileSync(abs, 'utf8');
    const novo = html
      .replace(/(<div class="lp-stat"><div class="lp-stat-k">Páginas<\/div><div class="lp-stat-v">)\d+(<\/div><\/div>)/,
               `$1${paginas}$2`)
      .replace(/(<div class="lp-stat"><div class="lp-stat-k">Prontas<\/div><div class="lp-stat-v">)\d+(<\/div><\/div>)/,
               `$1${nn(prontas)}$2`);
    if (novo !== html) {
      if (!CHECK) writeFileSync(abs, novo);
      if (!escritos.includes(`${m.id}/index.html`)) escritos.push(`${m.id}/index.html`);
    }
  }
}

// ── 3. hub da Central de Conhecimento ──────────────────────────────────
function gerarArtigos() {
  const publicados = manifest.artigos.filter((a) => a.status !== 'oculto');
  let out = '\n  <div class="bento" id="lista">\n\n';
  for (const a of publicados) {
    const cor = a.cor || (modById(a.modulo) || {}).cor || manifest.site.cor || '#1db88a';
    const r = rgb(cor);
    const aria = a.aria || a.titulo;
    out += `    <div class="card"\n       style="--c-accent:${cor};--c-border:rgba(${r},.4);--c-glow:rgba(${r},.12)">\n`;
    out += `      <span class="card-rail" aria-hidden="true"></span>\n`;
    out += `      <a class="card-hit" href="${a.arquivo}" aria-label="${esc(aria)}">\n`;
    out += `        <div class="card-badge">${esc(a.tema)}</div>\n`;
    out += `        <div class="card-title">${esc(a.titulo)}</div>\n`;
    out += `        <div class="card-sub">${esc(a.resumo)}</div>\n`;
    out += `        <div class="card-tags">\n`;
    for (const t of a.tags || []) out += `          <span class="card-tag">${esc(t)}</span>\n`;
    out += `        </div>\n      </a>\n`;
    out += `      <div class="card-foot">\n`;
    out += `        <a class="card-cta" href="${a.arquivo}">Ler artigo <span class="card-cta-arrow" aria-hidden="true">→</span></a>\n`;
    out += `      </div>\n    </div>\n\n`;
  }
  out += '  </div>\n\n';
  aplicar('artigos/index.html', out, HTML_INI, HTML_FIM);
}

// ── 4. lista de páginas que alimentam a IA ─────────────────────────────
function gerarKnowledge() {
  let out = '\nconst PAGES_BY_MODULE = {\n';
  for (const m of mods(RACIOCINE)) {
    const arqs = m.paginas.filter((p) => p.ia && p.status === 'publicado').map((p) => `'${p.arquivo}'`);
    out += `  ${m.id}: [\n` + quebrar(arqs) + `  ],\n`;
  }
  const arts = manifest.artigos.filter((a) => a.ia && a.status !== 'oculto').map((a) => `'${a.arquivo}'`);  // artigos em rascunho seguem na IA de propósito (uso interno)
  out += `  artigos: [\n` + quebrar(arts) + `  ],\n};\n`;
  aplicar('scripts/extract-knowledge.js', out, JS_INI, JS_FIM);
}
function quebrar(itens) {
  let linhas = [], atual = '   ';
  for (const it of itens) {
    if ((atual + ' ' + it + ',').length > 78) { linhas.push(atual); atual = '   '; }
    atual += ' ' + it + ',';
  }
  if (atual.trim()) linhas.push(atual);
  return linhas.map((l) => l + '\n').join('');
}

// ── 5. llms.txt — mapa completo para robôs de IA ───────────────────────
function gerarLlms() {
  const base = manifest.site.url;
  let out = '\n\n## Conteúdo completo\n';
  for (const m of mods(RACIOCINE)) {
    out += `\n### ${m.label}\n\n`;
    for (const p of m.paginas) {
      if (p.status !== 'publicado' || p.tipo === 'quiz') continue;
      out += `- [${p.titulo}](${base}/${m.root}${p.arquivo}): ${p.subtitulo}\n`;
    }
  }
  const arts = manifest.artigos.filter((a) => a.status === 'publicado');
  if (arts.length) {
    out += `\n### Central de Conhecimento\n\n`;
    for (const a of arts) out += `- [${a.titulo}](${base}/artigos/${a.arquivo}): ${a.resumo}\n`;
  }
  out += '\n';
  aplicar('llms.txt', out, '<!-- AUTO:conteudo -->', '<!-- /AUTO:conteudo -->');
}

// ── 6. fármacos: doses, diluições e vazão de bomba pré-calculada ───────
// A IA NUNCA calcula mL/h. As tabelas abaixo são geradas aqui, em JavaScript,
// a partir de conteudo/farmacos.json (que por sua vez veio de hemo/drogas.html).
// É isso que impede erro de conta em dose chegar ao plantonista.
function num(v) {
  const abs = Math.abs(v);
  const casas = abs >= 10 ? 1 : abs >= 1 ? 1 : 2;
  let t = v.toFixed(casas);
  if (t.includes('.')) t = t.replace(/0+$/, '').replace(/\.$/, '');
  return t.replace('.', ',');
}

function vazao(f, dose, peso, conc) {
  return (dose * (f.por_peso ? peso : 1) * (f.por_min ? 60 : 1)) / conc;
}

function gerarFarmacos() {
  const fx = JSON.parse(readFileSync(join(root, 'conteudo/farmacos.json'), 'utf8'));
  const pesos = fx.pesos_referencia;
  const L = [];

  L.push('FÁRMACOS EM INFUSÃO — DOSES, DILUIÇÕES E VAZÃO DE BOMBA (be·aside)');
  L.push('Extraído de hemo/drogas.html. As vazões em mL/h foram CALCULADAS POR SCRIPT, não por modelo de linguagem — use os números literalmente, não recalcule.');
  L.push('Fórmula para peso fora da tabela: mL/h = dose × peso × 60 ÷ concentração (mesma base de unidade: μg com μg/mL, U com U/mL).');
  L.push('Diluições padrão VARIAM entre instituições — sempre dizer isso ao apresentar uma vazão.');

  L.push('\n## 1ª escolha por tipo de choque');
  for (const e of fx.escolha_por_choque) {
    L.push(`- ${e.choque}: 1ª linha ${e.primeira} | 2ª linha / se refratário: ${e.segunda} | Alvo: ${e.alvo}`);
  }

  for (const f of fx.farmacos) {
    L.push(`\n## ${f.nome} — ${f.classe}${f.receptor ? ' · ' + f.receptor : ''}`);
    if (f.busca && f.busca.length) L.push(`Também chamado de: ${f.busca.join(', ')}.`);
    if (f.papel) L.push(`Papel: ${f.papel}`);
    if (f.indicacoes && f.indicacoes.length) L.push(`Quando usar: ${f.indicacoes.join(' · ')}`);
    L.push(`Dose inicial: ${f.dose_inicial}`);
    if (f.titulacao) L.push(`Titulação: ${f.titulacao}`);
    L.push(`Dose máxima: ${f.dose_maxima}`);
    if (f.duracao) L.push(`Duração: ${f.duracao}`);
    if (f.faixas) for (const fa of f.faixas) L.push(`Faixa ${fa.faixa} → ${fa.efeito}: ${fa.uso}`);
    if (f.outras_vias) for (const o of f.outras_vias) L.push(`Outra via — ${o.indicacao}: ${o.dose} (${o.via})`);

    for (const d of f.diluicoes || []) {
      L.push(`Diluição ${d.rotulo}: ${d.preparo} = ${num(d.concentracao)} ${f.unidade_conc}`);
      if (!f.pontos || !f.pontos.length) continue;
      L.push(`Vazão em mL/h — diluição ${d.rotulo} (${num(d.concentracao)} ${f.unidade_conc})${f.por_peso ? '' : ' — dose fixa, independe do peso'}:`);
      if (f.por_peso) {
        L.push(`  dose (${f.unidade_dose}) | ` + pesos.map((p) => p + ' kg').join(' | '));
        for (const pt of f.pontos) {
          const rot = num(pt.v) + (pt.r ? ` (${pt.r})` : '');
          L.push(`  ${rot} | ` + pesos.map((p) => num(vazao(f, pt.v, p, d.concentracao))).join(' | '));
        }
      } else {
        for (const pt of f.pontos) {
          L.push(`  ${num(pt.v)} ${f.unidade_dose}${pt.r ? ` (${pt.r})` : ''} = ${num(vazao(f, pt.v, 0, d.concentracao))} mL/h`);
        }
      }
    }
    if (!f.diluicoes || !f.diluicoes.length) L.push('Diluição: não padronizada na página do be·aside — não inventar; orientar a conferir bula e protocolo da instituição.');
    if (f.reavaliar) L.push(`Reavaliar: ${f.reavaliar}`);
    if (f.desmame) L.push(`Desmame: ${f.desmame}`);
    if (f.alertas && f.alertas.length) L.push(`Armadilhas: ${f.alertas.join(' · ')}`);
    L.push(`Fonte: ${f.fonte}`);
  }

  L.push('\n## Pontos práticos de segurança');
  for (const s of fx.seguranca) L.push(`- ${s.tema}: ${s.recomendacao}`);

  // ── guarda: o JSON não pode divergir da página clínica ──────────────
  // Se alguém mudar uma diluição só num dos dois lugares, o build avisa.
  const pag = readFileSync(join(root, 'hemo/drogas.html'), 'utf8')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
  for (const f of fx.farmacos) {
    for (const d of f.diluicoes || []) {
      if (!pag.includes(d.preparo)) {
        avisos.push(`farmacos.json → ${f.nome}: a diluição "${d.preparo}" NÃO existe em hemo/drogas.html. Doses e diluições precisam ser idênticas nos dois lugares — corrija antes de publicar.`);
      }
    }
  }

  const texto = L.join('\n') + '\n';
  const cab = [
    '// GERADO por scripts/build-content.js a partir de conteudo/farmacos.json — NÃO EDITAR À MÃO.',
    '// Para mudar uma dose: altere a página clínica (hemo/drogas.html), depois conteudo/farmacos.json,',
    '// e rode `npm run build:content`. As vazões em mL/h são calculadas aqui, nunca pelo modelo.',
    '', 'export const KNOWLEDGE_FARMACOS = ' + JSON.stringify(texto) + ';', ''
  ].join('\n');

  const abs = join(root, 'api/farmacos.js');
  const antes = existsSync(abs) ? readFileSync(abs, 'utf8') : '';
  if (antes === cab) { iguais.push('api/farmacos.js'); return; }
  if (!CHECK) writeFileSync(abs, cab);
  escritos.push('api/farmacos.js');
}

// ── 7. relatório de sincronia ──────────────────────────────────────────
function auditar() {
  // páginas aposentadas: continuam no repositório, mas são servidas como 301.
  // Não são "esquecidas" — estão declaradas em manifest.redirecionadas.
  const aposentadas = new Set((manifest.redirecionadas || []).map((r) => r.de.replace(/^\//, '')));
  for (const m of manifest.modulos) {
    for (const p of m.paginas) {
      if (!existsSync(join(root, m.root, p.arquivo))) avisos.push(`${m.id}/${p.arquivo}: está no manifesto mas o arquivo não existe.`);
      if (RACIOCINE.includes(m.id) && !p.hub && p.status !== 'oculto') avisos.push(`${m.id}/${p.arquivo}: existe e está no menu, mas NÃO tem card no hub do módulo (invisível para quem chega pela home do módulo).`);
    }
    const temIndice = existsSync(join(root, m.root, 'index.html'));
    if (m.semHub && temIndice) avisos.push(`${m.id}: está declarado como 'semHub' no manifesto, mas ${m.root}index.html existe. Remova o 'semHub' para o hub voltar a ser linkado.`);
    if (!m.semHub && !temIndice) avisos.push(`${m.id}: não tem ${m.root}index.html e não está declarado como 'semHub'. Todo link para /${m.root} cai numa 404 — crie o hub ou declare 'semHub: true'.`);
    const noManifesto = new Set(m.paginas.map((p) => p.arquivo));
    for (const f of readdirSync(join(root, m.root))) {
      if (f.endsWith('.html') && f !== 'index.html' && !noManifesto.has(f) && !aposentadas.has(m.root + f)) avisos.push(`${m.id}/${f}: existe no repositório mas NÃO está no manifesto (fora do menu, do hub, do sitemap e da IA). Se ela foi substituída, declare em 'redirecionadas' no manifesto para virar 301.`);
    }
  }
  for (const a of manifest.artigos) {
    if (!existsSync(join(root, 'artigos', a.arquivo))) avisos.push(`artigos/${a.arquivo}: está no manifesto mas o arquivo não existe.`);
  }
  const noManifesto = new Set(manifest.artigos.map((a) => a.arquivo));
  for (const f of readdirSync(join(root, 'artigos'))) {
    if (f.endsWith('.html') && f !== 'index.html' && !noManifesto.has(f)) avisos.push(`artigos/${f}: existe mas NÃO está no manifesto.`);
  }
}

// ── 8. redirects 301 das páginas aposentadas (vercel.json) ─────────────
// Aposentar uma página = mover a entrada dela para `redirecionadas` no
// manifesto. O arquivo continua no repositório (histórico preservado), mas a
// Vercel passa a responder 301 antes de olhar o disco — link antigo, indexação
// e o que já foi compartilhado no WhatsApp continuam funcionando.
function gerarRedirects() {
  const reds = manifest.redirecionadas || [];
  const abs = join(root, 'vercel.json');
  const conf = JSON.parse(readFileSync(abs, 'utf8'));

  for (const r of reds) {
    const alvo = r.para.replace(/^\//, '');
    const existeAlvo = alvo.endsWith('/') ? existsSync(join(root, alvo, 'index.html')) : existsSync(join(root, alvo));
    if (!existeAlvo) avisos.push(`redirecionadas: ${r.de} aponta para ${r.para}, que não existe. Um 301 para o vazio é pior que a página antiga.`);
    if (r.de === r.para) avisos.push(`redirecionadas: ${r.de} redireciona para si mesmo — laço infinito.`);
  }
  const destinos = new Set(reds.map((r) => r.para));
  for (const r of reds) {
    if (destinos.has(r.de)) avisos.push(`redirecionadas: ${r.de} é origem e destino ao mesmo tempo — corrente de redirect.`);
  }

  conf.redirects = reds.map((r) => ({ source: r.de, destination: r.para, permanent: true }));
  const texto = JSON.stringify(conf, null, 2) + '\n';
  if (readFileSync(abs, 'utf8') === texto) { iguais.push('vercel.json'); return; }
  if (!CHECK) writeFileSync(abs, texto);
  escritos.push('vercel.json');
}

gerarAppJs();
gerarHubs();
gerarArtigos();
gerarKnowledge();
gerarLlms();
gerarFarmacos();
gerarRedirects();
auditar();

const nPag = manifest.modulos.reduce((s, m) => s + m.paginas.length, 0);
console.log(`\nbe·aside — build de conteúdo${CHECK ? ' (--check, nada foi escrito)' : ''}`);
console.log(`Manifesto: ${manifest.modulos.length} módulos · ${nPag} páginas · ${manifest.artigos.length} artigos\n`);
console.log(escritos.length ? `Arquivos ${CHECK ? 'que MUDARIAM' : 'regerados'}:\n` + escritos.map((f) => '  · ' + f).join('\n') : 'Nada a regerar — tudo já está em sincronia.');
if (iguais.length) console.log(`\nJá em sincronia: ${iguais.join(', ')}`);
if (avisos.length) {
  console.log(`\nAvisos (${avisos.length}):`);
  for (const a of avisos) console.log('  ! ' + a);
}
console.log('');
if (CHECK && (escritos.length || avisos.length)) process.exit(1);
