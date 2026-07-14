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
        reject(new Error('Falha ao carregar ' + src));
      };
      document.head.appendChild(s);
    });
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
    var errs = err.errors;
    if (errs && errs.length) {
      return errs
        .map(function (e) {
          return e.longMessage || e.message || e.code;
        })
        .filter(Boolean)
        .join(' ');
    }
    return err.message || String(err);
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
      await clerk.load();
      return clerk;
    })().catch(function (e) {
      loadError = e;
      console.error('[beaside-auth]', e);
      throw e;
    });
    return readyPromise;
  }

  function isConfigured() {
    return !!(cfg.PUBLISHABLE_KEY || !loadError);
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

  async function setActiveSession(sessionId) {
    await clerk.setActive({ session: sessionId });
  }

  async function signInWithPassword(email, password) {
    await init();
    var attempt = await clerk.client.signIn.create({
      identifier: email,
      password: password,
    });

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

    return {
      status: attempt.status || 'unknown',
      message: 'Login incompleto. Status: ' + (attempt.status || '?'),
    };
  }

  async function verifySecondFactor(code) {
    await init();
    var attempt = await clerk.client.signIn.attemptSecondFactor({
      strategy: 'email_code',
      code: code,
    });
    if (attempt.status === 'complete') {
      await setActiveSession(attempt.createdSessionId);
      return { status: 'complete' };
    }
    return {
      status: attempt.status || 'unknown',
      message: 'Código inválido ou expirado.',
    };
  }

  async function signUpWithPassword(email, password) {
    await init();
    var attempt = await clerk.client.signUp.create({
      emailAddress: email,
      password: password,
    });

    if (attempt.status === 'complete') {
      await setActiveSession(attempt.createdSessionId);
      return { status: 'complete' };
    }

    // Verificação de e-mail (padrão Clerk)
    if (attempt.status === 'missing_requirements') {
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
    var attempt = await clerk.client.signUp.attemptEmailAddressVerification({
      code: code,
    });
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
    var complete = absoluteUrl(cfg.AFTER_SIGN_IN || 'index.html');

    await clerk.client.signIn.authenticateWithRedirect({
      strategy: strategy,
      redirectUrl: redirectUrl,
      redirectUrlComplete: complete,
    });
  }

  async function handleOAuthCallback() {
    await init();
    if (typeof clerk.handleRedirectCallback === 'function') {
      await clerk.handleRedirectCallback({
        signInFallbackRedirectUrl: absoluteUrl(cfg.AFTER_SIGN_IN || 'index.html'),
        signUpFallbackRedirectUrl: absoluteUrl(cfg.AFTER_SIGN_UP || 'index.html'),
      });
    }
  }

  async function startPasswordReset(email) {
    await init();
    await clerk.client.signIn.create({
      strategy: 'reset_password_email_code',
      identifier: email,
    });
    return { status: 'needs_reset_code' };
  }

  async function completePasswordReset(code, newPassword) {
    await init();
    var attempt = await clerk.client.signIn.attemptFirstFactor({
      strategy: 'reset_password_email_code',
      code: code,
      password: newPassword,
    });
    if (attempt.status === 'complete') {
      await setActiveSession(attempt.createdSessionId);
      return { status: 'complete' };
    }
    if (attempt.status === 'needs_new_password') {
      // algumas versões pedem step separado
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
    await clerk.signOut({ redirectUrl: absoluteUrl('index.html') });
  }

  /**
   * Atualiza chrome do hub: troca "Entrar" por chip do usuário + sair.
   * @param {HTMLElement|null} slot — elemento .btn-entrar ou container
   */
  function paintHubAuth(slot) {
    if (!slot) return;
    var parent = slot.parentElement;
    if (!parent) return;

    // remove chips anteriores
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
    clerkErrorMessage: clerkErrorMessage,
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
