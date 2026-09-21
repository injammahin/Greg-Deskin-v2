import test from 'node:test';
import assert from 'node:assert/strict';
import { makeBrevoMessage, processContact } from './contact-handler.js';

const env = {
  BREVO_API_KEY: 'test-key',
  BREVO_SENDER_EMAIL: 'sender@example.org',
  BREVO_SENDER_NAME: 'Greg Deskin Website',
  CONTACT_RECIPIENT_EMAIL: 'GDeskin@WestCapitalLending.com'
};
const lead = {
  form_type: 'lead', name: 'Jane Borrower', email: 'jane@example.com', phone: '(949) 555-1234',
  loan_purpose: 'Purchase', best_time: 'Morning', source_page: '/contact/'
};
const schedule = {
  form_type: 'schedule', name: 'Sam Borrower', email: 'sam@example.com',
  preferred_date: '2026-12-04', preferred_time: 'Afternoon', discussion: 'Refinance options', source_page: '/contact/'
};

for (const body of [lead, schedule]) {
  test(`${body.form_type} form delivers the correct custom email to the configured recipient`, async () => {
    let request;
    const result = await processContact({
      method: 'POST', body: JSON.stringify(body), contentType: 'application/json', env,
      fetchImpl: async (url, options) => {
        request = { url, options };
        return { status: 201 };
      }
    });
    assert.equal(result.status, 200);
    assert.equal(request.url, 'https://api.brevo.com/v3/smtp/email');
    assert.equal(request.options.headers['api-key'], 'test-key');
    const message = JSON.parse(request.options.body);
    assert.equal(message.to[0].email, env.CONTACT_RECIPIENT_EMAIL);
    assert.equal(message.sender.email, env.BREVO_SENDER_EMAIL);
    assert.equal(message.replyTo.email, body.email);
    assert.ok(message.htmlContent.includes(body.name));
    assert.ok(message.htmlContent.includes(body.form_type === 'lead' ? 'Loan purpose' : 'Preferred date'));
  });
}

test('non-JavaScript form encoding works and the email template escapes customer input', async () => {
  let message;
  const result = await processContact({
    method: 'POST', body: new URLSearchParams({ ...schedule, discussion: '<script>alert(1)</script>' }).toString(),
    contentType: 'application/x-www-form-urlencoded', env,
    fetchImpl: async (_, options) => { message = JSON.parse(options.body); return { status: 201 }; }
  });
  assert.equal(result.status, 200);
  assert.ok(message.htmlContent.includes('&lt;script&gt;'));
  assert.ok(!message.htmlContent.includes('<script>'));
});

test('invalid form or unavailable Brevo never reports success', async () => {
  let sent = false;
  const fetchImpl = async () => { sent = true; return { status: 201 }; };
  assert.equal((await processContact({ method: 'POST', body: { ...lead, email: 'bad' }, contentType: 'application/json', env, fetchImpl })).status, 400);
  assert.equal(sent, false);
  assert.equal((await processContact({ method: 'POST', body: lead, contentType: 'application/json', env: { ...env, BREVO_API_KEY: '' }, fetchImpl })).status, 503);
  assert.equal(sent, false);
  assert.equal((await processContact({ method: 'POST', body: lead, contentType: 'application/json', env, fetchImpl: async () => ({ status: 401 }) })).status, 502);
});

test('submitted recipient cannot override the environment and honeypot submissions send nothing', async () => {
  const message = makeBrevoMessage({ kind: 'lead', ...lead, recipient: 'attacker@example.com' }, env);
  assert.equal(message.to[0].email, env.CONTACT_RECIPIENT_EMAIL);
  let sent = false;
  const result = await processContact({ method: 'POST', body: { ...lead, _honey: 'bot' }, contentType: 'application/json', env, fetchImpl: async () => { sent = true; } });
  assert.equal(result.status, 200);
  assert.equal(sent, false);
});
