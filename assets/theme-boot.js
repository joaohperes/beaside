/* Apply saved theme before paint (include in <head> before CSS if possible) */
(function(){
  try{
    var t=localStorage.getItem('beaside-theme');
    if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);
  }catch(e){}

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
