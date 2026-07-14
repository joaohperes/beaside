/* Apply saved theme before paint (include in <head> before CSS if possible) */
(function(){
  try{
    var t=localStorage.getItem('beaside-theme');
    if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);
  }catch(e){}
})();
