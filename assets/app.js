// ============================================================
// BEDSIDE GUIDE — shell compartilhado (header, sidebar, busca)
// Suporta múltiplos módulos: vm/, hemo/, etc.
// data-module="vm" data-page="sdra" nos <body> das páginas
// ============================================================

// ── Tema claro / escuro ──────────────────────────────────────
const THEME_KEY='beaside-theme';
const THEME_BTN_HTML=
  '<span class="theme-icon theme-icon-sun" aria-hidden="true">'+
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">'+
      '<circle cx="12" cy="12" r="4"/>'+
      '<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>'+
    '</svg>'+
  '</span>'+
  '<span class="theme-icon theme-icon-moon" aria-hidden="true">'+
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">'+
      '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'+
    '</svg>'+
  '</span>';
function getTheme(){
  try{const t=localStorage.getItem(THEME_KEY);if(t==='light'||t==='dark')return t;}catch(e){}
  return 'dark';
}
function prefersReduceMotion(){
  return !!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}
function syncThemeButtons(t){
  document.querySelectorAll('[data-theme-toggle]').forEach(btn=>{
    if(!btn.dataset.iconsReady){
      btn.innerHTML=THEME_BTN_HTML;
      btn.dataset.iconsReady='1';
    }
    const next=t==='light'?'dark':'light';
    btn.setAttribute('aria-label', next==='light'?'Ativar modo claro':'Ativar modo escuro');
    btn.setAttribute('title', next==='light'?'Modo claro':'Modo escuro');
    btn.setAttribute('aria-pressed', t==='light'?'true':'false');
  });
}
function applyTheme(theme){
  const t=(theme==='light'||theme==='dark')?theme:'dark';
  document.documentElement.setAttribute('data-theme',t);
  try{localStorage.setItem(THEME_KEY,t);}catch(e){}
  syncThemeButtons(t);
}
function toggleTheme(){
  const next=getTheme()==='light'?'dark':'light';
  // animação do botão (ícones empilhados via CSS)
  document.querySelectorAll('[data-theme-toggle]').forEach(btn=>{
    btn.classList.remove('is-toggling');
    void btn.offsetWidth;
    btn.classList.add('is-toggling');
    clearTimeout(btn._togTid);
    btn._togTid=setTimeout(()=>btn.classList.remove('is-toggling'),420);
  });
  // transição de página: View Transition API (crossfade limpo) ou fallback suave
  if(document.startViewTransition&&!prefersReduceMotion()){
    document.startViewTransition(()=>applyTheme(next));
    return;
  }
  if(!prefersReduceMotion()){
    const root=document.documentElement;
    root.classList.add('theme-switching');
    applyTheme(next);
    clearTimeout(toggleTheme._tid);
    toggleTheme._tid=setTimeout(()=>root.classList.remove('theme-switching'),320);
    return;
  }
  applyTheme(next);
}
// aplica cedo (theme-boot.js já pode ter setado; sincroniza botões no DOMContentLoaded)
try{applyTheme(getTheme());}catch(e){}

// ── Módulos disponíveis ──────────────────────────────────────
const MODULES = {
  vm: {
    id: 'vm',
    label: 'VM Guide',
    subtitle: 'Ventilação Mecânica',
    root: 'vm/',
    color: '#0ea5b7',
  },
  hemo: {
    id: 'hemo',
    label: 'Hemo Guide',
    subtitle: 'Hemodinâmica & Choque',
    root: 'hemo/',
    color: '#e05555',
  },
  neuro: {
    id: 'neuro',
    label: 'Neuro Guide',
    subtitle: 'Neurocrítico',
    root: 'neuro/',
    color: '#9b6ff7',
  },
  proc: {
    id: 'proc',
    label: 'Procedimentos',
    subtitle: 'Dúvidas de plantão',
    root: 'proc/',
    color: '#3b82f6',
  },
};

