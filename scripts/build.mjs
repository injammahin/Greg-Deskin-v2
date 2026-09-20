import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
// Only public site files enter the host's web root. Never publish .env or functions.
const publicPaths = [
  'index.html', '404.html', '_redirects', 'favicon.png', 'favicon-64.png',
  'robots.txt', 'site.webmanifest', 'sitemap.xml', 'assets', 'about',
  'accessibility', 'ada', 'contact', 'cookie-policy', 'licensing', 'loan-types',
  'privacy-policy', 'resources', 'reviews', 'sms-terms-conditions',
  'terms-of-use', 'texas-complaint-recovery-fund-notice', 'thank-you', 'verification'
];

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
for (const file of publicPaths) {
  const source = path.join(root, file);
  if (!fs.existsSync(source)) throw new Error(`Public site file missing: ${file}`);
  fs.cpSync(source, path.join(output, file), { recursive: true });
}
console.log(`Built public site into dist/ (${publicPaths.length} top-level entries).`);
