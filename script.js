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

(function(){
  const form = document.getElementById('projectForm');
  const btn = document.getElementById('formSubmitBtn');
  const errorMsg = document.getElementById('formError');
  const successBox = document.getElementById('formSuccess');
  if(!form) return;

  form.addEventListener('submit', function(e){
    e.preventDefault();
    errorMsg.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    fetch(form.action, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: new FormData(form)
    })
    .then(function(res){
      if(res.ok){
        form.style.display = 'none';
        successBox.style.display = 'block';
      } else {
        throw new Error('Envío fallido');
      }
    })
    .catch(function(){
      errorMsg.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Enviar información';
    });
  });
})();
