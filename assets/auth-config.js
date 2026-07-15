/**
 * be·aside — config pública de auth (Clerk)
 *
 * A Publishable Key (pk_*) é pública por design — pode ir no front.
 * Secret Key (sk_*) NUNCA entra aqui.
 *
 * Preencha PUBLISHABLE_KEY ou defina CLERK_PUBLISHABLE_KEY na Vercel
 * (a API /api/clerk-config devolve a key em runtime).
 *
 * Dashboard (app arriving-seasnail-55) — checklist ponta a ponta:
 * - Paths: Home / Sign-in / Sign-up → https://be-aside.vercel.app (+ /login.html)
 * - Allowed redirect URLs: https://be-aside.vercel.app/* , http://localhost:* , http://127.0.0.1:*
 * - Allowed origins: mesmas origens
 * - User & auth: e-mail+senha on; username off; Google on
 * - Attack protection: Bot sign-up = Smart CAPTCHA (UI tem #clerk-captcha)
 */
window.BEASIDE_AUTH = {
  /** Cole a pk_test_… ou pk_live_… do Clerk Dashboard → API Keys */
  PUBLISHABLE_KEY: 'pk_test_YXJyaXZpbmctc2Vhc25haWwtNTUuY2xlcmsuYWNjb3VudHMuZGV2JA',

  /** URLs após auth (relativas à origem) */
  AFTER_SIGN_IN: 'index.html',
  AFTER_SIGN_UP: 'index.html',
  AFTER_SIGN_OUT: 'index.html',
  SSO_CALLBACK: 'sso-callback.html',

  /** Estratégias sociais (desligue se ainda não configurou no Clerk) */
  OAUTH_GOOGLE: true,
  OAUTH_APPLE: false,
};
