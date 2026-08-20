// Injeta header + rodapé compartilhados em todas as páginas do Hub institucional.
// Uma fonte só para a navegação: renomear/adicionar página se faz aqui.
const LOGO = `<svg width="13" height="16" viewBox="0 0 18 22" fill="none" aria-hidden="true"><rect x="0" y="2" width="6" height="20" rx="3" fill="var(--accent)"/><rect x="10" y="0" width="6" height="15" rx="3" fill="var(--accent)" opacity=".55"/></svg>`

const NAV = [
  ['seguranca.html', 'Segurança'],
  ['planos.html', 'Planos'],
  ['sobre.html', 'Sobre'],
  ['contato.html', 'Contato'],
]

function header() {
  const el = document.createElement('header')
  el.className = 'hb-header'
  el.innerHTML = `
    <a class="hb-logo" href="index.html">${LOGO}<span class="hb-word">be·aside</span></a>
    <div class="hb-sep"></div>
    <span class="hb-badge"><span class="hb-badge-dot"></span>Hub UTI</span>
    <nav class="hb-nav">
      ${NAV.map(([h, t]) => `<a class="hb-link" href="${h}">${t}</a>`).join('')}
      <a class="hb-link cta" href="planos.html">Assinar</a>
    </nav>
    <button class="hb-tema" title="Alternar tema" aria-label="Alternar tema">☀︎</button>
    <button class="hb-menu-btn" aria-label="Menu" aria-expanded="false">☰</button>`
  return el
}

function footer() {
  const el = document.createElement('footer')
  el.className = 'hb-footer'
  el.innerHTML = `
    <div class="hb-footer-in">
      <div class="hb-fcol hb-fbrand">
        <a class="hb-logo" href="index.html">${LOGO}<span class="hb-word">be·aside</span></a>
        <p>Hub UTI — gestão de terapia intensiva à beira do leito, com indicadores e segurança de dados por desenho.</p>
        <a class="hb-cross" href="https://beaside.com.br" target="_blank" rel="noopener">Conteúdo clínico → be·aside ↗</a>
      </div>
      <div class="hb-fcol">
        <h4>Produto</h4>
        <a href="index.html">O que é o Hub</a>
        <a href="seguranca.html">Segurança & LGPD</a>
        <a href="planos.html">Planos e assinatura</a>
        <a href="sobre.html">Sobre e equipe</a>
      </div>
      <div class="hb-fcol">
        <h4>Legal</h4>
        <a href="termos.html">Termos de Uso</a>
        <a href="privacidade.html">Privacidade / LGPD</a>
        <a href="aviso.html">Aviso — não é prontuário</a>
        <a href="contato.html">Encarregado (DPO)</a>
      </div>
      <div class="hb-fcol">
        <h4>Empresa</h4>
        <a href="contato.html">Contato & suporte</a>
        <a href="https://beaside.com.br" target="_blank" rel="noopener">Site be·aside ↗</a>
      </div>
    </div>
    <div class="hb-footer-base">
      <span class="aviso">Material de apoio à gestão e à assistência — <b>não substitui</b> o prontuário oficial nem o julgamento clínico individual.</span>
      <span>© 2026 be·aside</span>
      <span>·</span>
      <span>Hub UTI · v0 (protótipo)</span>
    </div>`
  return el
}

function montaTema(btn) {
  const aplicar = (t) => {
    document.documentElement.setAttribute('data-theme', t)
    btn.textContent = t === 'dark' ? '☾' : '☀︎'
    try { localStorage.setItem('hub-tema', t) } catch {}
  }
  aplicar(localStorage.getItem('hub-tema') || 'light')
  btn.onclick = () => aplicar(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark')
}

document.addEventListener('DOMContentLoaded', () => {
  document.body.prepend(header())
  document.body.append(footer())
  montaTema(document.querySelector('.hb-tema'))
  const nav = document.querySelector('.hb-nav')
  const mb = document.querySelector('.hb-menu-btn')
  mb.onclick = () => { const a = nav.classList.toggle('aberto'); mb.setAttribute('aria-expanded', a); mb.textContent = a ? '✕' : '☰' }
})
