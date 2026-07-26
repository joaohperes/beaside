#!/usr/bin/env node
/**
 * nova-pagina.js — cria uma página nova do be·aside e deixa tudo já rodando.
 *
 * O que ele faz, em uma execução:
 *   1. cria o arquivo HTML do módulo, com o esqueleto e as tags de SEO corretas;
 *   2. registra a página em conteudo/manifest.json (a fonte única de verdade);
 *   3. roda build-content.js  → menu lateral, prev/próximo, busca ⌘K, card no hub,
 *      numeração dos cards, lista da IA e llms.txt;
 *   4. roda seo-tags.js       → canonical, Open Graph, Twitter Card e sitemap.xml.
 *
 * Depois é só escrever o conteúdo clínico dentro do arquivo criado.
 *
 * Exemplo:
 *   npm run nova-pagina -- --modulo vm --id peep \
 *     --titulo "Titulação da PEEP" \
 *     --subtitulo "Tabelas PEEP/FiO₂, PEEP decremental e stress index" \
 *     --categoria "Fundamentos"
 *
 * Só registrar no manifesto, sem criar arquivo (útil para artigos escritos à mão):
 *   npm run nova-pagina -- --modulo hemo --id x --titulo "..." --subtitulo "..." \
 *     --categoria "Fundamentos" --so-registrar
 *
 * Flags:
 *   --modulo      vm | hemo | neuro | proc        (obrigatório)
 *   --id          identificador curto, sem espaço (obrigatório)
 *   --titulo      título completo, usado no H1    (obrigatório)
 *   --subtitulo   uma linha explicando a página   (obrigatório)
 *   --categoria   grupo do menu e do hub          (obrigatório)
 *   --arquivo     padrão: <id>.html
 *   --menu        rótulo curto do menu lateral    (padrão: --titulo)
 *   --selo        rótulo do card no hub           (padrão: --categoria)
 *   --grupo       seção do hub                    (padrão: --categoria)
 *   --resumo      texto do card no hub            (padrão: --subtitulo)
 *   --eyebrow     linha acima do H1               (padrão: "<módulo> · <categoria>")
 *   --tipo        guia | calculadora | quiz | referencia | pearls   (padrão: guia)
 *   --posicao     índice 1-based onde entrar no menu (padrão: junto da mesma categoria)
 *   --sem-ia      não enviar esta página para o assistente de IA
 *   --em-breve    publica só o card "em breve" no hub (página ainda não escrita)
 *   --so-registrar  não cria o HTML, só registra no manifesto
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MAN = join(root, 'conteudo/manifest.json');

// ── argumentos ─────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (n) => argv.includes('--' + n);
const arg = (n, padrao = null) => {
  const i = argv.indexOf('--' + n);
  return i === -1 || !argv[i + 1] || argv[i + 1].startsWith('--') ? padrao : argv[i + 1];
};
function erro(msg) { console.error('\n✗ ' + msg + '\n'); process.exit(1); }

const modId = arg('modulo');
const id = arg('id');
const titulo = arg('titulo');
const subtitulo = arg('subtitulo');
const categoria = arg('categoria');
if (!modId || !id || !titulo || !subtitulo || !categoria)
  erro('faltam campos obrigatórios: --modulo --id --titulo --subtitulo --categoria\n  (rode sem argumentos e leia o cabeçalho de scripts/nova-pagina.js para os exemplos)');
if (!/^[a-z0-9-]+$/.test(id)) erro(`--id inválido: "${id}". Use só letras minúsculas, números e hífen.`);

const manifest = JSON.parse(readFileSync(MAN, 'utf8'));
const mod = manifest.modulos.find((m) => m.id === modId);
if (!mod) erro(`módulo "${modId}" não existe. Disponíveis: ${manifest.modulos.map((m) => m.id).join(', ')}`);

const arquivo = arg('arquivo', `${id}.html`);
const menu = arg('menu', titulo);
const selo = arg('selo', categoria);
const grupo = arg('grupo', categoria);
const resumo = arg('resumo', subtitulo);
const eyebrow = arg('eyebrow', `${mod.subtitulo} · ${categoria}`);
const tipo = arg('tipo', 'guia');
const emBreve = flag('em-breve');
const soRegistrar = flag('so-registrar');

if (mod.paginas.some((p) => p.id === id)) erro(`já existe uma página com id "${id}" em ${modId}.`);
if (mod.paginas.some((p) => p.arquivo === arquivo)) erro(`já existe uma página apontando para ${modId}/${arquivo}.`);
const destino = join(root, mod.root, arquivo);
if (!soRegistrar && existsSync(destino)) erro(`o arquivo ${modId}/${arquivo} já existe no repositório. Use --so-registrar para apenas registrá-lo.`);

// ── 1. entrada no manifesto ────────────────────────────────────────────
const nova = {
  id, arquivo, categoria, menu, titulo, subtitulo,
  tipo, status: 'publicado', ia: !flag('sem-ia') && !emBreve,
  hub: { grupo, selo, titulo: menu, resumo, ...(emBreve ? { estado: 'em-breve' } : {}) },
};

let pos;
const explicita = arg('posicao');
if (explicita) pos = Math.max(0, Math.min(mod.paginas.length, parseInt(explicita, 10) - 1));
else {
  const ultima = mod.paginas.map((p) => p.categoria).lastIndexOf(categoria);
  pos = ultima === -1 ? mod.paginas.length : ultima + 1;
}
mod.paginas.splice(pos, 0, nova);
writeFileSync(MAN, JSON.stringify(manifest, null, 2) + '\n');
console.log(`\n✓ registrada no manifesto: ${modId}/${arquivo} (posição ${pos + 1} de ${mod.paginas.length})`);

// ── 2. arquivo HTML ────────────────────────────────────────────────────
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const att = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const url = `${manifest.site.url}/${mod.root}${arquivo}`;
const tituloPagina = `${menu} — be·aside`;

if (!soRegistrar) {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<script src="../assets/theme-boot.js"></script>

<meta charset="UTF-8">
<link rel="apple-touch-icon" href="../assets/apple-touch-icon.png">
<link rel="icon" type="image/x-icon" href="../assets/favicon.ico">
<link rel="icon" type="image/svg+xml" href="../assets/favicon.svg">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${att(tituloPagina)}</title>
<meta name="description" content="${att(subtitulo)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="be·aside">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="${att(tituloPagina)}">
<meta property="og:description" content="${att(subtitulo)}">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${att(tituloPagina)}">
<meta name="twitter:description" content="${att(subtitulo)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/styles.css">
</head>
<body data-module="${modId}" data-page="${id}">
<main class="main">
<section class="section" id="${id}">
  <header class="page-head">
    <div class="hero-eyebrow">${esc(eyebrow)}</div>
      <h1 class="section-title">${esc(titulo)} <a class="share-link" href="#${id}" onclick="copyLink(event,'#${id}')"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></a></h1>
      <p class="section-subtitle">${esc(subtitulo)}</p>
  </header>

  <!-- Números de destaque do topo (opcional). Apague o bloco se não usar. -->
  <div class="hero-meta cols-2">
    <div class="hm-item"><span class="hm-k">[PREENCHER — parâmetro]</span><span class="hm-v">[PREENCHER — valor]</span></div>
    <div class="hm-item"><span class="hm-k">[PREENCHER — parâmetro]</span><span class="hm-v">[PREENCHER — valor]</span></div>
  </div>

  <div class="anatomy-note"><strong>Conceito:</strong> [PREENCHER — a ideia central da página em 2 ou 3 frases, ligando fisiologia e conduta.]</div>
  <div class="ref">[PREENCHER — referência da afirmação acima]</div>

  <div class="sec-h"><span class="sec-num">01</span><h2>[PREENCHER — título da primeira seção]</h2></div>
  <p class="sec-lead">[PREENCHER — parágrafo de abertura da seção.]</p>
  <div class="ref">[PREENCHER — referência]</div>

  <div class="sec-h"><span class="sec-num">02</span><h2>[PREENCHER — título da segunda seção]</h2></div>
  <div class="table-wrap"><table>
    <thead><tr><th>[PREENCHER]</th><th>[PREENCHER]</th><th>[PREENCHER]</th></tr></thead>
    <tbody>
      <tr><td>[PREENCHER]</td><td>[PREENCHER]</td><td>[PREENCHER]</td></tr>
    </tbody>
  </table></div>
  <div class="ref">[PREENCHER — referência]</div>

  <div class="tip-box">
    <strong>[PREENCHER — armadilha de plantão]</strong>
    [PREENCHER — o erro comum, por que acontece e o que fazer.]
  </div>
</section>
</main>
<script src="../assets/app.js"></script>
</body>
</html>
`;
  writeFileSync(destino, html);
  console.log(`✓ arquivo criado:      ${modId}/${arquivo}`);
}

// ── 3 e 4. regerar tudo que depende do conteúdo ────────────────────────
const rodar = (script) => {
  try {
    execFileSync('node', [join(root, 'scripts', script)], { cwd: root, stdio: 'inherit' });
  } catch { console.error(`\n✗ falha ao rodar scripts/${script} — rode manualmente.`); }
};
rodar('build-content.js');
rodar('seo-tags.js');

console.log(`
Pronto. A página já está no menu lateral, no card do hub, na busca ⌘K,
no sitemap e (se --sem-ia não foi usado) na base do assistente.

Falta só o conteúdo clínico: abra ${mod.root}${arquivo} e substitua os [PREENCHER].
Depois rode:  npm run extract-knowledge
`);
