import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const errors = [];
const warnings = [];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (['.git', 'dist', 'node_modules', '.vercel', '.netlify'].includes(entry.name)) return [];
    const target = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

const htmlFiles = walk(root).filter(file => file.endsWith('.html'));

const requiredRoutes = [
  '/licensing/', '/loan-types/conventional/', '/privacy-policy/', '/sms-terms-conditions/', '/about/', '/terms-of-use/', '/texas-complaint-recovery-fund-notice/',
  '/resources/loan-education/', '/resources/occupancy-types/', '/resources/multiple-financed-properties/', '/resources/first-time-buyer-programs/', '/resources/homebuyer-tools/',
  '/resources/mortgage-loan-choices/', '/resources/loan-estimate-guide/', '/reviews/experience/', '/resources/conforming-loan-limits/', '/reviews/google/',
  '/resources/fha-housing-resources/', '/resources/home-buying-guide/', '/verification/nmls/', '/resources/usda-housing-programs/', '/resources/usda-guaranteed-loan/',
  '/resources/va-loan-eligibility/', '/resources/va-loan-types/'
];

const legacyDestinations = [
  'westcapitallending.com/licensing', 'westcapitallending.com/loan-programs/conventional', 'westcapitallending.com/privacy-policy',
  'westcapitallending.com/sms-terms-conditions', 'westcapitallending.com/team/Greg-Deskin', 'westcapitallending.com/terms-of-use',
  'westcapitallending.com/texas-complaint-recovery-fund-notice', 'TheLoanCenter.com', 'selling-guide.fanniemae.com', 'consumerfinance.gov',
  'experience.com/reviews', 'google.com/search', 'fhfa.gov', 'hud.gov', 'nmlsconsumeraccess.org', 'rd.usda.gov', 'va.gov'
];

const allowedExternalAnchor = url => {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'westcaplending.loanzify.io' ||
      host === 'secure-clix.com' ||
      host.endsWith('.secure-clix.com');
  } catch {
    return false;
  }
};

function resolveLocal(file, url) {
  const clean = url.split('#')[0].split('?')[0];
  if (!clean) return null;

  const decoded = decodeURIComponent(clean);
  const absolute = decoded.startsWith('/')
    ? path.join(root, decoded)
    : path.resolve(path.dirname(file), decoded);

  if (decoded.endsWith('/')) return path.join(absolute, 'index.html');
  if (path.extname(absolute)) return absolute;

  return fs.existsSync(absolute) && fs.statSync(absolute).isDirectory()
    ? path.join(absolute, 'index.html')
    : absolute;
}

for (const route of requiredRoutes) {
  const page = path.join(root, route, 'index.html');
  if (!fs.existsSync(page)) {
    errors.push(`Missing required internal page: ${route}`);
  }
}

