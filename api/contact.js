import { processContact } from '../server/contact-handler.js';

// Vercel serverless function. The API key and recipient stay on the server.
export default async function handler(req, res) {
  const result = await processContact({
    method: req.method,
    body: req.body,
    contentType: req.headers['content-type'] || ''
  });
  res.setHeader('Cache-Control', 'no-store');
  if (result.status === 405) res.setHeader('Allow', 'POST');
  if (result.status === 200 && !String(req.headers.accept || '').includes('application/json')) {
    res.writeHead(303, { Location: '/thank-you/' });
    return res.end();
  }
  return res.status(result.status).json({ message: result.message });
}
