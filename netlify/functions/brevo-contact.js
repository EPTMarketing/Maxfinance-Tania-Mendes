const BREVO_API_BASE = 'https://api.brevo.com/v3';

const ATTRIBUTE_MAP = {
  nome: 'NOME',
  telefone: 'TELEFONE',
  campaign: 'CAMPANHA',
  qualificacao: 'QUALIFICACAO',
  lead_score: 'LEAD_SCORE',
  tipo_credito: 'TIPO_CREDITO',
  objetivo: 'OBJETIVO',
  fase_imovel: 'FASE_IMOVEL',
  tipo_viatura: 'TIPO_VIATURA',
  creditos_consolidar: 'CREDITOS_CONSOLIDAR',
  motivo_transferencia: 'MOTIVO_TRANSFERENCIA',
  titulares: 'TITULARES',
  valor_financiar: 'VALOR_FINANCIAR',
  prazo: 'PRAZO',
  situacao_profissional: 'SITUACAO_PROFISSIONAL',
  situacao_outra: 'SITUACAO_OUTRA',
  situacao_profissional2: 'SITUACAO_PROFISSIONAL_2',
  situacao_outra2: 'SITUACAO_OUTRA_2',
  timing: 'TIMING',
  gclid: 'GCLID',
  fbclid: 'FBCLID',
  consentimento: 'CONSENTIMENTO',
  form_name: 'FORMULARIO',
  page_url: 'PAGINA_ORIGEM'
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(body)
  };
}

async function brevoRequest(path, options = {}) {
  const apiKey = process.env.BREVO_API_KEY;
  const response = await fetch(`${BREVO_API_BASE}${path}`, {
    ...options,
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  let data = null;
  const text = await response.text();
  if (text) {
    try { data = JSON.parse(text); } catch (_) { data = { raw: text }; }
  }

  if (!response.ok) {
    const error = new Error(`Brevo API ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

async function ensureContactAttributes() {
  const current = await brevoRequest('/contacts/attributes', { method: 'GET' });
  const existing = new Set(
    ((current && current.attributes) || []).map((attr) => String(attr.name || '').toUpperCase())
  );

  const required = [...new Set(Object.values(ATTRIBUTE_MAP))];

  for (const name of required) {
    if (existing.has(name)) continue;

    try {
      await brevoRequest(`/contacts/attributes/normal/${encodeURIComponent(name)}`, {
        method: 'POST',
        body: JSON.stringify({ type: 'text' })
      });
      existing.add(name);
    } catch (error) {
      // Se outro pedido tiver criado o atributo entretanto, ou se a conta não
      // permitir a criação, não bloqueamos a entrada da lead.
      if (error.status !== 400) {
        console.warn(`Não foi possível criar o atributo Brevo ${name}:`, error.data || error.message);
      }
    }
  }

  return existing;
}

function normalizeValue(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  if (value === true) return 'Sim';
  if (value === false) return 'Não';
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  if (!process.env.BREVO_API_KEY) {
    console.error('BREVO_API_KEY não configurada no Netlify.');
    return json(500, { ok: false, error: 'Brevo not configured' });
  }

  const listId = Number(process.env.BREVO_LIST_ID);
  if (!Number.isInteger(listId) || listId <= 0) {
    console.error('BREVO_LIST_ID inválido no Netlify.');
    return json(500, { ok: false, error: 'Brevo list not configured' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (_) {
    return json(400, { ok: false, error: 'Invalid JSON' });
  }

  const email = normalizeValue(payload.email).toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { ok: false, error: 'Email inválido' });
  }

  try {
    const availableAttributes = await ensureContactAttributes();
    const attributes = {};

    for (const [sourceKey, brevoKey] of Object.entries(ATTRIBUTE_MAP)) {
      if (!availableAttributes.has(brevoKey)) continue;
      const value = normalizeValue(payload[sourceKey]);
      if (value) attributes[brevoKey] = value;
    }

    // Se FIRSTNAME existir por defeito na conta, também o preenchemos para
    // facilitar personalizações simples nas automações do Brevo.
    if (availableAttributes.has('FIRSTNAME') && payload.nome) {
      attributes.FIRSTNAME = normalizeValue(payload.nome).split(/\s+/)[0] || normalizeValue(payload.nome);
    }

    const result = await brevoRequest('/contacts', {
      method: 'POST',
      body: JSON.stringify({
        email,
        attributes,
        listIds: [listId],
        updateEnabled: true
      })
    });

    return json(200, { ok: true, id: result && result.id ? result.id : null });
  } catch (error) {
    console.error('Erro ao enviar contacto para o Brevo:', error.data || error.message || error);
    return json(502, { ok: false, error: 'Brevo API error' });
  }
};
