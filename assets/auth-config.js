/**
 * be·aside — config pública de auth (Clerk)
 *
 * A Publishable Key (pk_*) é pública por design — pode ir no front.
 * Secret Key (sk_*) NUNCA entra aqui.
 *
 * ═══ NÃO PREENCHA `PUBLISHABLE_KEY` AQUI ═══
 *
 * A chave vem da Vercel, por `CLERK_PUBLISHABLE_KEY`, servida em runtime por
 * `/api/clerk-config`. Deixe o campo abaixo VAZIO.
 *
 * `resolvePublishableKey` em `auth.js` prefere o valor deste arquivo e só
 * consulta a API quando ele está vazio. Com uma chave escrita aqui, existem
 * DUAS fontes da verdade — e a de dentro do arquivo sempre vence.
 *
 * Isso mordeu na virada para produção (19/08/2026): a env var da Vercel já
 * servia a `pk_live_`, o hub-uti já falava com a instância nova, e o login do
 * beaside continuava mandando todo mundo para a instância de DESENVOLVIMENTO
 * — em silêncio, porque logar funcionava. O sintoma foi a lista de usuários de
 * produção seguir vazia depois de vários logins bem-sucedidos.
 *
 * Trocar de instância é mudar UMA variável de ambiente. Se um dia isto voltar
 * a ser preenchido, volta junto o dia inteiro de confusão.
 *
 * Dashboard — checklist ponta a ponta:
 * - Paths: Home / Sign-in / Sign-up → https://be-aside.vercel.app (+ /login.html)
 * - Allowed redirect URLs: https://be-aside.vercel.app/* , http://localhost:* , http://127.0.0.1:*
 * - Allowed origins: mesmas origens
 * - User & auth: e-mail+senha on; username off; Google on
 * - Attack protection: Bot sign-up = Smart CAPTCHA (UI tem #clerk-captcha)
 */
window.BEASIDE_AUTH = {
  /**
   * VAZIO DE PROPÓSITO — a chave vem de `/api/clerk-config` (env da Vercel).
   * Preencher aqui sobrepõe a env var em silêncio. Ver o cabeçalho.
   */
  PUBLISHABLE_KEY: '',

  /** URLs após auth (relativas à origem) */
  AFTER_SIGN_IN: 'index.html',
  AFTER_SIGN_UP: 'index.html',
  AFTER_SIGN_OUT: 'index.html',
  ACCOUNT_PAGE: 'conta.html',
  SSO_CALLBACK: 'sso-callback.html',

  /** Estratégias sociais (desligue se ainda não configurou no Clerk) */
  OAUTH_GOOGLE: true,
  OAUTH_APPLE: false,
};