for (const file of htmlFiles) {
  const relative = path.relative(root, file);
  const html = fs.readFileSync(file, 'utf8');

  const cookiebotCount = (
    html.match(
      /<script id="Cookiebot" src="https:\/\/consent\.cookiebot\.com\/uc\.js" data-cbid="d2ca8e0a-6a9c-471f-97e9-06ca1f4fdc80" data-blockingmode="auto" type="text\/javascript"><\/script>/g
    ) || []
  ).length;

  if (cookiebotCount !== 1) {
    errors.push(
      `${relative}: expected one exact Cookiebot script, found ${cookiebotCount}`
    );
  }

  if (
    /cookie-banner|cookie-preferences|gregDeskinCookieConsent|consent-analytics|consent-marketing/.test(html)
  ) {
    errors.push(`${relative}: legacy cookie interface remains`);
  }

  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/gi)]
    .map(match => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

  if (duplicates.length) {
    errors.push(
      `${relative}: duplicate IDs: ${[...new Set(duplicates)].join(', ')}`
    );
  }

  for (
    const match of html.matchAll(
      /<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>/gi
    )
  ) {
    const [tag, , href] = match;

    if (/^https?:\/\//i.test(href)) {
      if (!allowedExternalAnchor(href)) {
        errors.push(`${relative}: unapproved external anchor ${href}`);
      }

      if (
        /target=["']_blank["']/i.test(tag) &&
        !/rel=["'][^"']*noopener/i.test(tag)
      ) {
        errors.push(`${relative}: target=_blank without noopener: ${href}`);
      }

      continue;
    }

    if (/^(#|mailto:|tel:|sms:|javascript:)/i.test(href)) continue;

    const target = resolveLocal(file, href);
    if (target && !fs.existsSync(target)) {
      errors.push(`${relative}: broken local link ${href}`);
    }
  }

  for (const target of legacyDestinations) {
    if (
      html.toLowerCase().includes(
        `href="https://${target.toLowerCase()}`
      ) ||
      html.toLowerCase().includes(
        `href='https://${target.toLowerCase()}`
      )
    ) {
      errors.push(`${relative}: legacy destination remains: ${target}`);
    }
  }
}

const config = fs.readFileSync(
  path.join(root, 'assets/js/site-config.js'),
  'utf8'
);

const mainJs = fs.readFileSync(
  path.join(root, 'assets/js/main.js'),
  'utf8'
);

const formCorpus = `${config}\n${mainJs}\n${
  htmlFiles.map(file => fs.readFileSync(file, 'utf8')).join('\n')
}`;

if (!config.includes('youtube-nocookie.com/embed/f9FBwnZGEBE')) {
  errors.push('Existing introduction video URL is missing');
}

const homepage = fs.readFileSync(
  path.join(root, 'index.html'),
  'utf8'
);

const main = homepage.match(
  /<main\b[^>]*>([\s\S]*?)<\/main>/
)?.[1] || '';

const sectionClasses = [
  ...main.matchAll(/<section\b[^>]*class="([^"]+)"/g)
].map(match => match[1]);

if (
  sectionClasses.length !== 2 ||
  !sectionClasses[0].split(/\s+/).includes('hero') ||
  !sectionClasses[1].split(/\s+/).includes('product-section')
) {
  errors.push('Homepage must have only hero and products before the footer');
}

// Accept the new three-button player and the original full screen control.
const modernHeroControls = [
  'data-video-play',
  'data-video-mute',
  'data-video-fullscreen'
].every(marker => main.includes(marker));

const legacyHeroControls = main.includes('hero-video-fullscreen');

if (
  !main.includes('data-hero-video') ||
  !(modernHeroControls || legacyHeroControls)
) {
  errors.push('Homepage hero video or its controls are missing');
}

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');

  for (
    const form of html.matchAll(
      /<form\b[^>]*data-lead-form[^>]*>[\s\S]*?<\/form>/g
    )
  ) {
    if (
      !form[0].includes('action="/api/contact"') ||
      !form[0].includes('name="form_type"')
    ) {
      errors.push(
        `${path.relative(root, file)}: local form is not connected to the Brevo handler`
      );
    }
  }

  if (html.includes('formsubmit.co/')) {
    errors.push(
      `${path.relative(root, file)}: legacy form provider remains`
    );
  }
}

if (!config.includes('https://westcaplending.loanzify.io/')) {
  errors.push('Apply Now URL changed or missing');
}

for (const formHost of [
  '2-1-buydown-wcl-greg-deskin.secure-clix.com',
  '203k-loan-eligibility-wcl-greg-deskin.secure-clix.com',
  'conventional-loan-quote-wcl-greg-deskin.secure-clix.com',
  'down-payment-assistance-eligibility-wcl-greg-deskin.secure-clix.com',
  'dscr-loans-eligibility-checker-wcl-greg-deskin.secure-clix.com',
  'fha-loan-eligibility-checker-wcl-greg-deskin.secure-clix.com',
  'heloc-eligibility-checker-wcl-greg-deskin.secure-clix.com',
  'jumbo-loan-eligibility-checker-wcl-greg-deskin.secure-clix.com',
  'mortgage-rate-quote-wcl-greg-deskin.secure-clix.com',
  'new-construction-wcl-greg-deskin.secure-clix.com',
  'perfect-homebuying-path-wcl-greg-deskin.secure-clix.com',
  'refinance-rate-checker-wcl-greg-deskin.secure-clix.com',
  'reverse-mortgage-quote-wcl-greg-deskin.secure-clix.com',
  'self-employed-loan-eligibility-wcl-greg-deskin.secure-clix.com',
  'usda-loan-eligibility-checker-wcl-greg-deskin.secure-clix.com',
  'va-loans-eligibility-checker-wcl-greg-deskin.secure-clix.com'
]) {
  if (!formCorpus.includes(formHost)) {
    errors.push(`Existing form URL missing: ${formHost}`);
  }
}

if (
  legacyDestinations.some(target =>
    mainJs.toLowerCase().includes(`https://${target.toLowerCase()}`)
  )
) {
  errors.push('A legacy external destination remains in main.js');
}

const licensingHtml = fs.readFileSync(
  path.join(root, 'licensing/index.html'),
  'utf8'
);

if (!licensingHtml.includes('NMLS #1883221')) {
  errors.push('Licensing page does not identify NMLS #1883221');
}

const licenseTableBody = licensingHtml.match(
  /<table class="license-table">[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/
)?.[1] || '';

const licenseRowCount = (
  licenseTableBody.match(/<tr>/g) || []
).length;

if (licenseRowCount !== 52) {
  errors.push(
    `Licensing table should contain 52 supplied rows; found ${licenseRowCount}`
  );
}

if (
  fs.readFileSync(path.join(root, '_redirects'), 'utf8')
    .includes('westcapitallending.com')
) {
  errors.push('External WCL redirect remains in _redirects');
}

console.log(
  `Checked ${htmlFiles.length} HTML files and ` +
  `${requiredRoutes.length} required internal destinations.`
);

if (warnings.length) {
  console.log(`Warnings:\n- ${warnings.join('\n- ')}`);
}

if (errors.length) {
  console.error(
    `Validation failed (${errors.length}):\n- ${errors.join('\n- ')}`
  );
  process.exit(1);
}

console.log(
  'PASS: internal links, Cookiebot, video, forms, licensing and local files validated.'
);