// ── Índice de páginas por módulo ─────────────────────────────
const MODULE_PAGES = {
  vm: [
    {id:'fisiologia',   file:'fisiologia.html',   cat:'Fundamentos',              label:'Fisiologia da VM',        title:'Fisiologia da VM com Pressão Positiva', subtitle:'Ciclo ventilatório, mecânica pulmonar e efeitos hemodinâmicos'},
    {id:'modos',        file:'modos.html',        cat:'Fundamentos',              label:'Modos de VM',             title:'Modos de Ventilação Mecânica',          subtitle:'AC-VC · AC-PC · SIMV-PSV · PSV'},
    {id:'parametros',   file:'parametros.html',   cat:'Fundamentos',              label:'Parâmetros iniciais',     title:'Parâmetros Iniciais',                   subtitle:'Configuração passo a passo (UpToDate / FCCS)'},
    {id:'sdra',         file:'sdra.html',         cat:'Patologias',               label:'SDRA',                    title:'SDRA — Ventilação Protetora (LTVV)',    subtitle:'Low Tidal Volume Ventilation'},
    {id:'prona',        file:'prona.html',        cat:'Patologias',               label:'Posição prona',           title:'Posição Prona na SDRA',                 subtitle:'Benefício de mortalidade na SDRA grave (PROSEVA)'},
    {id:'dpoc-asma',    file:'dpoc-asma.html',    cat:'Patologias',               label:'DPOC & Asma',             title:'DPOC & Asma — Hiperinsuflação Dinâmica',subtitle:'Air trapping e obstrução ao fluxo expiratório'},
    {id:'hipercapnia',  file:'hipercapnia.html',  cat:'Patologias',               label:'Hipercapnia permissiva',  title:'Hipercapnia Permissiva',                subtitle:'Quando e como aceitar a elevação da PaCO₂'},
    {id:'tce',          file:'tce.html',          cat:'Patologias',               label:'VM no TCE',               title:'VM no TCE — Estratégia Neuroprotetora', subtitle:'Metas de PPC / PIC · Normoventilação'},
    {id:'complicacoes', file:'complicacoes.html', cat:'Monitorização & Segurança',label:'Complicações da VM',      title:'Complicações da VM',                    subtitle:'Reconhecimento precoce, fisiopatologia e conduta'},
    {id:'capnografia',  file:'capnografia.html',  cat:'Monitorização & Segurança',label:'Capnografia & EtCO₂',     title:'Capnografia & EtCO₂',                   subtitle:'Confirmação de IOT, monitorização contínua e uso na PCR'},
    {id:'dissincronia', file:'dissincronia.html', cat:'Monitorização & Segurança',label:'Dissincronia P-V',        title:'Dissincronia Paciente-Ventilador',      subtitle:'Tipos, diagnóstico pelas curvas e conduta'},
    {id:'bnm',          file:'bnm.html',          cat:'Monitorização & Segurança',label:'Bloqueio neuromuscular',  title:'Bloqueio Neuromuscular na SDRA',        subtitle:'Quando paralisar, qual agente e por quanto tempo'},
    {id:'desmame',      file:'desmame.html',      cat:'Desmame',                  label:'SAT / SBT / Extubação',   title:'Desmame Ventilatório — SAT / SBT / Extubação', subtitle:'Critérios, protocolo e T-piece vs PSV baixo'},
    {id:'vni',          file:'vni.html',          cat:'Desmame',                  label:'VNI & alto fluxo',        title:'VNI & Cânula Nasal de Alto Fluxo',      subtitle:'Quando evitar a IOT — e quando não insistir (ROX)'},
    {id:'indutores',    file:'indutores.html',    cat:'Farmacologia',             label:'Indutores para RSI',      title:'Indutores para RSI',                    subtitle:'Perfil farmacológico e algoritmo por cenário'},
    {id:'sedoanalgesia',file:'sedoanalgesia.html',cat:'Farmacologia',             label:'Sedoanalgesia na UTI',    title:'Sedoanalgesia pós-IOT na UTI',          subtitle:'Sedativos, opioides e escalas de monitoramento'},
    {id:'calculadora',  file:'calculadora.html',  cat:'Referência',               label:'Calculadoras',            title:'Calculadoras',                          subtitle:'PBW/VC · Driving Pressure · VM · P/F · IRRS'},
    {id:'tabelas',      file:'tabelas.html',      cat:'Referência',               label:'Tabelas rápidas',         title:'Tabelas Rápidas',                       subtitle:'Consulta de plantão — situação vs estratégia'},
    {id:'pearls',       file:'pearls.html',       cat:'Pearls & Pitfalls',        label:'Cards clínicos',          title:'Pearls & Pitfalls',                     subtitle:'Cenários de plantão: acerto, erro comum e o porquê do mecanismo'},
    {id:'quiz',         file:'quiz.html',         cat:'Pearls & Pitfalls',        label:'Caso clínico / Quiz',     title:'Caso Clínico Interativo',               subtitle:'Quiz de múltipla escolha'},
    {id:'assistente',   file:'assistente.html',   cat:'Assistente IA',            label:'Assistente de conduta',   title:'Assistente de Conduta (IA)',            subtitle:'Cole a anamnese e receba sugestão de conduta ventilatória'},
  ],
  hemo: [
    {id:'fisio',        file:'fisio.html',        cat:'Fundamentos',              label:'Fisiologia',              title:'Base Fisiológica',                      subtitle:'DO₂, VO₂, Fick, Frank-Starling e choque críptico'},
    {id:'do2',          file:'do2.html',          cat:'Fundamentos',              label:'DO₂ / CaO₂',             title:'Oferta de O₂',                          subtitle:'DO₂, CaO₂, tríade da oferta e intervenções'},
    {id:'scvo2',        file:'scvo2.html',        cat:'Marcadores de perfusão',   label:'SvcO₂',                  title:'SvcO₂ — Saturação Venosa Central',       subtitle:'Como interpretar e onde coletar'},
    {id:'dpco2',        file:'dpco2.html',        cat:'Marcadores de perfusão',   label:'Δ pCO₂',                 title:'Δ pCO₂ — Gradiente Venoarterial',        subtitle:'O marcador de fluxo que a SvcO₂ não captura'},
    {id:'quadrantes',   file:'quadrantes.html',   cat:'POCUS / Imagem',           label:'Quadrantes',              title:'Os 4 Quadrantes SvcO₂ × Δ pCO₂',        subtitle:'Plano cartesiano para interpretar a hipoperfusão'},
    {id:'vci',          file:'vci.html',          cat:'POCUS / Imagem',           label:'POCUS VCI',               title:'POCUS — Veia Cava Inferior',             subtitle:'Técnica, fórmulas e interpretação'},
    {id:'rush',         file:'rush.html',         cat:'POCUS / Imagem',           label:'RUSH',                    title:'Protocolo RUSH',                        subtitle:'Rapid Ultrasound for Shock and Hypotension'},
    {id:'ecg',          file:'ecg.html',          cat:'POCUS / Imagem',           label:'ECG',                     title:'ECG no Choque',                         subtitle:'Achados que mudam o manejo imediato'},
    {id:'integracao',   file:'integracao.html',   cat:'Síntese',                  label:'Integração',              title:'Integração Clínica',                    subtitle:'Gasometria pareada + POCUS VCI em conjunto'},
    {id:'fluxograma',   file:'fluxograma.html',   cat:'Síntese',                  label:'Fluxograma',              title:'Fluxograma Integrado',                  subtitle:'Do choque à conduta — padrão, gasometria, POCUS, drogas'},
    {id:'padroes',      file:'padroes.html',      cat:'Síntese',                  label:'Padrões',                 title:'Padrões Hemodinâmicos',                 subtitle:'Tabelas de referência por tipo de choque'},
    {id:'drogas',       file:'drogas.html',       cat:'Terapêutica',              label:'Drogas vasoativas',       title:'Drogas Vasoativas',                     subtitle:'Doses, diluições e escalonamento'},
    {id:'calc-hemo',    file:'calc-hemo.html',    cat:'Ferramentas',              label:'Calculadoras',            title:'Calculadoras Hemodinâmicas',            subtitle:'Δ pCO₂ · VCI · VPP · Winter · DO₂'},
    {id:'pratica',      file:'pratica.html',      cat:'Ferramentas',              label:'Casos práticos',          title:'Prática — Casos Simulados',             subtitle:'4 casos cobrindo os 4 quadrantes'},
    {id:'siglas',       file:'siglas.html',       cat:'Ferramentas',              label:'Siglas',                  title:'Glossário de Siglas',                   subtitle:'Referência rápida de siglas hemodinâmicas'},
    {id:'pearls',       file:'pearls.html',       cat:'Pearls & Pitfalls',        label:'Cards clínicos',          title:'Pearls & Pitfalls',                     subtitle:'Cenários de plantão: acerto, erro comum e o porquê do mecanismo'},
    {id:'assistente',   file:'assistente.html',   cat:'Assistente IA',            label:'Assistente de conduta',   title:'Assistente de Conduta (IA)',            subtitle:'Discuta o caso hemodinâmico e receba sugestão de conduta'},
  ],
  neuro: [
    {id:'fisio',        file:'fisio.html',        cat:'Fundamentos',              label:'Fisiologia neuro',        title:'Fisiologia do Neurocrítico',            subtitle:'Monro-Kellie, PPC, autorregulação cerebral e herniação'},
    {id:'tce',          file:'tce.html',          cat:'Patologias',               label:'Hemodinâmica & PIC',      title:'Hemodinâmica e Manejo Aprofundado da PIC', subtitle:'Metas de PAS/PAM por etiologia e algoritmo em degraus'},
    {id:'avc-i',        file:'avc-i.html',        cat:'Patologias',               label:'AVC isquêmico',           title:'AVC Isquêmico Agudo',                   subtitle:'Janela terapêutica, trombólise e trombectomia'},
    {id:'avc-h',        file:'avc-h.html',        cat:'Patologias',               label:'AVC hemorrágico',         title:'AVC Hemorrágico — HSA e HIP',           subtitle:'Hemorragia subaracnóidea e intraparenquimatosa'},
    {id:'enc',          file:'enc.html',          cat:'Patologias',               label:'Encefalopatias',          title:'Encefalopatias & Status Epiléptico',    subtitle:'Delirium, status não convulsivo e encefalopatia hepática'},
    {id:'vm',           file:'vm.html',           cat:'Patologias',               label:'VM no neurocrítico',      title:'Manejo Ventilatório no Neurocrítico',   subtitle:'PEEP, PaCO₂, hiperventilação e desmame'},
    {id:'metabolico',   file:'metabolico.html',   cat:'Patologias',               label:'Metabólico & hídrico',    title:'Manejo Metabólico, Hídrico e Infeccioso', subtitle:'Balanço hídrico, glicemia, sódio, febre e multidisciplinar'},
    {id:'pos-op',       file:'pos-op.html',       cat:'Patologias',               label:'Pós-op & DVE',            title:'Pós-Operatório e Drenagem Neurocirúrgica', subtitle:'DVE, herniações atípicas e anticonvulsivantes perioperatórios'},
    {id:'sedoanalgesia',file:'sedoanalgesia.html',cat:'Farmacologia',             label:'Sedoanalgesia neuro',     title:'Sedoanalgesia, RASS e Bloqueio Neuromuscular', subtitle:'Drogas, diluições e metas de RASS por cenário'},
    {id:'calc-neuro',   file:'calc-neuro.html',   cat:'Ferramentas',              label:'Calculadoras',            title:'Calculadoras Neurológicas',             subtitle:'PPC · Osmolaridade · GCS · NIHSS · Hunt & Hess · Fisher'},
    {id:'pearls',       file:'pearls.html',       cat:'Pearls & Pitfalls',        label:'Cards clínicos',          title:'Pearls & Pitfalls',                     subtitle:'Cenários de plantão: acerto, erro comum e o porquê do mecanismo'},
    {id:'assistente',   file:'assistente.html',   cat:'Assistente IA',            label:'Assistente de conduta',   title:'Assistente de Conduta (IA)',            subtitle:'Discuta o caso neurológico e receba sugestão de conduta'},
  ],
  proc: [
    {id:'cvc',           file:'cvc.html',           cat:'Acesso vascular',         label:'CVC',                     title:'Cateter Venoso Central',                subtitle:'Seldinger, escolha de sítio, profundidade e complicações'},
    {id:'linha-arterial',file:'linha-arterial.html',cat:'Acesso vascular',         label:'Linha arterial',          title:'Linha Arterial',                        subtitle:'Técnica, zeragem, Allen test e armadilhas do sítio'},
    {id:'io',            file:'io.html',            cat:'Acesso vascular',         label:'Acesso intraósseo',       title:'Acesso Intraósseo (IO)',                 subtitle:'Quando usar, sítios, técnica e drogas compatíveis'},
    {id:'iot',           file:'iot.html',           cat:'Via aérea',               label:'IOT / RSI',               title:'IOT — Sequência Rápida (RSI)',           subtitle:'Os 7 P: preparo, posição, pré-O₂, pré-trat., indução, passagem, confirmação'},
    {id:'vad',           file:'vad.html',           cat:'Via aérea',               label:'Via aérea difícil / CICO',title:'Via Aérea Difícil & CICO',              subtitle:'LEMON, algoritmo DAS 4 planos e cricotireoidotomia'},
    {id:'traqueo',       file:'traqueo.html',       cat:'Via aérea',               label:'Traqueostomia & cuidados',title:'Traqueostomia & Cuidados',              subtitle:'Troca de cânula, endocânula e sistema fechado'},
    {id:'toracocentese', file:'toracocentese.html', cat:'Drenagem & punções',      label:'Toracocentese',           title:'Toracocentese',                         subtitle:'Técnica, limite de drenagem e complicações'},
    {id:'dreno',         file:'dreno.html',         cat:'Drenagem & punções',      label:'Dreno torácico',          title:'Dreno Torácico',                        subtitle:'Triângulo de segurança BTS, técnica e regras de clampeamento'},
    {id:'paracentese',   file:'paracentese.html',   cat:'Drenagem & punções',      label:'Paracentese',             title:'Paracentese',                           subtitle:'Coagulopatia não contraindica, Z-track, albumina e SAAG'},
    {id:'pl',            file:'pl.html',            cat:'Drenagem & punções',      label:'Punção lombar',           title:'Punção Lombar',                         subtitle:'Quando fazer TC antes, manômetro, 4 tubos e tabela de LCR'},
    {id:'pai',           file:'pai.html',           cat:'Monitorização invasiva',  label:'PAI — onda arterial',     title:'Pressão Arterial Invasiva (PAI)',        subtitle:'Anatomia da onda, amortecimento, PPV e armadilhas'},
    {id:'swan',          file:'swan.html',          cat:'Monitorização invasiva',  label:'Swan-Ganz',               title:'Cateter de Artéria Pulmonar (Swan-Ganz)',subtitle:'Inserção, curvas por câmara, parâmetros e perfis de choque'},
    {id:'ritmo',         file:'ritmo.html',         cat:'Emergência cardíaca',     label:'Cardioversão & marca-passo',title:'Cardioversão, Desfibrilação & Marca-passo',subtitle:'Choque sincronizado, desfibrilação e marca-passo transcutâneo/transvenoso'},
    {id:'pearls',        file:'pearls.html',        cat:'Pearls & Pitfalls',       label:'Dúvidas de plantão',      title:'Dúvidas de Plantão',                    subtitle:'As perguntas que ninguém responde no guia clássico'},
  ],
};

