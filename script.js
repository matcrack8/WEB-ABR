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

  // MEDIDA ANTI-SPAM 1 — Llave compartida con el Web App de Google Apps
  // Script, que rechaza del lado del servidor cualquier petición sin ella.
  //
  // NIVEL DE PROTECCIÓN REAL: esta llave viaja en el código fuente público
  // del sitio (inevitable en un sitio estático sin backend propio), así que
  // NO es secreta en sentido criptográfico: cualquiera que abra este archivo
  // puede leerla. Su función es filtrar bots genéricos y scrapers que hacen
  // POST a endpoints encontrados automáticamente sin inspeccionar el JS de
  // cada sitio. NO detiene a un atacante dirigido que lea este código.
  const CONSENT_SECRET_KEY = 'abr-sas-f9k2m8x7q1w4z6-2026';

  // Tiempo mínimo (segundos) entre que el formulario queda listo y el envío.
  // Ver nota sobre el umbral más abajo, donde se aplica.
  const MIN_FILL_SECONDS = 2;

  // Se toma al ejecutarse el script (final del <body>, con el formulario ya
  // parseado), que es más temprano y más confiable que esperar a
  // DOMContentLoaded: no depende de que el evento alcance a registrarse.
  const formReadyAt = Date.now();

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

  // Misma pantalla de éxito para un envío real y para uno descartado por
  // sospecha de bot. Es intencional que sean indistinguibles: un mensaje de
  // error le enseñaría al operador del bot qué ajustar para no ser detectado.
  function mostrarExito(){
    form.style.display = 'none';
    successBox.style.display = 'block';
  }

  form.addEventListener('submit', function(e){
    e.preventDefault();

    // MEDIDA ANTI-SPAM 2 — Honeypot.
    // Va antes que cualquier validación: si el campo trampa trae algo, es un
    // bot con certeza práctica y no tiene sentido evaluarle nada más.
    // ALCANCE REAL: detiene bots genéricos y scrapers no dirigidos, que
    // llenan indiscriminadamente todos los <input> del formulario. NO detiene
    // a un bot programado específicamente contra este formulario, que puede
    // simplemente omitir este campo.
    if(form.website.value.trim() !== ''){
      mostrarExito();
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

    // MEDIDA ANTI-SPAM 3 — Tiempo mínimo de llenado.
    // Se evalúa al final, ya con el formulario completo y válido, y no al
    // principio: si se evaluara antes de validar, un visitante curioso que
    // pulsa "Enviar" apenas carga la página (formulario vacío) vería el
    // mensaje de "¡Gracias!" sin haber enviado nada. Puesto aquí, ese caso
    // recibe las validaciones normales, y sigue cumpliéndose el requisito de
    // que ninguna de las tres medidas deje pasar un fetch.
    // ALCANCE REAL: detiene bots que hacen submit instantáneo sin simular
    // comportamiento humano. NO detiene a un bot que deliberadamente espere
    // unos segundos antes de enviar.
    const segundosLlenando = (Date.now() - formReadyAt) / 1000;
    if(segundosLlenando < MIN_FILL_SECONDS){
      mostrarExito();
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
    // Google Sheets. Nunca bloquea ni afecta el envío a HubSpot ni el
    // mensaje de éxito: si este registro falla, el usuario no se entera,
    // pero queda un error detallado en consola para poder diagnosticarlo.
    //
    // POR QUÉ Content-Type: text/plain Y NO application/json:
    // Apps Script NO puede responder a peticiones OPTIONS (devuelve 405,
    // no existe un doOptions), así que cualquier request que dispare un
    // preflight CORS queda bloqueada por el navegador. Mandar el body como
    // text/plain lo mantiene dentro de las "simple requests", que no
    // disparan preflight. El Apps Script igual lee el JSON crudo con
    // JSON.parse(e.postData.contents), sin depender del Content-Type.
    //
    // Gracias a eso ya NO hace falta mode:'no-cors': Apps Script devuelve
    // Access-Control-Allow-Origin: * en el 302 y en la respuesta final, así
    // que la respuesta es legible y se puede confirmar si el registro quedó
    // guardado de verdad, en vez de asumirlo a ciegas.
    fetch(CONSENT_LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        secretKey: CONSENT_SECRET_KEY,
        nombre: datos.nombre,
        correo: datos.correo,
        telefono: datos.telefono,
        empresa: datos.empresa,
        descripcion: datos.proyecto,
        consentimientoAceptado: true,
        versionPolitica: POLICY_VERSION
      })
    })
    .then(function(res){
      return res.text().then(function(texto){
        return { ok: res.ok, status: res.status, texto: texto };
      });
    })
    .then(function(r){
      if(!r.ok){
        console.error(
          '[Consentimiento] FALLO: Google respondió HTTP ' + r.status + '. ' +
          'El consentimiento NO quedó registrado. Respuesta:', r.texto
        );
        return;
      }

      let data = null;
      try {
        data = JSON.parse(r.texto);
      } catch(err){
        // La petición llegó (HTTP 200), pero el cuerpo no es el JSON
        // esperado. La fila probablemente sí se escribió, así que se avisa
        // como advertencia y no como fallo, para no disparar falsas alarmas.
        console.warn(
          '[Consentimiento] Google respondió 200 pero con un cuerpo no reconocible; ' +
          'no se pudo confirmar el registro. Respuesta:', r.texto
        );
        return;
      }

      if(data && data.status === 'ok'){
        return; // Registrado correctamente.
      }

      // Caso crítico: el más probable acá es que CONSENT_SECRET_KEY ya no
      // coincida con la llave configurada en el Apps Script, que responde
      // {"status":"error","message":"unauthorized"}. Sin este log, la
      // evidencia de consentimiento se perdería en silencio.
      console.error(
        '[Consentimiento] RECHAZADO por Google: el consentimiento NO quedó ' +
        'registrado. Revisa que CONSENT_SECRET_KEY coincida con la llave del ' +
        'Apps Script. Respuesta:', data
      );
    })
    .catch(function(err){
      // Red caída, CORS, o el Web App sin desplegar como "Cualquier persona".
      console.error(
        '[Consentimiento] No se pudo contactar el registro en Google Sheets; ' +
        'el consentimiento puede no haber quedado guardado:', err
      );
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
