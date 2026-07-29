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
  const HUBSPOT_ENDPOINT = 'https://api.hsforms.com/submissions/v3/integration/submit/51794916/a3b67186-da54-4167-bfb7-f412858334bb';

  const form = document.getElementById('projectForm');
  const btn = document.getElementById('formSubmitBtn');
  const errorMsg = document.getElementById('formError');
  const successBox = document.getElementById('formSuccess');
  if(!form) return;

  form.addEventListener('submit', function(e){
    e.preventDefault();

    // Anti-spam: si el campo honeypot fue llenado (por un bot), se descarta el envío en silencio
    if(form._honey.value){
      form.style.display = 'none';
      successBox.style.display = 'block';
      return;
    }

    errorMsg.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    const payload = {
      fields: [
        { name: 'firstname', value: form.nombre.value.trim() },
        { name: 'lastname', value: form.apellidos.value.trim() },
        { name: 'email', value: form.correo.value.trim() },
        { name: 'phone', value: form.telefono.value.trim() },
        { name: 'company', value: form.empresa.value.trim() },
        { name: 'descripcion_del_proyecto', value: form.proyecto.value.trim() }
      ],
      context: {
        pageUri: window.location.href,
        pageName: document.title
      }
    };

    fetch(HUBSPOT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(function(res){
      return res.json().catch(function(){ return null; }).then(function(data){
        return { ok: res.ok, status: res.status, data: data };
      });
    })
    .then(function(result){
      if(result.ok){
        form.style.display = 'none';
        successBox.style.display = 'block';
      } else {
        console.error('HubSpot Forms API respondió con error:', result.status, result.data);
        throw new Error('Envío fallido');
      }
    })
    .catch(function(err){
      console.error('No se pudo enviar el formulario a HubSpot:', err);
      errorMsg.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Enviar información';
    });
  });
})();
