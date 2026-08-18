document.addEventListener('DOMContentLoaded', function () {
  const legalToggle = document.getElementById('legal-fade-toggle');
  const legalWrap = document.getElementById('legal-fade-wrap');

  if (legalToggle && legalWrap) {
    legalToggle.addEventListener('click', function () {
      const isExpanded = legalWrap.classList.toggle('expanded');
      legalToggle.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
    });
  }

  const form = document.getElementById('leadForm');
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(function (item) {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');

    if (!question || !answer) return;

    question.setAttribute('aria-expanded', 'false');

    question.addEventListener('click', function () {
      const isOpen = item.classList.contains('active');

      faqItems.forEach(function (otherItem) {
        otherItem.classList.remove('active');
        const otherQuestion = otherItem.querySelector('.faq-question');
        const otherAnswer = otherItem.querySelector('.faq-answer');
        if (otherQuestion) otherQuestion.setAttribute('aria-expanded', 'false');
        if (otherAnswer) otherAnswer.style.maxHeight = '0px';
      });

      if (!isOpen) {
        item.classList.add('active');
        question.setAttribute('aria-expanded', 'true');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });

  if (!form) return;

  const fields = Array.from(form.querySelectorAll('input[required], select[required]'));

  function showError(field, message) {
    const group = field.closest('.form-group');
    const isCheckbox = field.type === 'checkbox';
    const error = isCheckbox ? form.querySelector('.checkbox-error') : group.querySelector('.error-message');

    if (group) group.classList.add('error');
    if (error) error.textContent = message;
  }

  function clearError(field) {
    const group = field.closest('.form-group');
    const isCheckbox = field.type === 'checkbox';
    const error = isCheckbox ? form.querySelector('.checkbox-error') : group.querySelector('.error-message');

    if (group) group.classList.remove('error');
    if (error) error.textContent = '';
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function validateField(field) {
    clearError(field);

    if (field.type === 'checkbox') {
      if (!field.checked) {
        showError(field, 'Este consentimento é obrigatório.');
        return false;
      }
      return true;
    }

    if (!field.value || !field.value.trim()) {
      showError(field, 'Campo obrigatório.');
      return false;
    }

    if (field.type === 'email' && !isValidEmail(field.value.trim())) {
      showError(field, 'Insira um email válido.');
      return false;
    }

    if (field.type === 'tel' && field.value.replace(/\D/g, '').length < 9) {
      showError(field, 'Insira um telefone válido.');
      return false;
    }

    return true;
  }

  fields.forEach(function (field) {
    field.addEventListener('input', function () { validateField(field); });
    field.addEventListener('change', function () { validateField(field); });
  });

  form.addEventListener('submit', function (event) {
    let valid = true;

    fields.forEach(function (field) {
      if (!validateField(field)) valid = false;
    });

    if (!valid) {
      event.preventDefault();
      const firstInvalid = form.querySelector('.form-group.error input, .form-group.error select, input[type="checkbox"]:invalid');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    const button = form.querySelector('.submit-btn');
    if (button) {
      button.disabled = true;
      button.textContent = 'A enviar...';
    }
  });
});