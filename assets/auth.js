/**
 * be·aside — cliente Clerk (vanilla, site estático)
 * Depende de assets/auth-config.js (window.BEASIDE_AUTH).
 */
(function (global) {
  'use strict';

  var cfg = global.BEASIDE_AUTH || {};
  var clerk = null;
  var readyPromise = null;
  var loadError = null;
  var DEFAULT_OP_TIMEOUT_MS = 28000;

  var PT_MESSAGES = {
    form_identifier_not_found: 'Não encontramos uma conta com este e-mail.',
    form_password_incorrect: 'Senha incorreta.',
    form_password_pwned:
      'Esta senha apareceu em vazamentos públicos. Escolha outra senha.',
    form_password_length_too_short: 'Senha muito curta.',
    form_password_not_strong_enough:
      'Senha fraca demais. Use uma combinação mais forte (letras, números, símbolos).',
    form_identifier_exists: 'Já existe uma conta com este e-mail. Tente entrar.',
    form_code_incorrect: 'Código inválido.',
    form_param_format_invalid: 'Formato inválido. Confira e-mail e senha.',
    form_param_nil: 'Preencha todos os campos obrigatórios.',
    captcha_invalid: 'Falha na verificação anti-bot. Recarregue e tente de novo.',
    captcha_unavailable:
      'Não foi possível carregar o captcha. Desative bloqueadores ou recarregue a página.',
    too_many_requests: 'Muitas tentativas. Aguarde um momento e tente de novo.',
    session_exists: 'Você já está logado.',
    not_allowed_access:
      'Origem não autorizada no Clerk. Adicione este domínio em Allowed origins / Redirect URLs.',
    strategy_for_user_invalid: 'Este método de login não está disponível para a conta.',
    form_conditional_param_value_disallowed: 'Valor não permitido para este campo.',
  };

  function fapiFromKey(pk) {
    try {
      var part = pk.split('_')[2];
      if (!part) return null;
      return atob(part).slice(0, -1);
    } catch (e) {
      return null;
    }
  }

  function loadScript(src, attrs) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.crossOrigin = 'anonymous';
      if (attrs) {
        Object.keys(attrs).forEach(function (k) {
          s.setAttribute(k, attrs[k]);
        });
      }
      s.onload = function () {
        resolve();
      };
      s.onerror = function () {
        reject(new Error('Falha ao carregar o SDK do Clerk.'));
      };
      document.head.appendChild(s);
    });
  }

  function withTimeout(promise, ms, label) {
    var msSafe = ms || DEFAULT_OP_TIMEOUT_MS;
    var timer;
    var timeout = new Promise(function (_, reject) {
      timer = setTimeout(function () {
        reject(
          new Error(
            (label || 'Operação') +
              ' demorou demais. Se um captcha aparecer, complete-o; senão, recarregue a página.'
          )
        );
      }, msSafe);
    });
    return Promise.race([promise, timeout]).then(
      function (v) {
        clearTimeout(timer);
        return v;
      },
      function (e) {
        clearTimeout(timer);
        throw e;
      }
    );
  }

  async function resolvePublishableKey() {
    var key = (cfg.PUBLISHABLE_KEY || '').trim();
    if (key && key.indexOf('pk_') === 0) return key;

    try {
      var res = await fetch('/api/clerk-config', { credentials: 'omit' });
      if (res.ok) {
        var data = await res.json();
        if (data && data.publishableKey) return String(data.publishableKey).trim();
      }
    } catch (e) {
      /* local file:// ou API ausente */
    }
    return '';
  }

  function clerkErrorMessage(err) {
    if (!err) return 'Erro desconhecido.';

    if (typeof err === 'string') {
      if (err === 'missing_key') {
        return 'Publishable Key do Clerk não configurada.';
      }
      if (err === 'invalid_key') {
        return 'Publishable Key do Clerk inválida.';
      }
    }

    var errs = err.errors;
    if (errs && errs.length) {
      return errs
        .map(function (e) {
          var code = e.code || '';
          if (PT_MESSAGES[code]) return PT_MESSAGES[code];
          // captcha / bot
          if (/captcha/i.test(code) || /captcha/i.test(e.message || '')) {
            return PT_MESSAGES.captcha_invalid;
          }
          return e.longMessage || e.message || code;
        })
        .filter(Boolean)
        .join(' ');
    }

    var msg = err.message || String(err);
    if (/origin|allowed|redirect/i.test(msg)) {
      return PT_MESSAGES.not_allowed_access;
    }
    return msg;
  }

  async function init() {
    if (readyPromise) return readyPromise;
    readyPromise = (async function () {
      var pk = await resolvePublishableKey();
      if (!pk) {
        loadError = 'missing_key';
        return null;
      }
      cfg.PUBLISHABLE_KEY = pk;

      var fapi = fapiFromKey(pk);
      if (!fapi) {
        loadError = 'invalid_key';
        throw new Error('Publishable Key inválida.');
      }

      if (!global.Clerk) {
        await loadScript(
          'https://' + fapi + '/npm/@clerk/clerk-js@5/dist/clerk.browser.js',
          { 'data-clerk-publishable-key': pk }
        );
      }

      // Aguarda global Clerk (script async)
      var tries = 0;
      while (!global.Clerk && tries < 40) {
        await new Promise(function (r) {
          setTimeout(r, 50);
        });
        tries++;
      }
      if (!global.Clerk) throw new Error('Clerk SDK não carregou.');

      // CDN com data-clerk-publishable-key → instância pronta; senão constructor
      if (typeof global.Clerk === 'function' && typeof global.Clerk.load !== 'function') {
        clerk = new global.Clerk(pk);
      } else {
        clerk = global.Clerk;
      }

      if (!clerk.loaded) {
        await withTimeout(
          clerk.load({
            // Mantém sessão em cookies do browser (padrão)
            standardBrowser: true,
          }),
          20000,
          'Inicialização do Clerk'
        );
      }
      loadError = null;
      return clerk;
    })().catch(function (e) {
      loadError = e && e.message === 'Publishable Key inválida.' ? 'invalid_key' : e;
      console.error('[beaside-auth]', e);
      // permite retry se falhou
      readyPromise = null;
      throw e;
    });
    return readyPromise;
  }

  function isConfigured() {
    var key = (cfg.PUBLISHABLE_KEY || '').trim();
    return !!(key && key.indexOf('pk_') === 0);
  }

  function isSignedIn() {
    return !!(clerk && clerk.user);
  }

  function getUser() {
    return clerk && clerk.user ? clerk.user : null;
  }

  function displayName(user) {
    if (!user) return '';
    if (user.fullName) return user.fullName;
    if (user.firstName) return user.firstName;
    var email =
      (user.primaryEmailAddress && user.primaryEmailAddress.emailAddress) ||
      (user.emailAddresses && user.emailAddresses[0] && user.emailAddresses[0].emailAddress);
    if (email) return email.split('@')[0];
    return 'Conta';
  }

  function primaryEmail(user) {
    if (!user) return '';
    return (
      (user.primaryEmailAddress && user.primaryEmailAddress.emailAddress) ||
      (user.emailAddresses && user.emailAddresses[0] && user.emailAddresses[0].emailAddress) ||
      ''
    );
  }

  function absoluteUrl(path) {
    try {
      return new URL(path, global.location.href).href;
    } catch (e) {
      return path;
    }
  }

  function afterAuthUrl(kind) {
    var path =
      kind === 'sign-up'
        ? cfg.AFTER_SIGN_UP || cfg.AFTER_SIGN_IN || 'index.html'
        : cfg.AFTER_SIGN_IN || 'index.html';
    return absoluteUrl(path);
  }

  async function setActiveSession(sessionId) {
    await clerk.setActive({ session: sessionId });
  }

  function needsEmailVerification(attempt) {
    if (!attempt) return false;
    if (attempt.status === 'missing_requirements') return true;
    var ver = attempt.unverifiedFields || [];
    if (ver.indexOf('email_address') !== -1) return true;
    try {
      var st =
        attempt.verifications &&
        attempt.verifications.emailAddress &&
        attempt.verifications.emailAddress.status;
      if (st && st !== 'verified') return true;
    } catch (e) {
      /* ignore */
    }
    return false;
  }

  async function signInWithPassword(email, password) {
    await init();
    var attempt = await withTimeout(
      clerk.client.signIn.create({
        identifier: email,
        password: password,
      }),
      DEFAULT_OP_TIMEOUT_MS,
      'Login'
    );

    if (attempt.status === 'complete') {
      await setActiveSession(attempt.createdSessionId);
      return { status: 'complete' };
    }

    if (attempt.status === 'needs_second_factor') {
      var emailFactor = (attempt.supportedSecondFactors || []).find(function (f) {
        return f.strategy === 'email_code';
      });
      if (emailFactor) {
        await clerk.client.signIn.prepareSecondFactor({
          strategy: 'email_code',
          emailAddressId: emailFactor.emailAddressId,
        });
        return { status: 'needs_second_factor', strategy: 'email_code' };
      }
      return { status: attempt.status, message: 'Segundo fator não suportado nesta UI ainda.' };
    }

    if (attempt.status === 'needs_first_factor') {
      return {
        status: attempt.status,
        message: 'Complete o fator de autenticação pendente (e-mail ou senha).',
      };
    }

    return {
      status: attempt.status || 'unknown',
      message: 'Login incompleto. Status: ' + (attempt.status || '?'),
    };
  }

  async function verifySecondFactor(code) {
    await init();
    var attempt = await withTimeout(
      clerk.client.signIn.attemptSecondFactor({
        strategy: 'email_code',
        code: code,
      }),
      DEFAULT_OP_TIMEOUT_MS,
      'Verificação'
    );
    if (attempt.status === 'complete') {
      await setActiveSession(attempt.createdSessionId);
      return { status: 'complete' };
    }
    return {
      status: attempt.status || 'unknown',
      message: 'Código inválido ou expirado.',
    };
  }

  async function signUpWithPassword(email, password, profile) {
    await init();

    // Garante placeholder de captcha (Bot sign-up protection / Smart CAPTCHA)
    if (typeof document !== 'undefined' && !document.getElementById('clerk-captcha')) {
      console.warn(
        '[beaside-auth] #clerk-captcha ausente — captcha pode falhar no cadastro.'
      );
    }

    var payload = {
      emailAddress: email,
      password: password,
    };
    if (profile && typeof profile === 'object') {
      if (profile.firstName) payload.firstName = String(profile.firstName).trim();
      if (profile.lastName) payload.lastName = String(profile.lastName).trim();
    }

    var attempt = await withTimeout(
      clerk.client.signUp.create(payload),
      DEFAULT_OP_TIMEOUT_MS,
      'Cadastro'
    );

    if (attempt.status === 'complete') {
      await setActiveSession(attempt.createdSessionId);
      return { status: 'complete' };
    }

    if (needsEmailVerification(attempt)) {
      try {
        await clerk.client.signUp.prepareEmailAddressVerification({
          strategy: 'email_code',
        });
      } catch (e) {
        /* pode já estar preparado */
      }
      return { status: 'needs_email_verification' };
    }

    return {
      status: attempt.status || 'unknown',
      message: 'Cadastro incompleto. Status: ' + (attempt.status || '?'),
    };
  }

  async function verifyEmailCode(code) {
    await init();
    var attempt = await withTimeout(
      clerk.client.signUp.attemptEmailAddressVerification({
        code: code,
      }),
      DEFAULT_OP_TIMEOUT_MS,
      'Verificação de e-mail'
    );
    if (attempt.status === 'complete') {
      await setActiveSession(attempt.createdSessionId);
      return { status: 'complete' };
    }
    return {
      status: attempt.status || 'unknown',
      message: 'Código inválido ou expirado.',
    };
  }

  async function oauth(provider) {
    await init();
    var strategy = provider === 'apple' ? 'oauth_apple' : 'oauth_google';
    var redirectUrl = absoluteUrl(cfg.SSO_CALLBACK || 'sso-callback.html');
    var complete = afterAuthUrl('sign-in');

    await clerk.client.signIn.authenticateWithRedirect({
      strategy: strategy,
      redirectUrl: redirectUrl,
      redirectUrlComplete: complete,
    });
  }

  async function handleOAuthCallback() {
    await init();
    if (typeof clerk.handleRedirectCallback === 'function') {
      await withTimeout(
        clerk.handleRedirectCallback({
          signInFallbackRedirectUrl: afterAuthUrl('sign-in'),
          signUpFallbackRedirectUrl: afterAuthUrl('sign-up'),
        }),
        20000,
        'Callback OAuth'
      );
    }
  }

  async function startPasswordReset(email) {
    await init();
    await withTimeout(
      clerk.client.signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      }),
      DEFAULT_OP_TIMEOUT_MS,
      'Recuperação de senha'
    );
    return { status: 'needs_reset_code' };
  }

  async function completePasswordReset(code, newPassword) {
    await init();
    var attempt = await withTimeout(
      clerk.client.signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: code,
        password: newPassword,
      }),
      DEFAULT_OP_TIMEOUT_MS,
      'Redefinição de senha'
    );
    if (attempt.status === 'complete') {
      await setActiveSession(attempt.createdSessionId);
      return { status: 'complete' };
    }
    if (attempt.status === 'needs_new_password') {
      try {
        var again = await clerk.client.signIn.resetPassword({
          password: newPassword,
        });
        if (again.status === 'complete') {
          await setActiveSession(again.createdSessionId);
          return { status: 'complete' };
        }
      } catch (e) {
        /* fallthrough */
      }
    }
    return {
      status: attempt.status || 'unknown',
      message: 'Não foi possível redefinir a senha com este código.',
    };
  }

  async function signOut() {
    await init();
    await clerk.signOut({ redirectUrl: absoluteUrl(cfg.AFTER_SIGN_OUT || 'index.html') });
  }

  /**
   * Atualiza chrome do hub: troca "Entrar" por chip do usuário + sair.
   * @param {HTMLElement|null} slot — elemento .btn-entrar ou container
   */
  function paintHubAuth(slot) {
    if (!slot) return;
    var parent = slot.parentElement;
    if (!parent) return;

    parent.querySelectorAll('[data-auth-chip]').forEach(function (n) {
      n.remove();
    });

    if (!isSignedIn()) {
      slot.hidden = false;
      slot.style.display = '';
      return;
    }

    slot.hidden = true;
    slot.style.display = 'none';

    var user = getUser();
    var name = displayName(user);
    var email = primaryEmail(user);

    var chip = document.createElement('div');
    chip.setAttribute('data-auth-chip', '1');
    chip.className = 'auth-chip';
    chip.innerHTML =
      '<span class="auth-chip-dot" aria-hidden="true"></span>' +
      '<span class="auth-chip-name" title="' +
      escapeAttr(email || name) +
      '">' +
      escapeHtml(name) +
      '</span>' +
      '<button type="button" class="auth-chip-out" data-auth-signout>Sair</button>';
    parent.insertBefore(chip, slot);

    var btn = chip.querySelector('[data-auth-signout]');
    if (btn) {
      btn.addEventListener('click', function () {
        btn.disabled = true;
        signOut().catch(function (e) {
          console.error(e);
          btn.disabled = false;
        });
      });
    }
  }

  /**
   * Liga o slot do hub e re-pinta em mudanças de sessão.
   */
  function bindHubAuth(slot) {
    if (!slot) return Promise.resolve();
    return init()
      .then(function () {
        paintHubAuth(slot);
        if (clerk && typeof clerk.addListener === 'function') {
          clerk.addListener(function () {
            paintHubAuth(slot);
          });
        }
      })
      .catch(function () {
        /* sem key / offline — mantém Entrar */
      });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, '&#39;');
  }

  global.BeAsideAuth = {
    init: init,
    isConfigured: isConfigured,
    isSignedIn: isSignedIn,
    getUser: getUser,
    displayName: displayName,
    primaryEmail: primaryEmail,
    signInWithPassword: signInWithPassword,
    signUpWithPassword: signUpWithPassword,
    verifyEmailCode: verifyEmailCode,
    verifySecondFactor: verifySecondFactor,
    oauth: oauth,
    handleOAuthCallback: handleOAuthCallback,
    startPasswordReset: startPasswordReset,
    completePasswordReset: completePasswordReset,
    signOut: signOut,
    paintHubAuth: paintHubAuth,
    bindHubAuth: bindHubAuth,
    clerkErrorMessage: clerkErrorMessage,
    afterAuthUrl: afterAuthUrl,
    getClerk: function () {
      return clerk;
    },
    getConfig: function () {
      return cfg;
    },
    getLoadError: function () {
      return loadError;
    },
  };
})(window);
