(function () {
  const form = document.getElementById('leadForm');
  if (!form) return;
  const field = name => form.elements.namedItem(name);
  function toggle(id, visible) {
    const wrap = document.getElementById(id);
    wrap.hidden = !visible;
    wrap.querySelectorAll('input, select').forEach(input => {
      input.disabled = !visible;
      input.required = visible;
      if (!visible) input.value = '';
    });
  }
  function updateFields() {
    toggle('outraWrap', field('situacao_profissional').value === 'Outra situa\u00e7\u00e3o');
    const second = field('titulares').value === '2';
    toggle('titular2Wrap', second);
    toggle('outra2Wrap', second && field('situacao_profissional2').value === 'Outra situa\u00e7\u00e3o');
  }

  function updateLeadDestination() {
    const phase = field('fase_imovel');
    const timing = field('timing');
    const phaseWeight = phase.selectedOptions[0]?.getAttribute('data-weight');
    const timingWeight = timing.selectedOptions[0]?.getAttribute('data-weight');
    const unqualified = !phase.disabled && phaseWeight === '0' && timingWeight === '0';
    const name = 'maxfinancetaniahabitacao_' + (unqualified ? 'nao_qualificadas' : 'qualificadas');
    form.name = name;
    form.action = unqualified ? '/habitacao/out.html' : '/habitacao/send.html';
    field('form-name').value = name;
    field('qualificacao').value = unqualified ? 'Nao qualificada' : 'Qualificada';
    return !unqualified;
  }

  function updatePlaceholders() {
    const mobile = window.innerWidth <= 720;
    const examples = {
      valor_financiar: 'Ex: 250000', prazo: 'Ex: 35',
      nome: 'O seu nome', telefone: 'Ex: 919 750 548', email: 'oseuemail@email.pt',
      situacao_outra: 'Descreva a situa\u00e7\u00e3o profissional',
      situacao_outra2: 'Descreva a situa\u00e7\u00e3o profissional'
    };
    form.querySelectorAll('.form-group label[for]').forEach(label => {
      const input = document.getElementById(label.htmlFor);
      if (!input) return;
      const question = label.textContent.trim();
      input.setAttribute('aria-label', question);
      if (input.tagName === 'SELECT') {
        input.options[0].textContent = mobile ? question : 'Selecionar';
      } else {
        input.placeholder = mobile ? (input.name === 'nome' ? 'Nome' : question) : (examples[input.name] || question);
      }
    });
  }
  updatePlaceholders();
  window.addEventListener('resize', updatePlaceholders);
  form.addEventListener('change', updateFields);
  form.addEventListener('input', event => {
    const group = event.target.closest('.form-group');
    if (group) { group.classList.remove('error'); group.querySelector('.error-message').textContent = ''; }
  });
  ['gclid', 'fbclid'].forEach(name => {
    try {
      const value = new URLSearchParams(location.search).get(name);
      if (value) sessionStorage.setItem(name, value);
      field(name).value = sessionStorage.getItem(name) || '';
    } catch (_) {}
  });
  form.addEventListener('submit', event => {
    updateFields();
    let firstInvalid;
    form.querySelectorAll('input[required], select[required]').forEach(input => {
      if (input.disabled) return;
      let message = '';
      if (!input.checkValidity()) message = 'Preencha este campo corretamente.';
      if (!input.value.trim() || (input.type === 'checkbox' && !input.checked)) message = 'Campo obrigat\u00f3rio.';
      if (input.type === 'tel' && input.value.replace(/\D/g, '').length < 9) message = 'Insira um telefone v\u00e1lido.';
      const group = input.closest('.form-group');
      const error = group ? group.querySelector('.error-message') : form.querySelector('.checkbox-error');
      if (group) group.classList.toggle('error', !!message);
      if (error) error.textContent = message;
      if (message && !firstInvalid) firstInvalid = input;
    });
    if (firstInvalid) { event.preventDefault(); firstInvalid.focus(); return; }
    const qualified = updateLeadDestination();
    try {
      ['valor_financiar', 'prazo', 'nome', 'telefone', 'email'].forEach(name => sessionStorage.setItem('sim_' + name, field(name).value));
    } catch (_) {}
    if (qualified && window.sendLeadToBrevo) window.sendLeadToBrevo(form);
    const button = form.querySelector('.submit-btn');
    button.disabled = true;
    button.textContent = 'A enviar...';
  });

  // Fit the two title lines to each phone's actual card width.
  const formTitle = document.querySelector('.form-card h2');
  function fitFormTitle() {
    if (!formTitle) return;
    formTitle.style.removeProperty('font-size');
    if (window.innerWidth > 720) return;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;
    const style = window.getComputedStyle(formTitle);
    const baseSize = 21;
    context.font = style.fontWeight + ' ' + baseSize + 'px ' + style.fontFamily;
    const lines = Array.from(formTitle.querySelectorAll('.form-title-line'));
    const widest = Math.max(...lines.map(line => context.measureText(line.textContent.trim()).width));
    const available = formTitle.clientWidth - 4;
    if (available > 0 && widest > 0) {
      formTitle.style.fontSize = Math.min(baseSize, baseSize * available / widest) * 0.95 + 'px';
    }
  }
  fitFormTitle();
  window.addEventListener('resize', fitFormTitle);
  if (document.fonts) document.fonts.ready.then(fitFormTitle);
  if (window.ResizeObserver && formTitle) new ResizeObserver(fitFormTitle).observe(formTitle.parentElement);
  updateFields();
})();
