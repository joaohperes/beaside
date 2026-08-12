/**
 * Devolve a URL e a chave pública (anon) do Supabase para o front do Hub UTI.
 *
 * Mesmo padrão do `clerk-config.js`: o Hub é publicado como bundle estático
 * dentro do be·aside, então buscar em runtime evita rebuildar o app para
 * trocar de projeto.
 *
 * A anon key é PÚBLICA por desenho — ela não autoriza nada sozinha. Quem
 * decide o que cada requisição enxerga é o RLS, a partir do JWT do Clerk.
 * A service key, essa sim secreta, não aparece aqui nem em lugar algum do
 * caminho do cliente: ela ignora RLS e desfaria a trilha de auditoria.
 *
 * Configure na Vercel: SUPABASE_URL e SUPABASE_ANON_KEY.
 */
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const url = process.env.SUPABASE_URL || '';
  const anonKey =
    process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '';

  if (!url || !anonKey) {
    res.status(200).json({ configured: false, url: null, anonKey: null });
    return;
  }

  res.status(200).json({ configured: true, url, anonKey });
}
