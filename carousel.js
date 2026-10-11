(function(){
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var carousels=document.getElementsByClassName('carousel');
  var c;
  for(c=0;c<carousels.length;c++){
    (function(carousel){
      var slides=carousel.getElementsByClassName('slide');
      var dots=carousel.getElementsByClassName('dot');
      var titleEl=carousel.parentNode.querySelector('.slideshow-title');
      carousel.setAttribute('role','region');
      carousel.setAttribute('aria-roledescription','carousel');
      carousel.setAttribute('aria-label',titleEl?titleEl.textContent.trim()+' photos':'Event photos');
      if(slides.length<2){return;}
      var idx=0;
      var timer=null;
      var DELAY=3000;
      var userPaused=reduce;  // never auto-advance for people who asked for less motion
      var pauseBtn=document.createElement('button');
      pauseBtn.type='button';
      pauseBtn.className='car-pause';
      carousel.appendChild(pauseBtn);
      function setPauseLabel(){
        pauseBtn.textContent=userPaused?'▶':'❚❚';
        pauseBtn.setAttribute('aria-label',userPaused?'Play slideshow':'Pause slideshow');
      }
      function load(k){
        var imgs=slides[(k+slides.length)%slides.length].querySelectorAll('img[data-src]');
        for(var j=0;j<imgs.length;j++){imgs[j].src=imgs[j].getAttribute('data-src');imgs[j].removeAttribute('data-src');}
      }
      function show(n){
        var i;
        if(n<0){n=slides.length-1;}
        if(n>=slides.length){n=0;}
        idx=n;
        load(idx);load(idx+1);load(idx-1);
        for(i=0;i<slides.length;i++){
          var on=(i===idx);
          slides[i].classList.toggle('active',on);
          slides[i].setAttribute('aria-hidden',on?'false':'true');
        }
        for(i=0;i<dots.length;i++){
          dots[i].classList.toggle('active',i===idx);
          if(i===idx){dots[i].setAttribute('aria-current','true');}
          else{dots[i].removeAttribute('aria-current');}
        }
      }
      function next(){show(idx+1);}
      function prev(){show(idx-1);}
      function stopTimer(){if(timer){clearInterval(timer);timer=null;}}
      function startTimer(){stopTimer();if(!userPaused){timer=setInterval(next,DELAY);}}
      pauseBtn.addEventListener('click',function(){userPaused=!userPaused;setPauseLabel();startTimer();});
      var nextBtn=carousel.querySelector('.car-next');
      var prevBtn=carousel.querySelector('.car-prev');
      if(nextBtn){nextBtn.addEventListener('click',function(){next();startTimer();});}
      if(prevBtn){prevBtn.addEventListener('click',function(){prev();startTimer();});}
      var di;
      for(di=0;di<dots.length;di++){
        (function(k){
          dots[k].addEventListener('click',function(){show(k);startTimer();});
        })(di);
      }
      carousel.addEventListener('mouseenter',stopTimer);
      carousel.addEventListener('mouseleave',startTimer);
      carousel.addEventListener('focusin',stopTimer);
      carousel.addEventListener('focusout',function(e){if(!carousel.contains(e.relatedTarget)){startTimer();}});
      setPauseLabel();
      show(0);
      startTimer();
    })(carousels[c]);
  }
})();