// ── Helpers ──────────────────────────────────────────────────
function currentModule(){return document.body.dataset.module||'';}
function currentPageId(){return document.body.dataset.page||'';}
function getPages(){return MODULE_PAGES[currentModule()]||[];}
function getRootPath(){
  const m=MODULES[currentModule()];
  // de dentro do módulo, root é um nível acima
  return m ? '../' : './';
}

// ── SHELL ────────────────────────────────────────────────────
function buildShell(){
  const mod=currentModule();
  const curId=currentPageId();
  const pages=getPages();
  const root=getRootPath();
  const modMeta=MODULES[mod];

  // Header
  const header=document.createElement('header');
  header.className='header';
  header.innerHTML=
    '<a class="header-logo" href="'+root+'index.html" aria-label="be·aside — hub">'+
      '<svg class="header-logo-bars" width="12" height="15" viewBox="0 0 18 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+
        '<rect x="0" y="2" width="6" height="20" rx="3" fill="var(--accent)"/>'+
        '<rect x="10" y="0" width="6" height="15" rx="3" fill="var(--accent)" opacity=".55"/>'+
      '</svg>'+
      '<span class="header-wordmark">be·aside</span>'+
    '</a>'+
    (modMeta
      ? '<span class="header-sep" aria-hidden="true"></span>'+
        '<span class="header-mod"><span class="header-mod-dot" aria-hidden="true"></span>'+modMeta.label+'</span>'+
        '<span class="header-title">'+modMeta.subtitle+'</span>'
      : '<span class="header-title">Guias clínicos de UTI</span>')+
    '<div class="header-actions">'+
      '<button class="btn-theme" data-theme-toggle type="button" onclick="toggleTheme()" aria-label="Alternar tema"></button>'+
      '<button class="btn-search" onclick="openSearch()" type="button"><span>Buscar</span> <kbd>⌘K</kbd></button>'+
      '<button class="menu-btn" type="button" onclick="toggleMenu()">Menu</button>'+
    '</div>';

  const progress=document.createElement('div');progress.id='progress';
  const overlay=document.createElement('div');overlay.className='overlay';overlay.id='overlay';overlay.onclick=toggleMenu;
  const toast=document.createElement('div');toast.className='toast';toast.id='toast';

  // Sidebar
  const nav=document.createElement('nav');
  nav.className='sidebar';nav.id='sidebar';
  nav.setAttribute('aria-label','Navegação do módulo');

  if(pages.length){
    // Dentro de um módulo: sidebar normal com seções colapsáveis
    const groups=[];
    pages.forEach(p=>{
      let g=groups.find(x=>x.cat===p.cat);
      if(!g){g={cat:p.cat,items:[]};groups.push(g);}
      g.items.push(p);
    });
    let openState={};
    try{openState=JSON.parse(localStorage.getItem('vmguide-nav-open-'+mod))||{};}catch(e){openState={};}
    const curCat=(pages.find(p=>p.id===curId)||{}).cat;
    let html=
      '<a class="nav-back" href="'+root+'index.html"><span class="nav-back-arrow">←</span> Hub</a>'+
      '<div class="sidebar-mod">'+
        '<div class="sidebar-mod-k">Módulo</div>'+
        '<a class="sidebar-mod-v" href="index.html">'+(modMeta?modMeta.subtitle:mod)+'</a>'+
      '</div>';
    groups.forEach((g,gi)=>{
      const saved=openState[g.cat];
      // Na landing do módulo (sem page id): abre só o 1º grupo. Em páginas: abre a categoria ativa.
      const open=saved===true||(saved===undefined&&(g.cat===curCat||(!curId&&gi===0)));
      html+='<div class="sidebar-group'+(open?' open':'')+'" data-cat="'+g.cat.replace(/"/g,'&quot;')+'">'+
              '<button class="sidebar-section" type="button" onclick="toggleNavGroup(this)">'+
                '<span>'+g.cat+'</span><span class="sg-arrow">▸</span>'+
              '</button>'+
              '<div class="sidebar-group-items">';
      g.items.forEach(p=>{
        const active=p.id===curId?' active':'';
        html+='<a class="nav-link'+active+'" href="'+p.file+'">'+p.label+'</a>';
      });
      html+='</div></div>';
    });
    nav.innerHTML=html;
  } else {
    // Hub: sidebar com links dos módulos
    let html=
      '<div class="sidebar-mod">'+
        '<div class="sidebar-mod-k">Navegação</div>'+
        '<div class="sidebar-mod-v">Módulos</div>'+
      '</div>'+
      '<div class="sidebar-group open"><div class="sidebar-group-items">';
    Object.values(MODULES).forEach(m=>{
      html+='<a class="nav-link" href="'+m.root+'">'+m.label+'</a>';
    });
    html+='</div></div>';
    nav.innerHTML=html;
  }

  // Search modal
  const sb=document.createElement('div');sb.className='search-backdrop';sb.id='searchBackdrop';sb.onclick=closeSearch;
  const sm=document.createElement('div');sm.className='search-modal';sm.id='searchModal';sm.style.display='none';
  sm.onclick=e=>e.stopPropagation();
  sm.innerHTML='<input type="text" class="search-input" id="searchInput" placeholder="Buscar no guia… (ex: auto-PEEP, noradrenalina, VCI)" autocomplete="off"><div class="search-results" id="searchResults"></div>';

  const b=document.body;
  b.insertBefore(toast,b.firstChild);
  b.insertBefore(sm,b.firstChild);
  b.insertBefore(sb,b.firstChild);
  b.insertBefore(nav,b.firstChild);
  b.insertBefore(overlay,b.firstChild);
  b.insertBefore(progress,b.firstChild);
  b.insertBefore(header,b.firstChild);
}

// ── Sidebar colapsável ───────────────────────────────────────
function toggleNavGroup(btn){
  const group=btn.parentElement;
  const cat=group.dataset.cat;
  const mod=currentModule();
  const open=group.classList.toggle('open');
  let st={};
  try{st=JSON.parse(localStorage.getItem('vmguide-nav-open-'+mod))||{};}catch(e){st={};}
  st[cat]=open;
  try{localStorage.setItem('vmguide-nav-open-'+mod,JSON.stringify(st));}catch(e){}
}

// ── Share / Toast ────────────────────────────────────────────
function copyLink(e,anchor){
  e.preventDefault();
  const url=window.location.origin+window.location.pathname+anchor;
  navigator.clipboard.writeText(url).then(()=>showToast('Link copiado!')).catch(()=>{
    const inp=document.createElement('input');inp.value=url;document.body.appendChild(inp);inp.select();document.execCommand('copy');document.body.removeChild(inp);showToast('Link copiado!');
  });
}
function showToast(msg){
  const t=document.getElementById('toast');if(!t)return;
  t.textContent=msg;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2200);
}

