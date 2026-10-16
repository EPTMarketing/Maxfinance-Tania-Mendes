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

});
window.sendLeadToBrevo = function (form) {
  if (!form) return;

  try {
    var formData = new FormData(form);
    var payload = {};

    formData.forEach(function (value, key) {
      if (key === 'form-name') {
        payload.form_name = value;
        return;
      }

      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        if (!Array.isArray(payload[key])) payload[key] = [payload[key]];
        payload[key].push(value);
      } else {
        payload[key] = value;
      }
    });

    payload.page_url = window.location.href;
    payload.consentimento = form.querySelector('[name="consentimento"]:checked') ? 'Sim' : '';

    fetch('/.netlify/functions/brevo-contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
      credentials: 'same-origin'
    }).catch(function (error) {
      console.warn('Não foi possível enviar a lead para o Brevo:', error);
    });
  } catch (error) {
    console.warn('Erro ao preparar a lead para o Brevo:', error);
  }
};
