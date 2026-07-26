// Servidor local do be·aside — "quero ver como está" em um comando só.
//
// Por que não `python3 -m http.server`: em produção quem responde é a Vercel,
// que aplica os redirects 301 e o rewrite do vercel.json antes de servir o
// arquivo. Um servidor estático cru ignora isso, então o site local passa a
// mentir justamente sobre as regras que ninguém testa à mão — um 301 quebrado
// só apareceria depois, em produção, como link morto.
//
// Este servidor lê o vercel.json de verdade. O que ele NÃO faz é rodar as
// funções de /api/ (elas precisam de `vercel dev` e das chaves) — e por isso
// responde /api/* com uma mensagem explícita, em vez de deixar o assistente
// falhar com um erro obscuro que parece bug do site.
//
// Uso: npm run dev   →   http://localhost:8000

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const PORTA = Number(process.env.PORT) || 8000;

const vercel = JSON.parse(await readFile(join(RAIZ, 'vercel.json'), 'utf8'));
const REDIRECTS = new Map((vercel.redirects || []).map((r) => [r.source, r]));
const REWRITES = new Map((vercel.rewrites || []).map((r) => [r.source, r.destination]));

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.webmanifest': 'application/manifest+json',
};

const arquivo = async (abs) => {
  try { const s = await stat(abs); return s.isFile() ? abs : null; } catch { return null; }
};

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let caminho = decodeURIComponent(url.pathname);

  // 1. redirects do vercel.json — o mesmo 301 que a produção devolve
  const red = REDIRECTS.get(caminho);
  if (red) {
    res.writeHead(red.permanent === false ? 302 : 301, { Location: red.destination });
    console.log(`  ${red.permanent === false ? 302 : 301}  ${caminho} → ${red.destination}`);
    return res.end();
  }

  // 2. rewrites do vercel.json — muda o arquivo servido, não a URL
  if (REWRITES.has(caminho)) caminho = REWRITES.get(caminho);

  // 3. as funções de /api/ não rodam aqui. Dizer isso em voz alta é melhor do
  //    que devolver 404 e deixar o Consulte e Resolva parecer quebrado.
  if (caminho.startsWith('/api/')) {
    res.writeHead(501, { 'Content-Type': 'application/json; charset=utf-8' });
    console.log(`  501  ${caminho}  (função serverless — precisa de \`vercel dev\`)`);
    return res.end(JSON.stringify({
      // `error` (inglês) porque é a chave que o front do Consulte e Resolva lê
      // em `data.error`. Sem ela o chat mostrava só "Erro 501" e a explicação
      // abaixo, que diz exatamente o que fazer, nunca chegava a quem precisava.
      error: 'As funções de /api/ não rodam no servidor local — o assistente de IA precisa da Vercel. Todo o resto do site (módulos, artigos, calculadoras, navegação) está funcionando aqui.',
      erro: 'Servidor local: as funções de /api/ não rodam aqui.',
      detalhe: 'O conteúdo estático (módulos, artigos, calculadoras, navegação) está completo. '
             + 'Para testar o assistente de IA é preciso `vercel dev` com ANTHROPIC_API_KEY e as chaves do Clerk.',
      rota: caminho,
    }, null, 2));
  }

  // 4. arquivo estático. Diretório serve o index.html de dentro dele.
  const seguro = normalize(caminho).replace(/^(\.\.[/\\])+/, '');
  let abs = join(RAIZ, seguro);
  let achado = await arquivo(abs);
  if (!achado && !extname(seguro)) achado = await arquivo(join(abs, 'index.html'));
  if (!achado && caminho.endsWith('/')) achado = await arquivo(join(abs, 'index.html'));

  if (!achado) {
    const pag404 = await arquivo(join(RAIZ, '404.html'));
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    console.log(`  404  ${caminho}`);
    return res.end(pag404 ? await readFile(pag404) : 'Nao encontrado');
  }

  const corpo = await readFile(achado);
  res.writeHead(200, {
    'Content-Type': TIPOS[extname(achado).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-store',   // sempre a versão do disco: recarregar mostra a edição
  });
  res.end(corpo);
}).listen(PORTA, () => {
  console.log(`\n  be·aside rodando local\n`);
  console.log(`  →  http://localhost:${PORTA}\n`);
  console.log(`  Estático completo, com os redirects e o rewrite do vercel.json.`);
  console.log(`  As funções de /api/ (assistente de IA, hub de plantão) não rodam aqui.`);
  console.log(`  Ctrl+C para parar.\n`);
});
