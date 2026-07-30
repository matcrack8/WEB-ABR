(function(){
  const slides = document.querySelectorAll('#photoCarousel .slide');
  const dots = document.querySelectorAll('#photoCarousel .dot');
  let current = 0;
  setInterval(function(){
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = (current + 1) % slides.length;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
  }, 2000);
})();
