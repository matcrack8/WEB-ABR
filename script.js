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
  const HUBSPOT_ENDPOINT = 'https://api.hsforms.com/submissions/v3/integration/submit/51814632/36c42814-d7c6-42d7-8189-33ae4df07961';

  // Registro de consentimiento (Ley 1581 de 2012), completamente aparte del
  // envío comercial a HubSpot: no comparten datos ni dependen entre sí.
  const CONSENT_LOG_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwPXbFBod9vGfWLY51fHsOcT5-RHh9DDvRzStSRZRCe008GohIaLsjpZ4FDJaTbGnJKFw/exec';
  const POLICY_VERSION = '1.0 - 31 de julio de 2026';

  const form = document.getElementById('projectForm');
  const btn = document.getElementById('formSubmitBtn');
  const errorMsg = document.getElementById('formError');
  const consentError = document.getElementById('consentError');
  const telefonoInput = document.getElementById('telefono');
  const telefonoError = document.getElementById('telefonoError');
  const successBox = document.getElementById('formSuccess');
  if(!form) return;

  // Teléfono: solo "+" opcional al inicio, seguido de números y espacios.
  // type="tel" no valida ningún formato por sí solo (es solo una pista de
  // teclado en móvil), así que la restricción de caracteres se hace acá.
  const TELEFONO_REGEX = /^\+?[0-9\s]+$/;

  function telefonoEsValido(){
    return TELEFONO_REGEX.test(telefonoInput.value.trim());
  }

  function validarTelefonoEnVivo(){
    // No mostrar el error mientras el campo está vacío y el usuario no lo
    // ha tocado todavía (evita el mensaje apenas se carga la página).
    if(telefonoInput.value.trim() === ''){
      telefonoError.style.display = 'none';
      return;
    }
    telefonoError.style.display = telefonoEsValido() ? 'none' : 'block';
  }

  telefonoInput.addEventListener('input', validarTelefonoEnVivo);
  telefonoInput.addEventListener('blur', validarTelefonoEnVivo);

  form.addEventListener('submit', function(e){
    e.preventDefault();

    // Anti-spam: si el campo honeypot fue llenado (por un bot), se descarta el envío en silencio
    if(form._honey.value){
      form.style.display = 'none';
      successBox.style.display = 'block';
      return;
    }

    errorMsg.style.display = 'none';
    consentError.style.display = 'none';

    // El <form> tiene novalidate para evitar que el navegador muestre su
    // aviso nativo en el checkbox de consentimiento (queríamos mostrar el
    // nuestro en su lugar). Como eso desactiva la validación automática de
    // TODO el formulario, se valida manualmente cada campo obligatorio.

    // Nombre, correo, empresa y descripción: se revisan primero para que,
    // si alguno está vacío o es inválido (ej. formato de correo), el
    // navegador siga mostrando su aviso nativo de siempre sobre ese campo.
    const camposRequeridos = [form.nombre, form.correo, form.empresa, form.proyecto];
    for(let i = 0; i < camposRequeridos.length; i++){
      if(!camposRequeridos[i].checkValidity()){
        camposRequeridos[i].reportValidity();
        return;
      }
    }

    // Teléfono: validación propia con mensaje personalizado, no la nativa.
    if(!telefonoEsValido()){
      telefonoError.style.display = 'block';
      telefonoInput.focus();
      return;
    }

    // Checkbox de consentimiento: aquí sí mostramos nuestro mensaje
    // personalizado en vez del nativo del navegador.
    if(!form.consentimiento.checked){
      consentError.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Enviando...';

    const datos = {
      nombre: form.nombre.value.trim(),
      correo: form.correo.value.trim(),
      telefono: form.telefono.value.trim(),
      empresa: form.empresa.value.trim(),
      proyecto: form.proyecto.value.trim()
    };

    const hubspotPayload = {
      fields: [
        { name: '0-1/firstname', value: datos.nombre },
        { name: '0-1/email', value: datos.correo },
        { name: '0-1/phone', value: datos.telefono },
        { name: '0-1/company', value: datos.empresa },
        { name: '0-1/descripcion_del_proyecto', value: datos.proyecto }
      ],
      context: {
        pageUri: window.location.href,
        pageName: document.title
      }
    };

    // Envío en paralelo, no bloqueante, al registro de consentimiento en
    // Google Sheets. Usa mode:'no-cors' porque así lo requiere el Web App
    // de Google Apps Script; eso vuelve la respuesta opaca (no se puede
    // leer status ni body), así que este envío es "best effort": se
    // intenta siempre, pero no hay forma de confirmar desde el navegador
    // si Google realmente lo recibió. Su éxito o fallo nunca bloquea ni
    // afecta el envío a HubSpot ni el mensaje de éxito mostrado al usuario.
    // Nota: en modo no-cors el navegador ignora headers no "seguros" como
    // Content-Type: application/json (los descarta sin avisar), así que no
    // se declara aquí — el body sigue siendo JSON como texto plano; del
    // lado de Google Apps Script debe leerse con JSON.parse(e.postData.contents)
    // sin depender de e.postData.type.
    fetch(CONSENT_LOG_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({
        nombre: datos.nombre,
        correo: datos.correo,
        telefono: datos.telefono,
        empresa: datos.empresa,
        descripcion: datos.proyecto,
        consentimientoAceptado: true,
        versionPolitica: POLICY_VERSION
      })
    }).catch(function(err){
      console.error('No se pudo registrar el consentimiento en Google Sheets (best effort):', err);
    });

    fetch(HUBSPOT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hubspotPayload)
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
