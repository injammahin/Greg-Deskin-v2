const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

const field = (body, name, maxLength) => {
  const value = body[name];
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string' || value.length > maxLength) throw new Error(`Invalid ${name}`);
  return value.trim();
};

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

export function parseContactBody(body, contentType = '') {
  if (contentType.includes('application/json')) {
    if (body && typeof body === 'object' && !Buffer.isBuffer(body)) return body;
    return JSON.parse(String(body || ''));
  }
  if (contentType.includes('application/x-www-form-urlencoded')) {
    if (body && typeof body === 'object' && !Buffer.isBuffer(body)) return body;
    return Object.fromEntries(new URLSearchParams(String(body || '')));
  }
  throw new Error('Unsupported content type');
}

function validate(body) {
  if (!body || Array.isArray(body) || typeof body !== 'object') throw new Error('Invalid form');
  const kind = field(body, 'form_type', 20);
  if (kind !== 'lead' && kind !== 'schedule') throw new Error('Invalid form type');
  const name = field(body, 'name', 120);
  const email = field(body, 'email', 254);
  if (name.length < 2 || /[\r\n]/.test(name) || !EMAIL.test(email)) throw new Error('Please enter your name and a valid email');
  const common = { name, email, source_page: field(body, 'source_page', 300) || '/' };
  if (kind === 'lead') {
    const phone = field(body, 'phone', 35);
    if ((phone.match(/\d/g) || []).length < 7 || !/^[\d+().\- xextEXT]+$/.test(phone)) throw new Error('Please enter a valid phone number');
    const loanPurpose = field(body, 'loan_purpose', 100);
    const bestTime = field(body, 'best_time', 80);
    if (!loanPurpose || !bestTime) throw new Error('Please choose a loan purpose and contact time');
    return { kind, ...common, phone, loan_purpose: loanPurpose, best_time: bestTime };
  }
  const date = field(body, 'preferred_date', 10);
  const time = field(body, 'preferred_time', 80);
  const parsedDate = new Date(`${date}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsedDate.valueOf()) || parsedDate.toISOString().slice(0, 10) !== date || !time) {
    throw new Error('Please choose a valid date and time');
  }
  return { kind, ...common, preferred_date: date, preferred_time: time, discussion: field(body, 'discussion', 2000) };
}

export function makeBrevoMessage(data, env) {
  const isSchedule = data.kind === 'schedule';
  const fields = isSchedule
    ? [['Full name', data.name], ['Email', data.email], ['Preferred date', data.preferred_date], ['Preferred time', data.preferred_time], ['Discussion', data.discussion], ['Source page', data.source_page]]
    : [['Full name', data.name], ['Phone', data.phone], ['Email', data.email], ['Loan purpose', data.loan_purpose], ['Best time to contact', data.best_time], ['Source page', data.source_page]];
  const rows = fields.filter(([, value]) => value).map(([label, value]) =>
    `<tr><th style="padding:13px 18px;text-align:left;vertical-align:top;border-bottom:1px solid #e4e6eb;color:#616c7b;width:38%;font-size:13px;">${escapeHtml(label)}</th><td style="padding:13px 18px;border-bottom:1px solid #e4e6eb;color:#182333;font-size:15px;word-break:break-word;">${escapeHtml(value).replace(/\n/g, '<br>')}</td></tr>`
  ).join('');
  const subject = isSchedule ? 'New consultation time request | GregDeskin.com' : 'New mortgage inquiry | GregDeskin.com';
  return {
    sender: { name: env.BREVO_SENDER_NAME || 'Greg Deskin Website', email: env.BREVO_SENDER_EMAIL },
    to: [{ email: env.CONTACT_RECIPIENT_EMAIL }],
    replyTo: { name: data.name, email: data.email },
    subject,
    htmlContent: `<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body style="margin:0;padding:28px 12px;background:#f3f5f8;font-family:Arial,Helvetica,sans-serif;"><table role="presentation" style="max-width:640px;width:100%;margin:auto;border-spacing:0;background:#fff;border:1px solid #e4e6eb;border-radius:8px;"><tr><td style="padding:25px 28px;background:#161719;color:#fff;border-bottom:4px solid #c69a31;"><strong style="font-size:23px;">Greg Deskin</strong><br><span style="font-size:12px;color:#e4d4a6;">MORTGAGE &amp; REAL ESTATE</span></td></tr><tr><td style="padding:25px 28px 10px;"><p style="margin:0 0 7px;color:#a67818;font-size:12px;font-weight:bold;letter-spacing:1px;">NEW WEBSITE REQUEST</p><h1 style="margin:0;color:#182333;font-size:24px;">${isSchedule ? 'Consultation time request' : 'Mortgage inquiry'}</h1><p style="margin:10px 0 0;color:#616c7b;font-size:14px;">Reply to this email to respond to ${escapeHtml(data.name)}.</p></td></tr><tr><td style="padding:0 10px 24px;"><table role="presentation" style="width:100%;border-spacing:0;">${rows}</table></td></tr><tr><td style="padding:14px 28px;border-top:1px solid #e4e6eb;background:#fafafa;color:#6b7280;font-size:12px;">Submitted via GregDeskin.com. Please handle contact details confidentially.</td></tr></table></body></html>`
  };
}

export async function processContact({ method, body, contentType, env = process.env, fetchImpl = fetch }) {
  if (method !== 'POST') return { status: 405, message: 'Method not allowed' };
  if (!/^(application\/json|application\/x-www-form-urlencoded)(?:;|$)/i.test(contentType || '')) return { status: 415, message: 'Unsupported content type' };
  if (typeof body === 'string' && Buffer.byteLength(body) > 16_384) return { status: 413, message: 'Request too large' };
  if (typeof body === 'object' && body && JSON.stringify(body).length > 16_384) return { status: 413, message: 'Request too large' };

  let payload;
  try {
    payload = parseContactBody(body, contentType);
    // Honeypot: acknowledge automated submissions without sending mail.
    if (field(payload, '_honey', 200)) return { status: 200, message: 'Request received' };
    payload = validate(payload);
  } catch {
    return { status: 400, message: 'Please check the form fields and try again' };
  }

  const { BREVO_API_KEY, BREVO_SENDER_EMAIL, CONTACT_RECIPIENT_EMAIL } = env;
  if (!BREVO_API_KEY || BREVO_API_KEY.startsWith('PASTE_') || !EMAIL.test(BREVO_SENDER_EMAIL || '') || !EMAIL.test(CONTACT_RECIPIENT_EMAIL || '')) {
    console.error('Contact delivery is not configured. Check the server environment variables.');
    return { status: 503, message: 'Contact delivery is temporarily unavailable' };
  }

  try {
    const response = await fetchImpl(BREVO_URL, {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(makeBrevoMessage(payload, env)),
      signal: AbortSignal.timeout(12000)
    });
    if (response.status !== 201) {
      console.error('Brevo rejected the contact request with status:', response.status);
      return { status: 502, message: 'Contact delivery failed; please try again later' };
    }
    return { status: 200, message: 'Request received' };
  } catch (error) {
    console.error('Contact delivery failed:', error?.name || 'network error');
    return { status: 502, message: 'Contact delivery failed; please try again later' };
  }
}
