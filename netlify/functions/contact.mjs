import { processContact } from '../../server/contact-handler.js';

// Netlify's modern web-standard function, routed by the first _redirects rule.
export default async function handler(request) {
  const body = await request.text();
  const result = await processContact({
    method: request.method,
    body,
    contentType: request.headers.get('content-type') || ''
  });
  const headers = { 'Cache-Control': 'no-store' };
  if (result.status === 405) headers.Allow = 'POST';
  if (result.status === 200 && !String(request.headers.get('accept') || '').includes('application/json')) {
    return new Response(null, { status: 303, headers: { ...headers, Location: '/thank-you/' } });
  }
  return Response.json({ message: result.message }, { status: result.status, headers });
}
