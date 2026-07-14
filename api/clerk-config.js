/**
 * Devolve a Publishable Key do Clerk (pública) para o front.
 * Configure na Vercel: CLERK_PUBLISHABLE_KEY ou NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
 *
 * NÃO expõe a Secret Key.
 */
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const key =
    process.env.CLERK_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    '';

  if (!key) {
    res.status(200).json({ configured: false, publishableKey: null });
    return;
  }

  res.status(200).json({ configured: true, publishableKey: key });
}
