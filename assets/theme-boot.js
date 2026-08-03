/* Apply saved theme + view before paint (include in <head> before CSS if possible) */
/* Vistas do be·aside — três identidades, mesmo conteúdo:
   - "ws" + claro   → Workspace claro (identidade nova, padrão no desktop)
   - "ws" + escuro  → Workspace escuro (grafite)
   - "mobile"       → a identidade visual clássica do be·aside, em tela cheia,
                      em qualquer tamanho de tela. Não é uma prévia nem uma
                      moldura: é o estilo original, preservado por inteiro. */
(function(){
  var VIEW_KEY='beaside-view';
  var THEME_KEY='beaside-theme';
  var doc=document.documentElement;

  var t=null;
  try{t=localStorage.getItem(THEME_KEY);}catch(e){}
  if(t==='light'||t==='dark')doc.setAttribute('data-theme',t);

  var v=null;
  try{v=localStorage.getItem(VIEW_KEY);}catch(e){}
  if(v!=='ws'&&v!=='mobile')v=null;
  if(!v)v=(window.innerWidth<=768)?'mobile':'ws';

  if(v==='ws'){
    doc.setAttribute('data-design','ws');
    /* workspace é claro por padrão para quem nunca escolheu tema */
    if(t!=='light'&&t!=='dark')doc.setAttribute('data-theme','light');
    /* fonte display do workspace — só carrega nesta vista;
       a vista clássica ("Mobile") não baixa um byte a mais */
    try{
      var f=document.createElement('link');
      f.rel='stylesheet';
      f.href='https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&display=swap';
      (document.head||doc).appendChild(f);
    }catch(e){}
  }
  /* v==='mobile': nenhum atributo — o CSS clássico rege sozinho */

  /* troca de vista — global, usada pelos controles do header */
  window.beasideSetView=function(view,theme){
    try{localStorage.setItem(VIEW_KEY,view==='mobile'?'mobile':'ws');}catch(e){}
    if(theme==='light'||theme==='dark'){
      try{localStorage.setItem(THEME_KEY,theme);}catch(e){}
    }
    location.reload();
  };
  window.beasideToggleView=function(){
    var ws=doc.getAttribute('data-design')==='ws';
    window.beasideSetView(ws?'mobile':'ws');
  };

  /* safe-area em notched phones — meta costuma vir DEPOIS deste script */
  function ensureViewportFit(){
    try{
      var vp=document.querySelector('meta[name="viewport"]');
      if(!vp)return false;
      var c=vp.getAttribute('content')||'';
      if(c.indexOf('viewport-fit')===-1){
        vp.setAttribute('content',c+(c?', ':'')+'viewport-fit=cover');
      }
      return true;
    }catch(e){return true;}
  }
  if(!ensureViewportFit()){
    if(document.readyState==='loading'){
      document.addEventListener('DOMContentLoaded',ensureViewportFit);
    }else{
      ensureViewportFit();
    }
  }
})();
