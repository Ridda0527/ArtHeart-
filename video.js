(function(){
  var btns=document.querySelectorAll('.video-facade');
  for(var i=0;i<btns.length;i++){
    btns[i].addEventListener('click',function(){
      var f=document.createElement('iframe');
      f.src=this.getAttribute('data-src');
      f.title=this.getAttribute('data-title');
      f.setAttribute('allow','autoplay; encrypted-media; picture-in-picture; fullscreen');
      f.setAttribute('allowfullscreen','');
      this.parentNode.replaceChild(f,this);
      f.focus();
    });
  }
})();
