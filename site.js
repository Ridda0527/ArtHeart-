// Shared behavior for every page: frame guard, back-to-top, mobile menu, current-page highlight.
(function(){
  // GitHub Pages can't send frame-ancestors / X-Frame-Options, so refuse to show inside another site's frame.
  // Browsers usually block the redirect, so hiding the page is what actually stops clickjacking.
  if(window.top!==window.self){
    document.documentElement.style.display='none';
    try{ window.top.location=window.self.location.href; }catch(e){}
    return;
  }

  var btt=document.getElementById('backTop');
  if(btt){
    window.addEventListener('scroll',function(){
      btt.classList.toggle('show',window.scrollY>400);
    },{passive:true});
    btt.addEventListener('click',function(){
      window.scrollTo({top:0,behavior:'smooth'});
    });
  }

  var ham=document.getElementById('hamburger');
  var navEl=document.getElementById('navLinks');
  if(ham&&navEl){
    ham.addEventListener('click',function(){
      var open=navEl.classList.toggle('open');
      ham.classList.toggle('open',open);
      ham.setAttribute('aria-expanded',open?'true':'false');
    });
    navEl.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click',function(){
        ham.classList.remove('open');
        navEl.classList.remove('open');
        ham.setAttribute('aria-expanded','false');
      });
    });
  }

  var last=window.location.pathname.split('/').pop()||'';
  var page=last.indexOf('.')>-1?last.substring(0,last.lastIndexOf('.')):last;
  if(!page)page='index';
  document.querySelectorAll('.nav-links a').forEach(function(a){
    if(a.getAttribute('data-page')===page){
      a.classList.add('active');
      a.setAttribute('aria-current','page');
    }
  });
})();