// ── Menu mobile + progress ───────────────────────────────────
function toggleMenu(){
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('show');
}
function initProgress(){
  window.addEventListener('scroll',()=>{
    const d=document.documentElement;
    const p=(d.scrollTop/(d.scrollHeight-d.clientHeight))*100;
    const el=document.getElementById('progress');if(el)el.style.width=p+'%';
  });
}

// ── Busca global (⌘K) ────────────────────────────────────────
// Indexa todas as páginas de todos os módulos
const searchIndex=[];
Object.entries(MODULE_PAGES).forEach(([modId,pages])=>{
  const modRoot=(MODULES[modId]||{}).root||'';
  pages.forEach(p=>{
    searchIndex.push({title:p.title,ctx:(MODULES[modId]||{}).label+' · Seção',file:modRoot+p.file,mod:modId});
    if(p.subtitle)searchIndex.push({title:p.subtitle,ctx:(MODULES[modId]||{}).label+' · '+p.label,file:modRoot+p.file,mod:modId});
  });
});
let searchHits=[],searchSel=0;
function openSearch(){
  document.getElementById('searchBackdrop').classList.add('show');
  document.getElementById('searchModal').style.display='block';
  const inp=document.getElementById('searchInput');
  inp.value='';inp.focus();renderSearch('');
}
function closeSearch(){
  document.getElementById('searchBackdrop').classList.remove('show');
  document.getElementById('searchModal').style.display='none';
}
function norm(s){return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');}
function renderSearch(q){
  const res=document.getElementById('searchResults');
  const nq=norm(q.trim());
  const root=getRootPath();
  searchHits=nq
    ?searchIndex.filter(i=>norm(i.title).includes(nq)||norm(i.ctx).includes(nq))
    :searchIndex.filter(i=>i.ctx.includes('Seção'));
  searchSel=0;
  if(!searchHits.length){res.innerHTML='<div class="search-empty">Nenhum resultado para "'+q+'"</div>';return;}
  res.innerHTML=searchHits.map((h,i)=>{
    let t=h.title;
    if(nq){const re=new RegExp('('+q.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','ig');t=t.replace(re,'<mark>$1</mark>');}
    return '<a class="search-hit'+(i===0?' sel':'')+'" onclick="goToHit('+i+')"><div class="sh-title">'+t+'</div><div class="sh-ctx">'+h.ctx+'</div></a>';
  }).join('');
}
function goToHit(i){
  const h=searchHits[i];if(!h)return;
  const root=getRootPath();
  window.location.href=root+h.file;
}
function moveSel(d){
  const hits=document.querySelectorAll('.search-hit');
  if(!hits.length)return;
  hits[searchSel]&&hits[searchSel].classList.remove('sel');
  searchSel=(searchSel+d+hits.length)%hits.length;
  hits[searchSel].classList.add('sel');
  hits[searchSel].scrollIntoView({block:'nearest'});
}
function initSearchKeys(){
  document.getElementById('searchInput').addEventListener('input',e=>renderSearch(e.target.value));
  document.addEventListener('keydown',e=>{
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch();return;}
    const open=document.getElementById('searchModal').style.display==='block';
    if(!open)return;
    if(e.key==='Escape')closeSearch();
    else if(e.key==='ArrowDown'){e.preventDefault();moveSel(1);}
    else if(e.key==='ArrowUp'){e.preventDefault();moveSel(-1);}
    else if(e.key==='Enter'){e.preventDefault();goToHit(searchSel);}
  });
}

// ============================================================
// CALCULADORAS VM (rodam só se elementos existirem na página)
// ============================================================
function calcPBW(){
  const h=parseFloat(document.getElementById('altura').value);
  const s=document.getElementById('sexo').value;
  if(!h||h<100||h>220){document.getElementById('calc-result').style.display='none';return}
  const pbw=s==='m'?50+0.91*(h-152.4):45.5+0.91*(h-152.4);
  document.getElementById('pbw-val').textContent=pbw.toFixed(1);
  document.getElementById('vc6-val').textContent=Math.round(pbw*6);
  document.getElementById('vc5-val').textContent=Math.round(pbw*5);
  document.getElementById('vc4-val').textContent=Math.round(pbw*4);
  document.getElementById('calc-result').style.display='block';
}
function calcDP(){
  const p=parseFloat(document.getElementById('pplat').value);
  const e=parseFloat(document.getElementById('peep-dp').value);
  if(isNaN(p)||isNaN(e)){document.getElementById('dp-result').style.display='none';return}
  const dp=p-e;
  const el=document.getElementById('dp-val');
  const st=document.getElementById('dp-status');
  el.textContent=dp.toFixed(1);
  if(dp<15){el.style.color='var(--teal)';st.textContent='Dentro da meta (< 15 cmH₂O)'}
  else if(dp<20){el.style.color='var(--amber)';st.textContent='Limítrofe — considerar ajuste de VC ou PEEP'}
  else{el.style.color='var(--red)';st.textContent='ACIMA DO ALVO — risco de VILI. Reduzir VC ou aumentar PEEP.'}
  document.getElementById('dp-result').style.display='block';
}
function calcVM(){
  const vc=parseFloat(document.getElementById('vc-vm').value);
  const fr=parseFloat(document.getElementById('fr-vm').value);
  if(isNaN(vc)||isNaN(fr)||vc<=0||fr<=0){document.getElementById('vm-result').style.display='none';return}
  const vm=(vc/1000)*fr;
  const el=document.getElementById('vm-val');
  const st=document.getElementById('vm-status');
  el.textContent=vm.toFixed(1);
  if(vm<4){el.style.color='var(--red)';st.textContent='Baixa — risco de hipercapnia e hipoventilação'}
  else if(vm<=8){el.style.color='var(--teal)';st.textContent='Normal (4–8 L/min)'}
  else if(vm<=12){el.style.color='var(--amber)';st.textContent='Elevada — avaliar alcalose ou drive alto'}
  else{el.style.color='var(--red)';st.textContent='Muito elevada — revisar parâmetros'}
  document.getElementById('vm-result').style.display='block';
}
function calcPF(){
  const pao2=parseFloat(document.getElementById('pao2').value);
  const fio2=parseFloat(document.getElementById('fio2').value);
  if(isNaN(pao2)||isNaN(fio2)||fio2<=0||fio2>1){document.getElementById('pf-result').style.display='none';return}
  const pf=pao2/fio2;
  const el=document.getElementById('pf-val');
  const st=document.getElementById('pf-status');
  el.textContent=Math.round(pf);
  if(pf>300){el.style.color='var(--teal)';st.textContent='Normal (sem SDRA)'}
  else if(pf>200){el.style.color='var(--amber)';st.textContent='SDRA leve (200–300) — Berlin 2012'}
  else if(pf>100){el.style.color='var(--red)';st.textContent='SDRA moderada (100–200) — Berlin 2012'}
  else{el.style.color='var(--red)';st.textContent='SDRA grave (< 100) — Berlin 2012'}
  document.getElementById('pf-result').style.display='block';
}
function calcIRRS(){
  const fr=parseFloat(document.getElementById('fr-irrs').value);
  const vc=parseFloat(document.getElementById('vc-irrs').value);
  if(isNaN(fr)||isNaN(vc)||vc<=0){document.getElementById('irrs-result').style.display='none';return}
  const irrs=fr/(vc/1000);
  const el=document.getElementById('irrs-val');
  const st=document.getElementById('irrs-status');
  el.textContent=Math.round(irrs);
  if(irrs<80){el.style.color='var(--teal)';st.textContent='Alta probabilidade de extubação bem-sucedida'}
  else if(irrs<105){el.style.color='var(--amber)';st.textContent='Limítrofe — SBT bem-sucedido, extubação com cuidado'}
  else{el.style.color='var(--red)';st.textContent='SBT com falha — não extubar'}
  document.getElementById('irrs-result').style.display='block';
}

// ============================================================
// CALCULADORAS HEMO
// ============================================================
function showCalcResult(id,show){
  const el=document.getElementById('calc-res-'+id);
  if(el)el.style.display=show?'block':'none';
}
function calcDelta(){
  const v=parseFloat(document.getElementById('pco2v').value);
  const a=parseFloat(document.getElementById('pco2a').value);
  if(isNaN(v)||isNaN(a)){showCalcResult('delta',false);return;}
  const d=v-a;
  document.getElementById('val-delta').textContent=d.toFixed(1)+' mmHg';
  let t,c;
  if(d<6){t='Normal (&lt; 6 mmHg) — fluxo tecidual adequado';c='var(--teal)';}
  else if(d<10){t='Elevado (6–10 mmHg) — possível baixo fluxo tecidual';c='var(--amber)';}
  else{t='Muito elevado (&gt; 10 mmHg) — baixo débito / hipoperfusão significativa';c='var(--red)';}
  document.getElementById('val-delta').style.color=c;
  document.getElementById('interp-delta').innerHTML=t;
  showCalcResult('delta',true);
}
function calcVCI(){
  const mx=parseFloat(document.getElementById('vcimax').value);
  const mn=parseFloat(document.getElementById('vcimin').value);
  if(isNaN(mx)||isNaN(mn)||mx<=0){showCalcResult('vci',false);return;}
  const c=(mx-mn)/mx*100;
  document.getElementById('val-vci').textContent=c.toFixed(1)+'% (cIVC)';
  let t,col;
  if(c>50){t='&gt; 50% — Muito provavelmente responsivo a volume';col='var(--teal)';}
  else if(c>=20){t='20–50% — Zona cinzenta — realizar PLR ou fluid challenge';col='var(--amber)';}
  else{t='&lt; 20% — Provavelmente não responsivo';col='var(--red)';}
  let d='';
  if(mx<1.5)d=' · VCI &lt; 1,5 cm — hipovolemia provável';
  else if(mx>2.1)d=' · VCI &gt; 2,1 cm — congestão / pressão de VD elevada';
  document.getElementById('val-vci').style.color=col;
  document.getElementById('interp-vci').innerHTML=t+d;
  showCalcResult('vci',true);
}
function calcDVCI(){
  const mx=parseFloat(document.getElementById('dvcimx').value);
  const mn=parseFloat(document.getElementById('dvcimn').value);
  if(isNaN(mx)||isNaN(mn)||mn<=0){showCalcResult('dvci',false);return;}
  const d=(mx-mn)/mn*100;
  document.getElementById('val-dvci').textContent=d.toFixed(1)+'% (dIVC)';
  let t,c;
  if(d>18){t='&gt; 18% — Responsivo a volume em ventilação mecânica';c='var(--teal)';}
  else{t='≤ 18% — Não responsivo — não administrar volume adicional';c='var(--red)';}
  document.getElementById('val-dvci').style.color=c;
  document.getElementById('interp-dvci').innerHTML=t;
  showCalcResult('dvci',true);
}
function calcWinter(){
  const h=parseFloat(document.getElementById('hco3').value);
  const p=parseFloat(document.getElementById('pco2w').value);
  if(isNaN(h)||isNaN(p)){showCalcResult('winter',false);return;}
  const exp=1.5*h+8;
  const lo=(exp-2).toFixed(1),hi=(exp+2).toFixed(1);
  document.getElementById('val-winter').textContent='Esperado: '+lo+'–'+hi+' mmHg';
  let t,c;
  if(p>=(exp-2)&&p<=(exp+2)){t='pCO₂ medido ('+p+') dentro do esperado — compensação <strong>adequada</strong>.';c='var(--teal)';}
  else if(p<(exp-2)){t='pCO₂ medido ('+p+') <strong>abaixo</strong> — alcalose respiratória associada (misto).';c='var(--amber)';}
  else{t='pCO₂ medido ('+p+') <strong>acima</strong> — acidose respiratória associada (misto).';c='var(--coral)';}
  document.getElementById('val-winter').style.color=c;
  document.getElementById('interp-winter').innerHTML=t;
  showCalcResult('winter',true);
}
function calcVPP(){
  const mx=parseFloat(document.getElementById('ppmax').value);
  const mn=parseFloat(document.getElementById('ppmin').value);
  if(isNaN(mx)||isNaN(mn)||(mx+mn)<=0){showCalcResult('vpp',false);return;}
  const v=(mx-mn)/((mx+mn)/2)*100;
  document.getElementById('val-vpp').textContent=v.toFixed(1)+'% (VPP)';
  let t,c;
  if(v>13){t='&gt; 13% — Responsivo a volume';c='var(--red)';}
  else if(v>=9){t='9–13% — Zona cinzenta — PLR com VTI antes de decidir';c='var(--amber)';}
  else{t='&lt; 9% — Não responsivo a volume';c='var(--teal)';}
  document.getElementById('val-vpp').style.color=c;
  document.getElementById('interp-vpp').innerHTML=t;
  showCalcResult('vpp',true);
}

// ============================================================
// QUIZ VM (só inicia se existir #quiz-container)
// ============================================================
const questions=[
  {caso:'Paciente masculino, 68 anos, 175 cm, 95 kg. SDRA por pneumonia (P/F = 140). IOT realizada. Ventilador configurado: AC-VC, VC 570 mL, FR 18, PEEP 10, FiO₂ 0,8. Medida da Pplat: 34 cmH₂O.',pergunta:'Qual é a conduta ventilatória mais adequada?',opcoes:['Aumentar FR para 22 irpm para melhorar a oxigenação','Reduzir VC para 6 mL/kg PBW (PBW = 75 kg → 450 mL) e reavalie Pplat em 15 min','Aumentar PEEP para 14 cmH₂O conforme tabela ARDSnet','Trocar para AC-PC com pressão inspiratória de 20 cmH₂O'],correta:1,feedback:'O PBW para 175 cm/masc = 50 + 0,91×(175−152,4) = 70,6 kg. VC inicial = 70,6×6 = 424 mL. O VC de 570 mL é equivalente a ~8 mL/kg PBW — acima do alvo. Com Pplat 34 (>30 cmH₂O), a prioridade é reduzir o VC para 6 mL/kg PBW (~424 mL) e reavalie a Pplat. Aumentar PEEP com Pplat já elevada pioraria a driving pressure. O modo não é o problema aqui.'},
  {caso:'Paciente asmático, 32 anos, IOT de emergência por broncoespasmo grave. Ventilador: AC-VC, VC 500 mL, FR 16, PEEP 5, fluxo 40 L/min. Após 10 min: PA 70/40 mmHg, FC 130 bpm, curva de fluxo com fluxo expiratório que não retorna a zero.',pergunta:'Qual é a manobra diagnóstica e terapêutica mais imediata?',opcoes:['Iniciar noradrenalina 0,1 mcg/kg/min para a hipotensão','Realizar pausa inspiratória para medir Pplat','Desconectar o circuito do tubo endotraqueal e permitir expiração passiva por 30–60 s','Reduzir PEEP de 5 para 0 cmH₂O'],correta:2,feedback:'A curva de fluxo com expiração que não retorna a zero é diagnóstica de auto-PEEP (PEEPi) por air trapping. Com hipotensão grave, o mecanismo é o mesmo do tamponamento: ↑ pressão intratorácica → ↓ retorno venoso → ↓ DC. A manobra imediata e potencialmente salvadora é desconectar o circuito — permite expiração passiva e alívio da hiperinsuflação dinâmica.'},
  {caso:'TCE grave (GCS 6), TC com herniação uncal iminente. Precisa de IOT emergencial. PA 85/50 mmHg (choque hemorrágico). Sem acesso a cetamina no momento.',pergunta:'Qual indutor é mais adequado para RSI nessa situação?',opcoes:['Propofol 1,5 mg/kg — reduz a PIC','Midazolam 0,2 mg/kg — início mais suave','Etomidato 0,15 mg/kg — neutro hemodinamicamente, preserva PPC','Aguardar cetamina antes de intubar'],correta:2,feedback:'Nesse cenário há conflito: TCE com herniação iminente (precisa proteger PIC) + hipotensão (precisa manter PPC). O propofol piora a hipotensão — contraindicado. O midazolam também é hipotensor e tem onset lento. Aguardar é perigoso com herniação iminente. O etomidato em dose reduzida (0,15 mg/kg para choque) é o melhor indutor: neutro hemodinamicamente, preserva PPC, onset rápido.'},
  {caso:'Paciente em VM há 72h por SDRA. RASS −3 sob propofol 40 mcg/kg/min. FiO₂ agora em 0,4, PEEP 8, SpO₂ 95%. Equipe questiona quando iniciar avaliação de desmame.',pergunta:'Quais critérios esse paciente já atende para iniciar avaliação de desmame?',opcoes:['Nenhum — SDRA contraindica desmame precoce','SpO₂ ≥90% com FiO₂ ≤0,4 e PEEP ≤8 — mas falta avaliar drive respiratório (RASS −3 impede SBT)','Todos os critérios — pode extubar imediatamente','Deve aguardar gasometria com PaO₂ >80 mmHg antes de qualquer avaliação'],correta:1,feedback:'O paciente atende aos critérios de oxigenação (SpO₂ 95% com FiO₂ 0,4 e PEEP 8) e causa em resolução. Porém, RASS −3 é sedação profunda demais para realizar SBT. O próximo passo é realizar SAT (Spontaneous Awakening Trial): suspender propofol e titular para RASS −1 a +1. Somente após SAT bem-sucedido realizar o SBT.'},
  {caso:'Paciente em PSV 12 cmH₂O / PEEP 5, RASS −1. FR mostrada no ventilador: 28 irpm. FR programada: 12 irpm. Curva de pressão mostra deflexões negativas na fase expiratória sem disparo do ventilador.',pergunta:'Que tipo de dissincronia está presente e qual é a conduta inicial?',opcoes:['Double triggering — reduzir sensibilidade de trigger','Flow starvation — aumentar fluxo inspiratório para 80 L/min','Trigger inefetivo — investigar auto-PEEP e reduzir threshold de trigger','Delayed cycling — reduzir threshold de ciclagem em PSV'],correta:2,feedback:'Deflexões negativas na fase expiratória sem disparo do ventilador = trigger inefetivo (missed trigger) — o esforço do paciente não é detectado. A diferença entre FR no display (28) e FR programada (12) mostra que há muitos esforços espontâneos. Causa mais comum: auto-PEEP (o paciente precisa "vencer" o PEEPi + threshold de trigger).'}
];
let currentQ=0,score=0,answered=false;
function renderQuestion(){
  const q=questions[currentQ];
  document.getElementById('quiz-case').innerHTML=q.caso;
  document.getElementById('quiz-question').textContent=q.pergunta;
  document.getElementById('quiz-progress').textContent=(currentQ+1)+' / '+questions.length;
  document.getElementById('quiz-feedback').className='quiz-feedback';
  document.getElementById('quiz-feedback').innerHTML='';
  document.getElementById('quiz-next-btn').style.display='none';
  answered=false;
  const opts=document.getElementById('quiz-options');
  opts.innerHTML='';
  const letters=['A','B','C','D'];
  q.opcoes.forEach((o,i)=>{
    const btn=document.createElement('button');
    btn.className='quiz-opt';
    btn.innerHTML='<span class="quiz-letter">'+letters[i]+'</span>'+o;
    btn.onclick=()=>answer(i);
    opts.appendChild(btn);
  });
}
function answer(idx){
  if(answered)return;
  answered=true;
  const q=questions[currentQ];
  const opts=document.querySelectorAll('.quiz-opt');
  opts.forEach((o,i)=>{
    o.classList.add('disabled');
    if(i===q.correta)o.classList.add('correct');
    else if(i===idx&&idx!==q.correta)o.classList.add('wrong');
  });
  const fb=document.getElementById('quiz-feedback');
  if(idx===q.correta){score++;fb.className='quiz-feedback correct show';fb.innerHTML='<strong>✓ Correto!</strong> '+q.feedback;}
  else{fb.className='quiz-feedback wrong show';fb.innerHTML='<strong>✗ Incorreto.</strong> '+q.feedback;}
  const nextBtn=document.getElementById('quiz-next-btn');
  nextBtn.style.display='inline-block';
  nextBtn.textContent=currentQ<questions.length-1?'Próxima questão →':'Ver resultado';
}
function nextQuestion(){
  currentQ++;
  if(currentQ>=questions.length){
    document.getElementById('quiz-question-screen').style.display='none';
    document.getElementById('quiz-score').classList.add('show');
    document.getElementById('score-num').textContent=score+'/'+questions.length;
  }else{renderQuestion();}
}
function restartQuiz(){
  currentQ=0;score=0;answered=false;
  document.getElementById('quiz-score').classList.remove('show');
  document.getElementById('quiz-question-screen').style.display='block';
  renderQuestion();
}

// ============================================================
// GLOSSÁRIO — injetado automaticamente no rodapé de cada página
// ============================================================
const GLOSSARY = {
  hemo: [
    {cat:'Hemodinâmica e perfusão', terms:[
      ['PAM','Pressão arterial média'],
      ['PAS','Pressão arterial sistólica'],
      ['PAD','Pressão arterial diastólica'],
      ['PP','Pressão de pulso (PAS − PAD)'],
      ['VPP','Variação de pressão de pulso'],
      ['DC','Débito cardíaco (L/min)'],
      ['IC','Índice cardíaco (DC/SC, L/min/m²)'],
      ['VS / SV','Volume sistólico / Stroke volume'],
      ['FE','Fração de ejeção'],
      ['RVS','Resistência vascular sistêmica'],
      ['PVC','Pressão venosa central'],
      ['PAP','Pressão da artéria pulmonar'],
    ]},
    {cat:'Oxigenação e metabolismo', terms:[
      ['SaO₂','Saturação arterial de O₂'],
      ['SpO₂','Saturação periférica de O₂ (oxímetro)'],
      ['SvO₂','Saturação venosa mista (Swan-Ganz)'],
      ['SvcO₂','Saturação venosa central (CVC)'],
      ['pCO₂','Pressão parcial de CO₂'],
      ['Δ pCO₂','Gradiente venoarterial de CO₂'],
      ['FiO₂','Fração inspirada de O₂'],
      ['DO₂','Oferta de O₂ (mL O₂/min)'],
      ['VO₂','Consumo de O₂ (mL O₂/min)'],
      ['CaO₂','Conteúdo arterial de O₂'],
      ['Hb','Hemoglobina (g/dL)'],
      ['BE','Base excess (excesso de base)'],
    ]},
    {cat:'POCUS e monitorização', terms:[
      ['POCUS','Point-of-care ultrasound'],
      ['VCI','Veia cava inferior'],
      ['cIVC','Índice de colapsibilidade da VCI (espontâneo)'],
      ['dIVC','Índice de distensibilidade da VCI (VM)'],
      ['VTI','Velocity-time integral (Doppler aórtico)'],
      ['PLR','Passive leg raising'],
      ['VD / VE','Ventrículo direito / esquerdo'],
      ['RUSH','Rapid Ultrasound for Shock and Hypotension'],
    ]},
    {cat:'Clínica e farmacologia', terms:[
      ['NA','Noradrenalina'],
      ['CVC','Cateter venoso central'],
      ['VM','Ventilação mecânica'],
      ['IOT','Intubação orotraqueal'],
      ['UTI','Unidade de terapia intensiva'],
      ['TEP','Tromboembolismo pulmonar'],
      ['IAM','Infarto agudo do miocárdio'],
      ['ECMO','Extracorporeal membrane oxygenation'],
      ['BIC','Bomba de infusão contínua'],
      ['SSC','Surviving Sepsis Campaign'],
    ]},
  ],
  vm: [
    {cat:'Ventilação mecânica', terms:[
      ['VM','Ventilação mecânica'],
      ['VNI','Ventilação não invasiva'],
      ['IOT','Intubação orotraqueal'],
      ['Vt','Volume corrente'],
      ['FR','Frequência respiratória'],
      ['PEEP','Pressão positiva expiratória final'],
      ['FiO₂','Fração inspirada de O₂'],
      ['Pplat','Pressão de platô'],
      ['Ppico','Pressão de pico inspiratória'],
      ['DP','Driving pressure (Pplat − PEEP)'],
      ['PBW','Peso corporal predito'],
      ['VM/min','Volume-minuto'],
    ]},
    {cat:'Modos e ciclagem', terms:[
      ['AC-VC','Assistido-controlado com volume controlado'],
      ['AC-PC','Assistido-controlado com pressão controlada'],
      ['PSV','Ventilação com suporte de pressão'],
      ['SIMV','Ventilação mandatória intermitente sincronizada'],
      ['CPAP','Pressão positiva contínua nas vias aéreas'],
      ['IRRS','Índice de respiração rápida e superficial (f/Vt)'],
      ['SAT','Spontaneous awakening trial'],
      ['SBT','Spontaneous breathing trial'],
    ]},
    {cat:'Trocas gasosas', terms:[
      ['PaO₂','Pressão parcial de O₂ arterial'],
      ['PaCO₂','Pressão parcial de CO₂ arterial'],
      ['SaO₂','Saturação arterial de O₂'],
      ['SpO₂','Saturação periférica de O₂'],
      ['P/F','Relação PaO₂/FiO₂'],
      ['SDRA','Síndrome do desconforto respiratório agudo'],
      ['PPC','Pressão de perfusão cerebral'],
      ['PIC','Pressão intracraniana'],
    ]},
    {cat:'Farmacologia', terms:[
      ['RSI','Sequência rápida de intubação'],
      ['BNM','Bloqueador neuromuscular'],
      ['NMB','Neuromuscular blockade'],
      ['RASS','Richmond Agitation-Sedation Scale'],
      ['CAM-ICU','Confusion Assessment Method for the ICU'],
      ['IV','Intravenoso'],
      ['BIC','Bomba de infusão contínua'],
    ]},
  ],
};

function buildGlossaryFooter(){
  const mod=currentModule();
  const glossary=GLOSSARY[mod];
  if(!glossary)return;
  const main=document.querySelector('main.main');
  if(!main)return;

  const footer=document.createElement('div');
  footer.className='glossary-footer';
  footer.innerHTML=
    '<button class="glossary-toggle" onclick="this.parentElement.classList.toggle(\'open\')" aria-expanded="false">'+
      '<span class="glossary-toggle-label">'+
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'+
        'Glossário de siglas'+
      '</span>'+
      '<span class="glossary-toggle-arrow">▸</span>'+
    '</button>'+
    '<div class="glossary-body">'+
      glossary.map(sec=>
        '<div class="glossary-section">'+
          '<div class="glossary-section-title">'+sec.cat+'</div>'+
          '<dl class="glossary-dl">'+
            sec.terms.map(([t,d])=>'<div><dt>'+t+'</dt><dd>'+d+'</dd></div>').join('')+
          '</dl>'+
        '</div>'
      ).join('')+
    '</div>';

  main.appendChild(footer);
}

// ── Tabelas stackable no mobile ──────────────────────────────
// Todas as tabelas com ≥2 colunas viram cards no mobile (sem scroll horizontal).
// Cabeçalho: <thead>, 1ª linha só de <th>, ou fallback "Coluna N".
function _cellText(el){
  return (el.textContent||'').replace(/\s+/g,' ').trim();
}
function _rowCells(row){
  return [...row.children].filter(c=>c.tagName==='TD'||c.tagName==='TH');
}
function _maxCols(table){
  let n=0;
  table.querySelectorAll('tr').forEach(r=>{n=Math.max(n,_rowCells(r).length);});
  return n;
}
function _isHeaderRow(row){
  if(!row)return false;
  if(row.parentElement&&row.parentElement.tagName==='THEAD')return true;
  const cells=_rowCells(row);
  if(!cells.length)return false;
  // só <th>
  if(cells.every(c=>c.tagName==='TH'))return true;
  // maioria th
  const ths=cells.filter(c=>c.tagName==='TH').length;
  return ths>=Math.ceil(cells.length*0.6);
}
function prepareStackableTables(root){
  const scope=root||document;
  scope.querySelectorAll('table').forEach(table=>{
    if(table.dataset.stackReady==='1')return;
    // UI de busca / chrome — não stackar
    if(table.closest('.search-modal,.search-results,.header,.sidebar'))return;
    // layout tables com role=presentation
    if(table.getAttribute('role')==='presentation')return;

    const cols=_maxCols(table);
    if(cols<2)return; // 1 coluna: não estoura, não stacka

    let headers=[];
    let headRow=null;
    const theadRow=table.querySelector('thead tr');
    if(theadRow){
      headRow=theadRow;
      headers=_rowCells(theadRow).map(_cellText);
    }else{
      const first=table.querySelector('tr');
      if(_isHeaderRow(first)){
        headRow=first;
        headers=_rowCells(first).map(_cellText);
        first.classList.add('table-stack-head');
      }
    }
    // preenche labels faltantes
    while(headers.length<cols)headers.push('Coluna '+(headers.length+1));
    headers=headers.map((h,i)=>h||('Coluna '+(i+1)));

    const bodyRows=[...table.querySelectorAll('tr')].filter(r=>{
      if(r===headRow||r.classList.contains('table-stack-head'))return false;
      if(r.parentElement&&r.parentElement.tagName==='THEAD')return false;
      if(_isHeaderRow(r)&&!r.querySelector('td'))return false;
      return _rowCells(r).some(c=>c.tagName==='TD');
    });

    bodyRows.forEach(row=>{
      _rowCells(row).forEach((cell,i)=>{
        // não sobrescreve label manual
        if(!cell.getAttribute('data-label')&&headers[i]){
          cell.setAttribute('data-label',headers[i]);
        }
      });
    });

    table.dataset.stackReady='1';
    table.classList.add('table-stackable');
    let wrap=table.closest('.table-wrap');
    if(wrap){
      wrap.classList.add('table-stack');
    }else{
      const w=document.createElement('div');
      w.className='table-wrap table-stack';
      table.parentNode.insertBefore(w,table);
      w.appendChild(table);
    }
  });
}
// expõe para assistentes / páginas com HTML dinâmico
window.prepareStackableTables=prepareStackableTables;

function observeStackableTables(){
  if(typeof MutationObserver==='undefined')return;
  const mo=new MutationObserver(muts=>{
    let need=false;
    for(const m of muts){
      if(m.addedNodes&&m.addedNodes.length){need=true;break;}
    }
    if(!need)return;
    // debounce
    clearTimeout(observeStackableTables._t);
    observeStackableTables._t=setTimeout(()=>prepareStackableTables(),40);
  });
  mo.observe(document.documentElement,{childList:true,subtree:true});
}

// ============================================================
// BOOT
// ============================================================
document.addEventListener('DOMContentLoaded',()=>{
  buildShell();
  applyTheme(getTheme()); // atualiza ícone do toggle no header
  prepareStackableTables();
  observeStackableTables();
  initProgress();
  initSearchKeys();
  buildGlossaryFooter();
  if(document.getElementById('quiz-container'))renderQuestion();
});
