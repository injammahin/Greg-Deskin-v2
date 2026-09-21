import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");

const COOKIEBOT_ID = "d2ca8e0a-6a9c-471f-97e9-06ca1f4fdc80";
const cookiebotScript = `<script id="Cookiebot" src="https://consent.cookiebot.com/uc.js" data-cbid="${COOKIEBOT_ID}" data-blockingmode="auto" type="text/javascript"></script>`;

const linkMap = new Map([
  ["https://westcapitallending.com/licensing", "/licensing/"],
  [
    "https://westcapitallending.com/loan-programs/conventional",
    "/loan-types/conventional/",
  ],
  ["https://westcapitallending.com/privacy-policy", "/privacy-policy/"],
  [
    "https://westcapitallending.com/sms-terms-conditions",
    "/sms-terms-conditions/",
  ],
  ["https://westcapitallending.com/team/Greg-Deskin", "/about/"],
  ["https://westcapitallending.com/terms-of-use", "/terms-of-use/"],
  [
    "https://westcapitallending.com/texas-complaint-recovery-fund-notice",
    "/texas-complaint-recovery-fund-notice/",
  ],
  ["https://TheLoanCenter.com/", "/resources/loan-education/"],
  [
    "https://selling-guide.fanniemae.com/sel/b2-1.1-01/occupancy-types",
    "/resources/occupancy-types/",
  ],
  [
    "https://selling-guide.fanniemae.com/sel/b2-2-03/multiple-financed-properties-same-borrower",
    "/resources/multiple-financed-properties/",
  ],
  [
    "https://www.consumerfinance.gov/ask-cfpb/where-can-i-find-information-on-programs-for-first-time-home-buyers-en-2156/",
    "/resources/first-time-buyer-programs/",
  ],
  [
    "https://www.consumerfinance.gov/owning-a-home/",
    "/resources/homebuyer-tools/",
  ],
  [
    "https://www.consumerfinance.gov/owning-a-home/explore/understand-the-different-kinds-of-loans-available/",
    "/resources/mortgage-loan-choices/",
  ],
  [
    "https://www.consumerfinance.gov/owning-a-home/loan-estimate/",
    "/resources/loan-estimate-guide/",
  ],
  [
    "https://www.experience.com/reviews/gregory-deskin-1756324251",
    "/reviews/experience/",
  ],
  [
    "https://www.fhfa.gov/data/conforming-loan-limit",
    "/resources/conforming-loan-limits/",
  ],
  [
    "https://www.google.com/search?q=West+Capital+Lending+reviews",
    "/reviews/google/",
  ],
  ["https://www.hud.gov/fha", "/resources/fha-housing-resources/"],
  [
    "https://www.hud.gov/helping-americans/buying-a-home",
    "/resources/home-buying-guide/",
  ],
  [
    "https://www.nmlsconsumeraccess.org/Home.aspx/MainSearch",
    "/verification/nmls/",
  ],
  [
    "https://www.rd.usda.gov/programs-services/single-family-housing-programs",
    "/resources/usda-housing-programs/",
  ],
  [
    "https://www.rd.usda.gov/programs-services/single-family-housing-programs/single-family-housing-guaranteed-loan-program",
    "/resources/usda-guaranteed-loan/",
  ],
  [
    "https://www.va.gov/housing-assistance/home-loans/eligibility/",
    "/resources/va-loan-eligibility/",
  ],
  [
    "https://www.va.gov/housing-assistance/home-loans/loan-types/",
    "/resources/va-loan-types/",
  ],
  ["https://gregdeskin.com/ada/", "/ada/"],
]);

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function allHtmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === ".git") return [];
    const target = path.join(dir, entry.name);
    return entry.isDirectory()
      ? allHtmlFiles(target)
      : target.endsWith(".html")
        ? [target]
        : [];
  });
}

function removeDivById(html, id) {
  const idPattern = new RegExp(`\\bid=["']${escapeRegExp(id)}["']`, "i");
  const idMatch = idPattern.exec(html);
  if (!idMatch) return html;
  const openStart = html.lastIndexOf("<div", idMatch.index);
  if (openStart < 0) return html;
  const tags = /<\/?div\b[^>]*>/gi;
  tags.lastIndex = openStart;
  let depth = 0;
  let match;
  while ((match = tags.exec(html))) {
    if (/^<div\b/i.test(match[0])) depth += 1;
    else depth -= 1;
    if (depth === 0)
      return html.slice(0, openStart) + html.slice(tags.lastIndex);
  }
  throw new Error(`Could not find closing div for #${id}`);
}

function rewriteMappedAnchors(html) {
  return html.replace(/<a\b[^>]*>/gi, (tag) => {
    const hrefMatch = tag.match(/\bhref\s*=\s*(["'])(.*?)\1/i);
    if (!hrefMatch) return tag;
    const mapped = linkMap.get(hrefMatch[2].replace(/&amp;/g, "&"));
    if (!mapped) return tag;
    let updated = tag.replace(hrefMatch[0], `href="${mapped}"`);
    updated = updated.replace(/\s+target\s*=\s*(["']).*?\1/gi, "");
    updated = updated.replace(/\s+rel\s*=\s*(["']).*?\1/gi, "");
    updated = updated.replace(
      /\s+data-external-direct(?:\s*=\s*(["']).*?\1)?/gi,
      "",
    );
    return updated;
  });
}

function installCookiebot(html) {
  let updated = removeDivById(
    removeDivById(html, "cookie-banner"),
    "cookie-preferences",
  );
  updated = updated.replace(
    /data-cookie-preferences(?:="")?/gi,
    'data-cookiebot-renew=""',
  );
  if (!updated.includes('id="Cookiebot"')) {
    updated = updated.replace(/<\/title>/i, `</title>\n${cookiebotScript}`);
  }
  return updated;
}

function replaceMain(relativePath, mainHtml) {
  const file = path.join(root, relativePath);
  const source = fs.readFileSync(file, "utf8");
  if (!/<main\b[\s\S]*?<\/main>/i.test(source))
    throw new Error(`No main element in ${relativePath}`);
  fs.writeFileSync(file, source.replace(/<main\b[\s\S]*?<\/main>/i, mainHtml));
}

const formLinks = {
  apply: "https://westcaplending.loanzify.io/",
  refinance: "https://refinance-rate-checker-wcl-greg-deskin.secure-clix.com/",
  heloc: "https://heloc-eligibility-checker-wcl-greg-deskin.secure-clix.com/",
  rate: "https://mortgage-rate-quote-wcl-greg-deskin.secure-clix.com/",
  reverse: "https://reverse-mortgage-quote-wcl-greg-deskin.secure-clix.com/",
};

function header() {
  return `<a class="skip-link" href="#main-content">Skip to main content</a>
<header class="site-header" data-header="">
<div class="container header-inner">
<a aria-label="Greg Deskin home" class="brand" href="/"><picture><source srcset="/assets/img/greg-deskin-logo.webp" type="image/webp"/><img alt="Greg Deskin Mortgage and Real Estate" height="240" src="/assets/img/greg-deskin-logo.png" width="720"/></picture></a>
<nav aria-label="Primary navigation" class="main-nav" id="main-nav">
<a href="/about/">About Us</a>
<a class="js-form-modal" data-modal-title="Refinance" href="${formLinks.refinance}">Refinance</a>
<a class="js-form-modal" data-modal-title="HELOC Eligibility" href="${formLinks.heloc}">HELOC</a>
<a href="/loan-types/">Loan Options</a>
<a href="/contact/">Contact Us</a>
</nav>
<a aria-label="Call Greg Deskin at 949 864 8178" class="header-phone" href="tel:+19498648178"><svg aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M8.5 12h7"></path></svg><span>(949) 864-8178</span></a>
<a class="btn btn-sm header-apply" href="${formLinks.apply}" rel="noopener" target="_blank">Apply Now</a>
<button aria-controls="main-nav" aria-expanded="false" aria-label="Open navigation" class="menu-toggle" id="menu-toggle"><span></span></button>
</div>
</header>`;
}

function footer() {
  return `<footer class="site-footer">
<div class="container">
<a aria-label="Greg Deskin home" class="footer-logo" href="/"><img alt="Greg Deskin Mortgage and Real Estate" height="240" src="/assets/img/greg-deskin-logo.webp" width="720"/></a>
<div class="footer-top">
<div class="footer-mission"><p>Our mission is to serve our customers with honesty, integrity and competence. Our goal is to provide home loans to our clients while providing them with competitive rates and closing costs. We help borrowers understand and work through the roadblocks that can arise while securing a loan.</p></div>
<div><h3>About Us</h3><ul><li><a href="/about/">About Greg</a></li><li><a href="/contact/">Contact Us</a></li><li><a href="/ada/">ADA Accessibility Statement</a></li><li><a data-open-schedule="" href="#">Schedule a Consultation</a></li></ul></div>
<div><h3>Loan Programs</h3><ul><li><a href="/loan-types/conventional/">Conventional</a></li><li><a href="/loan-types/fha/">FHA</a></li><li><a href="/loan-types/va/">VA</a></li><li><a href="/loan-types/investment-commercial/">Non-QM</a></li><li><a class="js-form-modal" data-modal-title="Interest Only Loans" href="${formLinks.rate}">Interest Only</a></li><li><a class="js-form-modal" data-modal-title="Reverse Mortgage" href="${formLinks.reverse}">Reverse Mortgage</a></li></ul></div>
<div><h3>Company Info</h3><ul><li>NMLS# 1566096</li><li>DRE# 02022356</li><li><a href="tel:+19498648178">Phone: (949) 864-8178</a></li><li><a href="mailto:GDeskin@WestCapitalLending.com">Email: GDeskin@WestCapitalLending.com</a></li><li><a href="/reviews/google/">Google Reviews</a></li><li><a href="/reviews/experience/">Experience.com Reviews</a></li><li><a href="/licensing/">Licensing</a></li><li><a href="/privacy-policy/">Privacy Policy</a></li><li><a href="/terms-of-use/">Terms of Use</a></li><li><a href="/sms-terms-conditions/">SMS Terms &amp; Conditions</a></li><li><a href="/cookie-policy/">Cookie Policy</a></li><li><a data-cookiebot-renew="" href="#">Do Not Sell or Share My Personal Information</a></li><li><a href="/texas-complaint-recovery-fund-notice/">Texas Complaint/Recovery Fund Notice</a></li><li>Address:<br/>17911 Von Karman Ave, Suite 400,<br/>Irvine CA 92614</li></ul></div>
</div>
<div class="footer-disclosures">
<p>Approval may be granted in five minutes but is ultimately subject to verification of income and employment, as well as verification that the property is in at least average condition with a property condition report. A five-business-day funding timeline assumes closing with a remote online notary and a loan amount below $400,000 that does not require an appraisal. Funding may take longer where local recording rules require an in-person closing or waiting period, or where the loan amount requires an appraisal.</p>
<p>The Fixed Rate Home Equity Line is an open-end product in which the full loan amount, less the origination fee, is drawn at origination. The initial draw has a fixed rate. Additional draws may be available as principal is repaid during the draw period. The rate for an additional draw is set when that draw is made and may be based on the prior calendar month's Wall Street Journal Prime Rate plus a fixed margin; it may therefore be higher than the initial-draw rate.</p>
</div>
<div class="footer-bottom">
<p><a href="/licensing/">License Information</a> — Review Greg Deskin and West Capital Lending licensing information.</p>
<p>WCL is an Equal Housing Lender. As prohibited by federal law, we do not discriminate on the basis of race, color, religion, national origin, sex, marital status, age where the applicant has capacity to contract, receipt of public-assistance income, or the good-faith exercise of rights under the Consumer Credit Protection Act. The federal agency administering compliance with these federal laws is the Federal Trade Commission, Equal Credit Opportunity, Washington, DC 20580.</p>
<div class="footer-bottom-links"><a class="footer-trust-link" href="/verification/nmls/"><span class="footer-trust-badge">NMLS</span><span>NMLS Licensing Summary</span></a><span class="equal-housing"><svg aria-hidden="true" class="equal-housing-icon" fill="none" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M10 45 50 12l40 33M22 42v42h56V42M35 54h30M35 68h30" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="7"></path></svg><span>Equal Housing Lender</span></span></div>
<p>Copyright © <span data-year="">2026</span> gregdeskin. All Rights Reserved. | NMLS# 1566096 DRE# 02022356</p>
</div>
</div>
</footer>
<div aria-label="Quick contact actions" class="mobile-cta"><a class="btn btn-outline" href="tel:+19498648178">Call Greg</a><a class="btn" href="${formLinks.apply}" rel="noopener" target="_blank">Apply Now</a></div>
<div aria-hidden="true" aria-labelledby="video-title" aria-modal="true" class="modal-backdrop" id="video-modal" role="dialog"><div class="modal video-modal"><div class="modal-head"><h2 id="video-title">Meet Greg Deskin</h2><button aria-label="Close video" class="modal-close" data-close-modal="">×</button></div><div class="modal-body" id="video-modal-body"></div></div></div>
<div aria-live="polite" class="toast" id="site-toast" role="status"><strong></strong><span></span></div>
<div aria-hidden="true" aria-labelledby="schedule-modal-title" aria-modal="true" class="modal-backdrop" id="schedule-modal" role="dialog"><div class="modal schedule-modal"><div class="modal-head"><h2 id="schedule-modal-title">Schedule a Consultation</h2><button aria-label="Close scheduler" class="modal-close" data-close-modal="">×</button></div><div class="modal-body"><div class="schedule-modal-intro"><p class="kicker">Choose a preferred time</p><p>Select a date and time that works for you. Greg’s team will confirm availability by email or phone.</p></div><form action="https://formsubmit.co/injammahin5507@gmail.com" class="form-card" data-lead-form="" data-native-submit="true" method="POST"><input name="_subject" type="hidden" value="New GregDeskin.com consultation scheduling request"/><input name="_template" type="hidden" value="table"/><input name="_captcha" type="hidden" value="true"/><input name="_autoresponse" type="hidden" value="Thank you for requesting a consultation with Greg Deskin's mortgage team. We received your preferred date and time and will contact you to confirm availability."/><input name="_next" type="hidden" value="https://gregdeskin.com/thank-you/"/><div class="form-grid"><div class="form-group"><label for="modal-schedule-name">Full name</label><input autocomplete="name" id="modal-schedule-name" name="name" required=""/></div><div class="form-group"><label for="modal-schedule-email">Email</label><input autocomplete="email" id="modal-schedule-email" name="email" required="" type="email"/></div><div class="form-group"><label for="modal-schedule-date">Preferred date</label><input id="modal-schedule-date" name="preferred_date" required="" type="date"/></div><div class="form-group"><label for="modal-schedule-time">Preferred time</label><select id="modal-schedule-time" name="preferred_time" required=""><option value="">Choose one</option><option>Morning</option><option>Afternoon</option><option>Evening</option><option>Any time</option></select></div><div class="form-group full"><label for="modal-schedule-topic">What would you like to discuss?</label><textarea id="modal-schedule-topic" name="discussion" placeholder="Purchase, refinance, home equity, investment or another question" rows="3"></textarea></div><div aria-hidden="true" class="honeypot"><label>Leave this field blank<input autocomplete="off" name="_honey" tabindex="-1"/></label></div><div class="form-group full"><button class="btn btn-lg btn-block" type="submit">Request This Consultation</button></div></div><p class="form-note">This is a scheduling request. Greg’s team will confirm availability before the appointment is final.</p></form></div></div></div>`;
}

function pageShell({
  route,
  title,
  description,
  eyebrow = "Mortgage education",
  lead,
  content,
  breadcrumb = "Learning Center",
}) {
  const canonical = `https://gregdeskin.com/${route.replace(/^\/+|\/+$/g, "")}/`;
  return `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1, viewport-fit=cover" name="viewport"/>
<title>${title} | Greg Deskin</title>
${cookiebotScript}
<meta content="${description}" name="description"/>
<meta content="index,follow,max-image-preview:large" name="robots"/>
<link href="${canonical}" rel="canonical"/>
<meta content="website" property="og:type"/><meta content="${title} | Greg Deskin" property="og:title"/><meta content="${description}" property="og:description"/><meta content="${canonical}" property="og:url"/>
<meta content="summary" name="twitter:card"/><meta content="#101010" name="theme-color"/>
<link href="/favicon-64.png" rel="icon" sizes="64x64" type="image/png"/><link href="/favicon.png" rel="apple-touch-icon"/><link href="/site.webmanifest" rel="manifest"/>
<link href="/assets/css/styles.css" rel="stylesheet"/>
<script defer src="/assets/js/site-config.js"></script><script defer src="/assets/js/main.js"></script>
<meta content="Greg Deskin, NMLS 1883221" name="author"/>
</head>
<body data-loan-drawer="enabled">
${header()}
<main id="main-content">
<section class="page-hero resource-page-hero"><div class="container"><nav aria-label="Breadcrumb" class="breadcrumbs"><a href="/">Home</a><span>›</span><a href="/resources/loan-education/">${breadcrumb}</a><span>›</span><span aria-current="page">${title}</span></nav><p class="kicker">${eyebrow}</p><h1>${title}</h1><p class="lead">${lead}</p></div></section>
<section class="section"><div class="container resource-page-layout">${resourceSidebar()}<article class="prose resource-article">${content}${standardCta()}${sourceNote()}</article></div></section>
</main>
${footer()}
</body>
</html>\n`;
}

function resourceSidebar() {
  return `<aside class="resource-directory" aria-label="Mortgage learning center"><p class="kicker">Learning center</p><h2>Borrower resources</h2><nav><a href="/resources/homebuyer-tools/">Homebuyer roadmap</a><a href="/resources/mortgage-loan-choices/">Compare loan choices</a><a href="/resources/loan-estimate-guide/">Read a Loan Estimate</a><a href="/resources/conforming-loan-limits/">2026 conforming limits</a><a href="/resources/first-time-buyer-programs/">First-time buyer help</a><a href="/resources/fha-housing-resources/">FHA resources</a><a href="/resources/usda-housing-programs/">USDA programs</a><a href="/resources/va-loan-types/">VA loan types</a></nav><a class="btn btn-sm" href="/contact/#lead-form">Ask Greg</a></aside>`;
}

function sourceNote(label = "Source review") {
  return `<div class="source-note"><strong>${label}</strong><p>This educational summary was prepared from the referenced official material and reviewed on September 13, 2026. Program rules, limits and eligibility can change. Your lender’s current underwriting requirements and official disclosures control.</p></div>`;
}

function standardCta() {
  return `<div class="content-cta"><p class="kicker">Personal guidance</p><h2>Want to discuss how this applies to you?</h2><p>Greg can help you compare current loan options, documentation, costs and timing for your property and financial goals.</p><div class="actions"><a class="btn" href="/contact/#lead-form">Ask Greg</a><a class="btn btn-outline" href="tel:+19498648178">Call (949) 864-8178</a></div></div>`;
}

function writePage(definition) {
  const directory = path.join(root, definition.route);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "index.html"), pageShell(definition));
}

const resourcePages = [
  {
    route: "resources/loan-education",
    title: "Mortgage Learning Center",
    description:
      "Internal mortgage education from Greg Deskin covering loan choices, buying a home, disclosures and program fundamentals.",
    eyebrow: "Start here",
    lead: "Use plain-language guides to prepare for a mortgage conversation, compare broad loan categories and understand the documents you may receive.",
    content: `<div class="info-grid"><div class="info-box"><span>Step 1</span><strong>Clarify your goal and budget</strong></div><div class="info-box"><span>Step 2</span><strong>Compare loan structures and costs</strong></div><div class="info-box"><span>Step 3</span><strong>Review disclosures before deciding</strong></div></div>
<h2>Choose a topic</h2><div class="resource-card-grid"><a class="card card-hover" href="/resources/homebuyer-tools/"><span>01</span><h3>Homebuyer roadmap</h3><p>Move from early budgeting through shopping, offers, inspections and closing.</p></a><a class="card card-hover" href="/resources/mortgage-loan-choices/"><span>02</span><h3>Mortgage choices</h3><p>Compare loan type, repayment term and fixed or adjustable interest structures.</p></a><a class="card card-hover" href="/resources/loan-estimate-guide/"><span>03</span><h3>Loan Estimate guide</h3><p>Understand projected payments, closing costs, cash to close and risk features.</p></a><a class="card card-hover" href="/resources/first-time-buyer-programs/"><span>04</span><h3>First-time buyer help</h3><p>Learn where assistance may be available and how to prepare before applying.</p></a><a class="card card-hover" href="/resources/fha-housing-resources/"><span>05</span><h3>FHA resources</h3><p>Review FHA insurance basics, occupancy, mortgage insurance and counseling.</p></a><a class="card card-hover" href="/resources/usda-housing-programs/"><span>06</span><h3>USDA programs</h3><p>Explore rural purchase, repair, direct and guaranteed housing programs.</p></a><a class="card card-hover" href="/resources/va-loan-types/"><span>07</span><h3>VA loan options</h3><p>Understand purchase, refinance and Native American Direct Loan options.</p></a><a class="card card-hover" href="/resources/conforming-loan-limits/"><span>08</span><h3>2026 loan limits</h3><p>See how conforming and jumbo categories relate to location and loan amount.</p></a></div>
<h2>Loan programs available through Greg</h2><p>Greg works through West Capital Lending’s broad lender network. Depending on borrower qualifications, property, occupancy and location, potential options may include conventional, FHA, VA, USDA, jumbo, high-balance, refinance, home-equity, self-employed, DSCR, commercial and private-money programs.</p>
<div class="video-resource-card"><div><p class="kicker">Meet Greg</p><h2>Start with a personal introduction</h2><p>The video is loaded only after you choose to play it.</p></div><button class="btn btn-lg" data-open-video="" type="button">Play introduction video</button></div>
<h2>Education is not an approval</h2><p>These pages explain general concepts. They do not quote a rate, determine eligibility, approve credit or replace the Loan Estimate and other disclosures for a specific transaction. Current agency rules, investor requirements and lender overlays can affect every scenario.</p>`,
  },
  {
    route: "resources/occupancy-types",
    title: "Mortgage Occupancy Types",
    description:
      "Understand principal residence, second-home and investment-property occupancy classifications for conventional mortgages.",
    lead: "Occupancy describes how a borrower intends to use a property. That classification can affect eligibility, pricing, down payment, reserves and documentation.",
    content: `<div class="info-grid"><div class="info-box"><span>Primary home</span><strong>Occupied as the borrower’s main residence</strong></div><div class="info-box"><span>Second home</span><strong>Borrower uses it for part of the year</strong></div><div class="info-box"><span>Investment</span><strong>Owned but not occupied by the borrower</strong></div></div>
<h2>Principal residence</h2><p>A principal residence is normally the home a borrower occupies as the primary residence. In a transaction with multiple borrowers, program rules may permit one borrower to occupy and take title. Special provisions may also apply to active-duty military members who are temporarily absent, or to certain family arrangements involving a dependent adult child or a parent who cannot qualify independently.</p>
<h2>Second home</h2><p>A second home generally must be a one-unit dwelling suitable for year-round use. The borrower must occupy it during part of the year and retain control over it. A property operating as a timeshare or controlled by a management agreement is generally not treated as a second home. Rental income identified from the property may be subject to specific treatment and ordinarily cannot be used for qualification merely because the property is called a second home.</p>
<h2>Investment property</h2><p>An investment property is owned but not occupied by the borrower. Conventional investment-property loans commonly involve additional pricing adjustments, reserve requirements and underwriting analysis. Rental-income documentation and the borrower’s experience or existing financed properties may also matter.</p>
<h2>Why accuracy matters</h2><ul><li>Occupancy is stated in the application and security documents.</li><li>The intended use must be honest and consistent with the transaction.</li><li>Misrepresenting occupancy can constitute mortgage fraud.</li><li>Plans can change, but the stated intent at closing must be genuine and supportable.</li></ul>
<h2>Questions to discuss</h2><ul><li>How soon will you occupy the property?</li><li>Will anyone rent it or operate a business from it?</li><li>Is it a one-unit home, multi-unit property or group home?</li><li>Will another borrower occupy the property?</li><li>Do you already own or finance other real estate?</li></ul>`,
  },
  {
    route: "resources/multiple-financed-properties",
    title: "Multiple Financed Properties",
    description:
      "A borrower-friendly overview of Fannie Mae property-count and reserve considerations for borrowers financing more than one property.",
    lead: "Owning several properties does not automatically prevent financing, but the number, occupancy and debt structure can change underwriting and reserve requirements.",
    content: `<div class="notice"><strong>Current guide snapshot</strong><p>The source policy reviewed for this page was Fannie Mae Selling Guide topic B2-2-03, dated November 5, 2025.</p></div>
<h2>General property-count framework</h2><div class="table-wrap"><table class="content-table"><thead><tr><th>Subject occupancy</th><th>Transaction</th><th>General maximum</th></tr></thead><tbody><tr><td>Principal residence</td><td>Other than HomeReady</td><td>No stated financed-property limit under this topic</td></tr><tr><td>Principal residence</td><td>HomeReady</td><td>2 through DU or manual underwriting</td></tr><tr><td>Second home or investment property</td><td>All covered transactions</td><td>10 through Desktop Underwriter</td></tr></tbody></table></div>
<h2>What normally counts</h2><ul><li>One- to four-unit residential properties for which a borrower is personally obligated on financing.</li><li>Each financed property, not each individual mortgage secured by it.</li><li>A financed principal residence.</li><li>The combined total for all borrowers, while a jointly financed property is counted once.</li></ul>
<h2>Common exclusions from this specific limit</h2><p>The reviewed policy excludes commercial real estate, properties with more than four residential units, timeshares, vacant lots, and certain manufactured homes financed as personal property. A lender still evaluates the related debts, liabilities and overall risk under other requirements.</p>
<h2>Reserves and documentation</h2><p>Additional reserves can apply when a borrower will own multiple financed properties, especially for second-home and investment transactions. Prepare complete real-estate-owned schedules, mortgage statements, tax and insurance costs, lease information, ownership percentages and proof of liquid assets. Incorrect property counts should be corrected before the underwriting case is resubmitted.</p>`,
  },
  {
    route: "resources/first-time-buyer-programs",
    title: "First-Time Homebuyer Programs",
    description:
      "Learn how first-time homebuyers can identify down-payment, closing-cost, counseling and mortgage-program assistance.",
    lead: "First-time buyer assistance varies by state, county, city, employer, housing agency and lender. The right starting point is to identify local programs and compare the complete financing cost.",
    content: `<div class="info-grid"><div class="info-box"><span>Possible help</span><strong>Down payment or closing costs</strong></div><div class="info-box"><span>Possible source</span><strong>State and local housing agencies</strong></div><div class="info-box"><span>Preparation</span><strong>Education, budget and documentation</strong></div></div>
<h2>Types of assistance</h2><ul><li>Grants that may not require repayment when conditions are satisfied.</li><li>Deferred or forgivable subordinate loans tied to occupancy or ownership periods.</li><li>Low-interest second loans for down payment or closing costs.</li><li>Mortgage-credit or tax-related programs where offered.</li><li>Special programs for public-service employees, veterans or targeted communities.</li></ul>
<h2>Where to look</h2><p>Programs may be administered by state housing finance agencies, local governments, housing authorities, nonprofit organizations or participating lenders. HUD-approved housing counselors can help buyers understand local options and the obligations attached to assistance.</p>
<h2>Questions to ask before accepting assistance</h2><ul><li>Does the assistance have to be repaid when the home is sold or refinanced?</li><li>Is any amount forgiven over time?</li><li>Are there income, purchase-price, property-location or occupancy limits?</li><li>Is homebuyer education required?</li><li>Does the program restrict the first mortgage, rate or lender?</li><li>How does it change cash to close and the long-term cost?</li></ul>
<h2>Prepare before applying</h2><p>Review credit reports, build a realistic housing budget, document income and assets, avoid unexplained deposits, and compare Loan Estimates. A first-time buyer program can help with upfront funds, but it does not make an unaffordable monthly payment sustainable.</p>
<div class="notice"><strong>Housing-counseling help</strong><p>The CFPB directs consumers to HUD-approved housing counseling agencies and the national HOPE Hotline at (888) 995-HOPE (4673) for homebuying guidance.</p></div>`,
  },
  {
    route: "resources/homebuyer-tools",
    title: "Homebuyer Roadmap",
    description:
      "A step-by-step mortgage and homebuying roadmap covering preparation, shopping, comparison, inspection and closing.",
    lead: "A strong purchase process separates the home decision from the financing decision and gives you checkpoints before committing money or signing documents.",
    content: `<ol class="numbered-steps"><li><div><strong>Prepare your budget</strong><p>Estimate a comfortable total housing payment, not only principal and interest. Include property taxes, homeowners insurance, mortgage insurance, association dues, maintenance and utilities.</p></div></li><li><div><strong>Review credit and documents</strong><p>Check credit reports and collect income, employment, bank, asset, debt and housing records. Ask how large deposits or changes in employment should be documented.</p></div></li><li><div><strong>Explore loan choices</strong><p>Compare conventional, FHA, VA, USDA and other applicable structures. Consider down payment, mortgage insurance, rate type, term, upfront fees and long-term cost.</p></div></li><li><div><strong>Request and compare offers</strong><p>Compare written Loan Estimates with the same loan amount, term, rate-lock assumptions and timing. Review origination charges, lender credits, projected payments and cash to close.</p></div></li><li><div><strong>Protect the purchase</strong><p>Understand contingencies, obtain an independent inspection, review title and insurance needs, and avoid new debts or unexplained financial changes during underwriting.</p></div></li><li><div><strong>Prepare for closing</strong><p>Compare the Closing Disclosure with the Loan Estimate, confirm final funds using a trusted phone number and read every document before signing.</p></div></li></ol>
<h2>Closing-wire fraud warning</h2><div class="notice"><strong>Verify instructions independently.</strong><p>Criminals may impersonate a real-estate, title or lending professional shortly before closing. Never rely only on emailed wire instructions. Confirm the recipient and account details through a trusted telephone number you already know.</p></div>
<h2>Useful questions for a lender</h2><ul><li>What can change the quoted rate or costs?</li><li>Is the interest rate locked, and until when?</li><li>Which services can I shop for?</li><li>What conditions remain before approval and closing?</li><li>Could the payment change because of taxes, insurance, mortgage insurance or an adjustable rate?</li></ul>`,
  },
  {
    route: "resources/mortgage-loan-choices",
    title: "Understanding Mortgage Loan Choices",
    description:
      "Compare mortgage loan type, repayment term and fixed or adjustable interest-rate structures.",
    lead: "Every mortgage combines three major choices: the program or loan type, the repayment term and the way the interest rate behaves.",
    content: `<h2>1. Loan type</h2><div class="comparison-grid"><div class="card"><h3>Conventional</h3><p>Not insured by a federal housing agency. Requirements and mortgage-insurance treatment depend on the selected conforming or non-conforming program.</p></div><div class="card"><h3>Government-backed</h3><p>FHA, VA and USDA programs serve different borrowers and properties. They have agency rules, fees or insurance features in addition to lender underwriting.</p></div><div class="card"><h3>Specialized</h3><p>Jumbo, bank-statement, DSCR, renovation, construction, home-equity and other programs may address needs not covered by a standard conforming loan.</p></div></div>
<h2>2. Repayment term</h2><div class="table-wrap"><table class="content-table"><thead><tr><th>Shorter term</th><th>Longer term</th></tr></thead><tbody><tr><td>Usually higher monthly principal and interest</td><td>Usually lower monthly principal and interest</td></tr><tr><td>Often a lower rate</td><td>Often a higher rate</td></tr><tr><td>Typically less total interest if held to payoff</td><td>Typically more total interest if held to payoff</td></tr><tr><td>Builds equity faster</td><td>Provides more monthly-payment flexibility</td></tr></tbody></table></div>
<h2>3. Interest-rate structure</h2><div class="pros-cons"><div class="pros"><h3>Fixed rate</h3><p>The rate and scheduled principal-and-interest payment do not change. Taxes, insurance, mortgage insurance and other components of the total payment may still change.</p></div><div class="cons"><h3>Adjustable rate</h3><p>The rate is generally fixed for an initial period and can then change under the note’s index, margin, adjustment schedule and caps. Model the maximum possible payment, not only the starting payment.</p></div></div>
<h2>Compare the complete cost</h2><p>A lower rate does not always mean a lower-cost loan. Compare points, lender credits, origination fees, mortgage insurance, third-party costs, prepayment features, the time you expect to keep the loan and how much cash you must bring to closing.</p>`,
  },
  {
    route: "resources/loan-estimate-guide",
    title: "How to Read a Loan Estimate",
    description:
      "Review the key sections of a mortgage Loan Estimate, including projected payments, closing costs and cash to close.",
    lead: "The Loan Estimate is a three-page disclosure describing the mortgage requested. A lender generally must provide it within three business days after receiving the six application items that trigger the requirement.",
    content: `<div class="info-grid"><div class="info-box"><span>Page 1</span><strong>Loan terms and projected payment</strong></div><div class="info-box"><span>Page 2</span><strong>Closing-cost detail</strong></div><div class="info-box"><span>Page 3</span><strong>Comparisons and loan contacts</strong></div></div>
<h2>Start with identity and loan terms</h2><ul><li>Confirm your name, property address, sale price and loan amount.</li><li>Check the purpose, product, term and loan type.</li><li>Confirm whether the rate is locked and when the lock expires.</li><li>Look for prepayment penalties or balloon payments.</li></ul>
<h2>Understand the monthly payment</h2><p>Principal and interest are only part of the housing payment. Review mortgage insurance, estimated escrow, property taxes, homeowners insurance and any amounts that are not escrowed. An adjustable-rate loan includes additional projected-payment and adjustment information.</p>
<h2>Review closing costs and cash to close</h2><p>Page 2 separates origination charges, services the borrower cannot shop for, services the borrower can shop for, taxes, prepaids, initial escrow and other costs. Lender credits reduce cash due but may be associated with a different rate. Estimated cash to close combines costs with down payment, deposits, credits and financing.</p>
<h2>Compare offers consistently</h2><ul><li>Use the same loan amount, term, product and lock assumptions.</li><li>Compare lender-controlled origination charges and points.</li><li>Separate required third-party costs from lender pricing.</li><li>Ask why any item differs from what you discussed.</li><li>Do not choose solely from the headline interest rate.</li></ul>
<div class="notice"><strong>Potentially risky features</strong><p>A prepayment penalty can charge you for certain early payoffs. A balloon payment creates a large final payment. An adjustable rate can increase after its initial period. Ask for alternatives if a feature does not fit your plans.</p></div>`,
  },
  {
    route: "reviews/experience",
    title: "Experience.com Review Summary",
    description:
      "An internal snapshot of Gregory Deskin’s Experience.com profile, credentials and published customer feedback.",
    eyebrow: "Review transparency",
    breadcrumb: "Client Reviews",
    lead: "This page preserves a dated internal summary of Greg’s public professional profile so visitors can review the information without leaving this website.",
    content: `<div class="review-summary-hero"><div><span class="rating-stars">★★★★★</span><strong>5.0</strong><p>2 published reviews in the snapshot reviewed September 13, 2026</p></div><dl><dt>Professional</dt><dd>Gregory Deskin</dd><dt>Role</dt><dd>Branch Manager</dd><dt>NMLS</dt><dd>1883221</dd><dt>California DRE</dt><dd>02373263</dd></dl></div>
<h2>Published feedback</h2><div class="grid-2"><article class="card quote-card"><blockquote>“Unbelievable customer service.”</blockquote><cite>David H. · November 5, 2025 · 5.0</cite></article><article class="card quote-card"><blockquote>“Polite, Professional.”</blockquote><cite>Edward T. · September 9, 2025 · 5.0</cite></article></div>
<h2>Professional profile snapshot</h2><p>The profile identifies Greg with West Capital Lending in Irvine, California and lists conventional, FHA, VA, multifamily, high-balance, jumbo, self-employed, investor, commercial, private-money and home-equity experience. It also lists California State University, Long Beach education, NMLS and VFW memberships, and 1991 as the year started.</p>
<div class="notice"><strong>Dated review record</strong><p>Ratings, review counts, profile details and third-party moderation status can change. This internal page is a September 13, 2026 snapshot and is not a live feed from Experience.com.</p></div><p><a class="btn btn-outline-dark" href="/reviews/">View all internal reviews</a></p>`,
  },
  {
    route: "resources/conforming-loan-limits",
    title: "2026 Conforming Loan Limits",
    description:
      "Understand the 2026 FHFA conforming loan limits, high-cost ceilings and how loan amount and county affect conventional financing.",
    lead: "The Federal Housing Finance Agency sets annual limits on the original balance of mortgages Fannie Mae and Freddie Mac may acquire.",
    content: `<div class="limit-stat-grid"><div><span>2026 baseline</span><strong>$832,750</strong><p>One-unit property in most U.S. counties</p></div><div><span>High-cost ceiling</span><strong>$1,249,125</strong><p>One-unit maximum in qualifying high-cost areas</p></div><div><span>Special-area ceiling</span><strong>$1,873,675</strong><p>One-unit ceiling under special provisions</p></div></div>
<h2>What conforming means</h2><p>A conforming loan meets applicable Fannie Mae or Freddie Mac purchase requirements, including the loan limit for the property’s county and unit count. A loan above the applicable limit is generally considered jumbo and follows different investor criteria.</p>
<h2>How the 2026 limits work</h2><p>The 2026 baseline for a one-unit property is $832,750. In qualifying high-cost areas, the limit can rise according to local median home values, up to $1,249,125. Special statutory provisions apply in Alaska, Hawaii, Guam and the U.S. Virgin Islands: the one-unit baseline is $1,249,125 and the ceiling is $1,873,675.</p>
<h2>Do not confuse loan amount with purchase price</h2><p>The conforming limit applies to the mortgage’s original principal balance, not directly to the home price. A buyer’s down payment can make the purchase price higher than the applicable loan limit while keeping the mortgage within conforming limits.</p>
<h2>Confirm the exact county and unit count</h2><p>Limits vary for two-, three- and four-unit properties and may vary by county. Before relying on a number, confirm the property address, number of units, calendar year and the applicable agency or investor program.</p>
<div class="notice"><strong>2026 source figures</strong><p>FHFA announced these values on November 25, 2025. The agency reported that the baseline rose by $26,250 from 2025 and that most counties received higher limits.</p></div>`,
  },
  {
    route: "reviews/google",
    title: "Google Review Summary",
    description:
      "An internal, dated summary of the Google rating displayed for West Capital Lending on GregDeskin.com.",
    eyebrow: "Review transparency",
    breadcrumb: "Client Reviews",
    lead: "This page records the Google review summary displayed on the website without sending visitors to an external search-results page.",
    content: `<div class="google-rating-panel"><span class="google-g">G</span><div><div class="rating-stars">★★★★★</div><strong>4.8 out of 5</strong><p>Based on 3,728 reviews in the website snapshot</p></div></div>
<h2>What this rating represents</h2><p>The homepage displays a Google summary for West Capital Lending. It is a manually maintained snapshot rather than a live Google feed. The displayed count and average can change as reviews are added, removed or re-evaluated.</p>
<h2>How to evaluate mortgage reviews</h2><ul><li>Look for repeated themes in communication, clarity, responsiveness and closing execution.</li><li>Separate feedback about an individual professional from company-wide reviews.</li><li>Consider both positive and critical experiences instead of relying only on an average score.</li><li>Confirm credentials and written loan disclosures independently of review content.</li></ul>
<h2>Greg-specific feedback</h2><p>Greg’s dated Experience.com snapshot shows two individual reviews with a 5.0 average. The internal Experience.com summary identifies the review dates, reviewer initials and brief published comments.</p><p><a class="btn btn-outline-dark" href="/reviews/experience/">View Greg’s review summary</a></p>
<div class="notice"><strong>Snapshot date</strong><p>The 4.8 rating and 3,728-review count are the values displayed by GregDeskin.com in the source website snapshot. They are not represented as real-time Google data.</p></div>`,
  },
  {
    route: "resources/fha-housing-resources",
    title: "FHA and Housing Resources",
    description:
      "A borrower-focused guide to FHA-insured mortgages, approved lenders, mortgage insurance, occupancy and HUD counseling resources.",
    lead: "The Federal Housing Administration insures eligible mortgages made by approved lenders. FHA insurance protects the lender; the borrower remains responsible for the loan.",
    content: `<div class="info-grid"><div class="info-box"><span>Program</span><strong>Government-insured mortgage</strong></div><div class="info-box"><span>Down payment</span><strong>As low as 3.5% for eligible borrowers</strong></div><div class="info-box"><span>Application</span><strong>Through an FHA-approved lender</strong></div></div>
<h2>What FHA insurance does</h2><p>FHA insurance can expand access for borrowers who meet agency and lender requirements but may have a smaller down payment or different credit profile than some conventional programs permit. The lender underwrites the borrower and property under FHA rules and any lawful lender overlays.</p>
<h2>Important borrower considerations</h2><ul><li>The home generally must be the borrower’s principal residence.</li><li>An FHA appraisal evaluates value and minimum property requirements; it is not a substitute for an independent home inspection.</li><li>Upfront and annual mortgage-insurance premiums may apply.</li><li>Loan limits depend on property location and number of units.</li><li>Credit, income, debts, assets and legal residency eligibility are reviewed.</li></ul>
<h2>Housing counseling and homeowner support</h2><p>HUD-approved housing counseling agencies can provide education on buying, budgeting, reverse mortgages and foreclosure avoidance. HUD also maintains resources for existing FHA borrowers, disaster assistance, home repairs and mortgage-insurance-premium refunds.</p>
<h2>Compare FHA with alternatives</h2><p>A lower down payment does not automatically make FHA the least expensive choice. Compare rate, upfront premium, annual mortgage insurance, expected holding period, conventional alternatives and the full cash-to-close calculation.</p>
<div class="notice"><strong>Current-policy reminder</strong><p>FHA requirements change through handbook updates, mortgagee letters and program notices. A qualified borrower and eligible property must satisfy the rules in effect for the transaction.</p></div>`,
  },
  {
    route: "resources/home-buying-guide",
    title: "Home Buying Guide",
    description:
      "A complete internal guide to affordability, borrower rights, mortgage shopping, inspections, insurance and closing.",
    lead: "Buying a home works best as a sequence of informed decisions: affordability, financing, property review, legal protections and a carefully verified closing.",
    content: `<h2>1. Decide what you can afford</h2><p>Start with income, debts, credit, down payment, interest rate and the full monthly housing expense. Keep emergency savings and likely repairs in the plan instead of using every available dollar at closing.</p>
<h2>2. Know your rights</h2><p>Fair-lending and settlement laws protect consumers from prohibited discrimination and certain abusive practices. Ask questions when costs or terms differ from what was discussed, and keep copies of advertisements, estimates and communications.</p>
<h2>3. Shop for a mortgage</h2><p>Talk with more than one lender or compare multiple investor options. Review loan type, term, rate structure, points, lender credits, mortgage insurance, closing costs and cash to close on a consistent basis.</p>
<h2>4. Explore assistance</h2><p>State and local programs may help eligible buyers with down payment, closing costs or counseling. Understand repayment, forgiveness, income, property and occupancy conditions before accepting assistance.</p>
<h2>5. Evaluate the property</h2><p>Use an independent inspection to understand condition and likely repairs. Review disclosures, title, insurance availability, taxes, association obligations, zoning and any specialist inspections appropriate for the property.</p>
<h2>6. Make and protect the offer</h2><p>Discuss financing, appraisal, inspection and other contingencies with qualified real-estate and legal professionals. Keep earnest money and deadline obligations clear.</p>
<h2>7. Close carefully</h2><p>Review the Closing Disclosure, compare it with the Loan Estimate, ask about unexplained changes and confirm wiring instructions through a trusted channel. Read before signing and keep the complete closing package.</p>
<div class="notice"><strong>HUD’s core affordability factors</strong><p>Income, credit profile, recurring monthly expenses, down payment and interest rate all influence affordability. Approval amount and comfortable budget are not always the same.</p></div>`,
  },
  {
    route: "verification/nmls",
    title: "NMLS Licensing Summary",
    description:
      "Internal NMLS licensing summary for Gregory Lee Deskin, NMLS 1883221, representing West Capital Lending, Inc.",
    eyebrow: "Professional verification",
    breadcrumb: "Licensing",
    lead: "Gregory Lee Deskin is identified in the supplied NMLS summary as NMLS #1883221 and authorized to represent West Capital Lending, Inc., NMLS #1566096.",
    content: `<div class="license-identity-card"><div><span>Individual</span><strong>Gregory Lee Deskin</strong><small>NMLS #1883221</small></div><div><span>Company</span><strong>West Capital Lending, Inc.</strong><small>NMLS #1566096</small></div><div><span>Main office</span><strong>Irvine, California</strong><small>17911 Von Karman Avenue, Suite 400</small></div></div>
<h2>What NMLS information means</h2><p>NMLS is a licensing and registration system used by participating financial-services regulators. An NMLS identifier helps consumers distinguish a professional or company from others with similar names. It does not replace review of the current license status, sponsorship, authorized activities and property jurisdiction.</p>
<h2>Supplied authorization summary</h2><p>The attached record, retrieved September 9, 2026, lists activity across all 50 states and the District of Columbia. Some jurisdictions are shown for mortgage-loan-origination plus commercial, SBA and DSCR activity; others are shown only for commercial, SBA and DSCR activity. California also includes a real-estate salesperson entry.</p>
<h2>How to use the licensing table</h2><ul><li>Find the state where the property is located.</li><li>Confirm that the listed activity matches the requested transaction.</li><li>Ask Greg’s team to confirm current sponsorship and availability before relying on the summary.</li><li>Use the complete internal licensing table for the supplied jurisdiction-by-jurisdiction details.</li></ul><p><a class="btn" href="/licensing/#state-authorizations">View all state authorizations</a></p>
<div class="notice"><strong>Important</strong><p>Licenses, sponsorships and authorized activities can change. This internal page records the supplied September 9, 2026 summary and should be refreshed whenever a newer authoritative record is available.</p></div>`,
  },
  {
    route: "resources/usda-housing-programs",
    title: "USDA Single-Family Housing Programs",
    description:
      "Explore USDA Rural Development programs for eligible rural homebuyers, homeowners, repairs and nonprofit housing partners.",
    lead: "USDA Rural Development supports affordable housing in eligible rural areas through direct loans, guaranteed loans, repair assistance and community-partner programs.",
    content: `<div class="comparison-grid"><div class="card"><h3>Direct home loans</h3><p>Designed for eligible low- and very-low-income applicants. Payment assistance may reduce the effective mortgage payment for a period, and applications are made directly through Rural Development.</p></div><div class="card"><h3>Guaranteed loans</h3><p>Made by approved private lenders for eligible low- and moderate-income households. Qualified transactions may offer 100% financing for an eligible primary residence.</p></div><div class="card"><h3>Repair assistance</h3><p>Loans or grants may help eligible low- and very-low-income homeowners repair, improve or modernize homes in qualifying rural locations.</p></div></div>
<h2>General eligibility themes</h2><ul><li>The property must be in a USDA-eligible area for the selected program.</li><li>Household income is compared with limits for the location and household size.</li><li>The home generally must be modest, safe and used as the primary residence.</li><li>Credit and repayment ability are evaluated under the applicable program.</li></ul>
<h2>Homebuyer program differences</h2><p>The Direct program is administered by Rural Development and may provide payment assistance; its typical term can be 33 years. The Guaranteed program is delivered through approved lenders and generally uses a 30-year fixed-rate structure. Neither description guarantees that a borrower, property or requested loan amount qualifies.</p>
<h2>Homeowner and community programs</h2><p>USDA also identifies repair loans and grants, disaster assistance, mutual self-help grants, rural housing-site loans and housing-preservation grants. These programs serve different applicants and are not interchangeable with a home-purchase mortgage.</p>`,
  },
  {
    route: "resources/usda-guaranteed-loan",
    title: "USDA Guaranteed Loan Program",
    description:
      "Understand USDA Section 502 Guaranteed Loans, including rural-area, income, occupancy, financing and lender requirements.",
    lead: "The Section 502 Guaranteed Loan Program helps approved lenders finance eligible low- and moderate-income households purchasing qualifying primary residences in rural areas.",
    content: `<div class="info-grid"><div class="info-box"><span>Financing</span><strong>Up to 100% for qualified transactions</strong></div><div class="info-box"><span>Term</span><strong>30-year fixed-rate loan</strong></div><div class="info-box"><span>Application</span><strong>Through an approved lender</strong></div></div>
<h2>Core borrower requirements</h2><ul><li>Household income generally cannot exceed 115% of the applicable median household income.</li><li>The borrower must occupy the home as the primary residence.</li><li>The applicant must meet applicable citizenship or qualified-status rules.</li><li>The borrower must demonstrate willingness and ability to manage debt.</li><li>Any lender-specific, lawful underwriting standards also apply.</li></ul>
<h2>Eligible property and uses</h2><p>Funds may support an eligible new or existing primary residence, including certain detached, attached, condominium, planned-unit, modular or manufactured homes. Eligible uses can include purchase, construction, acquisition-related repairs, reasonable closing costs and certain essential equipment or site-preparation costs. Income-producing properties are not eligible under the basic program description.</p>
<h2>Rural location and income review</h2><p>USDA determines geographic and income eligibility. A mailing address that appears rural is not enough, and some communities near metropolitan areas may qualify while others do not. Household income can differ from the income a lender uses to calculate repayment ability.</p>
<h2>Rates, guarantee and fees</h2><p>Private lenders set interest rates. USDA provides a 90% loan-note guarantee to approved lenders, reducing lender risk. Program guarantee fees may apply even though traditional private mortgage insurance is not used.</p>
<div class="notice"><strong>No-money-down does not mean no closing cash</strong><p>Qualified borrowers may finance up to 100% of eligible value, but appraisal differences, non-allowable costs, deposits and transaction structure can still affect cash required at closing.</p></div>`,
  },
  {
    route: "resources/va-loan-eligibility",
    title: "VA Home Loan Eligibility",
    description:
      "Understand VA home-loan eligibility, service requirements, Certificates of Eligibility and lender underwriting.",
    lead: "A Certificate of Eligibility confirms that service history supports access to a VA home-loan benefit. It does not by itself approve a mortgage.",
    content: `<div class="info-grid"><div class="info-box"><span>Evidence</span><strong>Certificate of Eligibility</strong></div><div class="info-box"><span>Benefit basis</span><strong>Qualifying service or spouse status</strong></div><div class="info-box"><span>Loan approval</span><strong>VA and lender requirements</strong></div></div>
<h2>Who may qualify</h2><p>Eligibility may be available to active-duty service members, Veterans, National Guard members, Reserve members and certain surviving spouses. Limited additional categories can qualify under federal law. The minimum service standard depends on the service period, duty status and discharge circumstances.</p>
<h2>Selected current service benchmarks</h2><ul><li>Active-duty service members may meet the minimum after 90 continuous days.</li><li>For many Veterans whose service began after August 2, 1990, the standard is generally 24 continuous months, the full called period of at least 90 days, or an applicable exception.</li><li>National Guard and Reserve eligibility can arise through qualifying active-duty service or six creditable years with continuing service, honorable discharge or retirement.</li><li>A service-connected disability or another qualifying discharge reason may create an exception to the usual minimum.</li></ul>
<h2>Certificate of Eligibility</h2><p>A borrower can request a COE or ask a lender to obtain it. The COE shows available entitlement information used in the transaction. Prior use of the benefit, an outstanding VA loan or a previous loss can affect entitlement and down-payment calculations.</p>
<h2>Mortgage underwriting still applies</h2><p>The lender evaluates income, residual income, debts, credit history, occupancy and property acceptability. The property is generally intended as the borrower’s home. Lenders may impose additional lawful standards beyond VA’s minimum requirements.</p>
<div class="notice"><strong>Complex service histories</strong><p>Applicants with short service, discharge questions, surviving-spouse status or prior VA-loan use should obtain a current COE determination rather than relying only on a general summary.</p></div>`,
  },
  {
    route: "resources/va-loan-types",
    title: "VA Home Loan Types",
    description:
      "Compare VA-backed purchase, cash-out refinance and IRRRL options with the Native American Direct Loan program.",
    lead: "VA offers one direct-loan program and several VA-backed programs to buy, build, improve or refinance a qualifying home in the United States and its territories.",
    content: `<div class="comparison-grid"><div class="card"><h3>VA-backed purchase loan</h3><p>Helps eligible borrowers purchase a home through a private lender. Many qualified VA purchase loans close without a down payment, subject to entitlement, value and lender approval.</p></div><div class="card"><h3>Cash-out refinance</h3><p>May replace an existing mortgage and, where eligible, provide cash from equity. The complete cost and effect on the borrower’s balance should be reviewed carefully.</p></div><div class="card"><h3>IRRRL</h3><p>The Interest Rate Reduction Refinance Loan is for an existing VA-backed loan and is intended to reduce or stabilize the payment under applicable benefit and recoupment rules.</p></div><div class="card"><h3>NADL</h3><p>The Native American Direct Loan is made directly by VA for eligible Native American Veterans, or qualifying spouses, for homes on federal trust land.</p></div></div>
<h2>VA-backed versus VA direct</h2><p>For a VA-backed loan, a private lender makes the mortgage and VA guarantees part of the lender’s risk. For a Native American Direct Loan, VA is the lender. Each program has its own purpose, property and eligibility requirements.</p>
<h2>Potential benefits and costs</h2><ul><li>No private mortgage insurance requirement on a VA-backed loan.</li><li>Potential zero-down purchase financing for qualified borrowers.</li><li>Limits on certain closing costs and assistance for borrowers facing payment difficulty.</li><li>A VA funding fee may apply unless the borrower qualifies for an exemption.</li></ul>
<h2>Choose by objective</h2><p>Use a purchase loan to acquire a primary residence, an IRRRL to refinance an existing VA-backed loan under streamlined rules, a cash-out refinance when replacing a mortgage and accessing equity, or NADL when the borrower and trust-land property meet that program’s requirements.</p>`,
  },
];

for (const page of resourcePages) writePage(page);

function customPageShell({
  route,
  title,
  description,
  eyebrow,
  lead,
  content,
  bodyClass = "",
}) {
  const canonical = `https://gregdeskin.com/${route.replace(/^\/+|\/+$/g, "")}/`;
  return `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1, viewport-fit=cover" name="viewport"/>
<title>${title} | Greg Deskin</title>
${cookiebotScript}
<meta content="${description}" name="description"/>
<meta content="index,follow,max-image-preview:large" name="robots"/>
<link href="${canonical}" rel="canonical"/>
<meta content="website" property="og:type"/><meta content="${title} | Greg Deskin" property="og:title"/><meta content="${description}" property="og:description"/><meta content="${canonical}" property="og:url"/>
<meta content="summary" name="twitter:card"/><meta content="#101010" name="theme-color"/>
<link href="/favicon-64.png" rel="icon" sizes="64x64" type="image/png"/><link href="/favicon.png" rel="apple-touch-icon"/><link href="/site.webmanifest" rel="manifest"/>
<link href="/assets/css/styles.css" rel="stylesheet"/>
<script defer src="/assets/js/site-config.js"></script><script defer src="/assets/js/main.js"></script>
<meta content="Greg Deskin, NMLS 1883221" name="author"/>
</head>
<body class="${bodyClass}" data-loan-drawer="enabled">
${header()}
<main id="main-content">
<section class="page-hero"><div class="container"><nav aria-label="Breadcrumb" class="breadcrumbs"><a href="/">Home</a><span>›</span><span aria-current="page">${title}</span></nav><p class="kicker">${eyebrow}</p><h1>${title}</h1><p class="lead">${lead}</p></div></section>
${content}
</main>
${footer()}
</body>
</html>\n`;
}

function writeCustomPage(definition) {
  const directory = path.join(root, definition.route);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(
    path.join(directory, "index.html"),
    customPageShell(definition),
  );
}

const legalSection = (inner) =>
  `<section class="section"><div class="container legal-layout"><article class="prose legal-article">${inner}</article><aside class="legal-aside"><p class="kicker">Questions?</p><h2>Talk with Greg’s team</h2><p>For questions about this website, a privacy request or a mortgage conversation, contact us directly.</p><a class="btn btn-sm" href="/contact/">Contact Us</a><a href="tel:+19498648178">(949) 864-8178</a><a href="mailto:GDeskin@WestCapitalLending.com">GDeskin@WestCapitalLending.com</a></aside></div></section>`;

writeCustomPage({
  route: "privacy-policy",
  title: "Privacy Policy",
  description:
    "How GregDeskin.com collects, uses, discloses and protects personal information and how visitors can exercise privacy choices.",
  eyebrow: "Your information",
  lead: "This notice explains the information collected through GregDeskin.com and the choices available to visitors and prospective borrowers.",
  content:
    legalSection(`<p class="effective-date"><strong>Effective date:</strong> September 13, 2026</p>
<h2>1. Scope of this policy</h2><p>This Privacy Policy applies to GregDeskin.com and communications initiated through this website. Greg Deskin is a mortgage professional authorized to represent West Capital Lending, Inc. When you open an application, rate, refinance, HELOC or other secure questionnaire, the form provider and West Capital Lending may collect information under their own notices and applicable financial-privacy rules.</p>
<h2>2. Information we may collect</h2><ul><li><strong>Contact information:</strong> name, email address, telephone number and preferred contact details.</li><li><strong>Inquiry information:</strong> property state, loan purpose, timing, meeting preferences and anything you include in a message.</li><li><strong>Application information:</strong> financial, employment, identity, credit, property and transaction details submitted through an application or secure form.</li><li><strong>Device and usage information:</strong> IP address, browser, device, referring page, pages viewed and cookie or consent signals, subject to your choices.</li><li><strong>Communication records:</strong> emails, calls, text-message preferences and records needed to respond or comply with law.</li></ul>
<h2>3. How information is used</h2><p>Information may be used to respond to requests, schedule consultations, evaluate or facilitate mortgage services, provide requested information, operate and secure the website, remember privacy choices, prevent fraud, improve services, maintain records and comply with legal or regulatory obligations.</p>
<h2>4. When information may be disclosed</h2><p>Information may be shared with West Capital Lending, loan investors and service providers involved in a requested transaction; vendors that host forms, communications or website infrastructure; professional advisers and regulators; and other parties when directed by you or required by law. Personal information is not sold for money by this website. Some analytics or advertising technologies may be treated as a “sale” or “sharing” under certain state laws; Cookiebot provides applicable consent controls.</p>
<h2>5. Cookies and consent choices</h2><p>Cookiebot manages website consent. Necessary technologies may operate to provide security and core functionality. Optional preference, statistics and marketing technologies are controlled according to the choices available in the Cookiebot banner. You may revisit those choices at any time.</p><p><button class="btn btn-outline-dark" data-cookiebot-renew="" type="button">Review Cookie Preferences</button></p>
<h2>6. Secure forms and third parties</h2><p>Buttons labeled Apply Now and selected quote or eligibility tools open hosted services, including Loanzify and Secure-Clix. Those destinations are intentionally left as external secure forms. Review the notice presented by the form before sending sensitive information. Do not place Social Security numbers, account numbers or other sensitive financial data in a general website message.</p>
<h2>7. Retention and security</h2><p>Records are retained for the period reasonably needed to respond, provide services, meet contractual or legal duties and resolve disputes. Administrative, technical and physical safeguards are used as appropriate, but no website or transmission method can be guaranteed completely secure.</p>
<h2>8. Your choices and requests</h2><p>Depending on where you live, you may have rights to request access, correction or deletion; obtain a copy; limit certain uses; or opt out of certain sale, sharing or targeted-advertising activity. Rights can be subject to identity verification, exceptions and financial-information laws. Submit a request through the contact page or by calling (949) 864-8178. Authorized agents may be asked to provide proof of authority.</p>
<h2>9. Communications</h2><p>You may opt out of marketing email using an unsubscribe method provided in the message. For text messages, reply STOP to cancel and HELP for assistance. Service or transaction communications may still be sent where allowed and needed.</p>
<h2>10. Children, changes and contact</h2><p>This website is intended for adults seeking mortgage or real-estate information and is not directed to children under 13. This policy may be updated as services, technology or law changes; the effective date above identifies the current version.</p>
<div class="notice"><strong>Contact</strong><p>Greg Deskin / West Capital Lending, Inc.<br/>17911 Von Karman Avenue, Suite 400, Irvine, CA 92614<br/>Phone: (949) 864-8178<br/>Email: GDeskin@WestCapitalLending.com</p></div>`),
});

writeCustomPage({
  route: "terms-of-use",
  title: "Terms of Use",
  description:
    "Terms governing access to and use of GregDeskin.com, its mortgage education, communications and links to secure application forms.",
  eyebrow: "Website terms",
  lead: "These terms govern your use of GregDeskin.com. Please read them before relying on website information or submitting a request.",
  content:
    legalSection(`<p class="effective-date"><strong>Effective date:</strong> September 13, 2026</p>
<h2>1. Acceptance</h2><p>By using this website, you agree to these Terms of Use and the Privacy Policy. If you do not agree, do not use the website. These terms do not replace any application, disclosure, loan agreement, privacy notice or other document delivered for a transaction.</p>
<h2>2. Educational information only</h2><p>Website content is general mortgage and real-estate education. It is not legal, tax, accounting, investment or individualized financial advice. Program descriptions are not commitments to lend. Products, pricing, guidelines, loan limits and eligibility can change without notice.</p>
<h2>3. No approval or rate guarantee</h2><p>No website statement guarantees qualification, approval, interest rate, monthly payment, closing date, savings or property value. Approval and final terms depend on a completed application, verification, underwriting, property review, current market conditions and all required disclosures.</p>
<h2>4. Applications and secure forms</h2><p>Apply Now and the rate, refinance, HELOC and other form links may open third-party hosted services. Those forms are intentionally external and may have additional terms and privacy notices. General contact and scheduling forms are not mortgage applications and should not be used for sensitive financial identifiers.</p>
<h2>5. Accurate information and acceptable use</h2><p>You agree to provide accurate information and to use the website lawfully. You may not disrupt, probe, scrape at an unreasonable rate, introduce malicious code, impersonate another person, interfere with security or use content in a way that violates another party’s rights.</p>
<h2>6. Intellectual property</h2><p>Unless otherwise identified, website text, graphics, design and organization are owned by or licensed for this site and are protected by applicable law. You may view or print reasonable portions for personal, noncommercial use. Logos and third-party marks remain the property of their respective owners.</p>
<h2>7. Third-party services</h2><p>The website may refer to third-party providers or public agencies. References do not guarantee availability, accuracy or endorsement. Third-party systems are controlled by their operators, and their own terms apply.</p>
<h2>8. Disclaimer of warranties</h2><p>To the fullest extent allowed by law, the website is provided “as is” and “as available.” No warranty is made that content is complete, current or error-free or that operation will be uninterrupted. Applicable consumer rights that cannot lawfully be waived remain unaffected.</p>
<h2>9. Limitation of liability</h2><p>To the fullest extent allowed by law, Greg Deskin and West Capital Lending will not be liable for indirect, incidental, special, consequential or punitive damages arising from website use. Nothing in these terms excludes liability that applicable law does not permit the parties to exclude.</p>
<h2>10. Changes, law and contact</h2><p>Content and these terms may be updated at any time. The version posted here applies from its effective date. Applicable federal law and the law governing the relevant transaction control, including any mandatory forum or consumer-protection rights.</p>
<div class="notice"><strong>Questions</strong><p>Contact Greg’s team at (949) 864-8178 or GDeskin@WestCapitalLending.com, or write to 17911 Von Karman Avenue, Suite 400, Irvine, CA 92614.</p></div>`),
});

writeCustomPage({
  route: "sms-terms-conditions",
  title: "SMS Terms & Conditions",
  description:
    "Terms for text messages requested from Greg Deskin and West Capital Lending, including consent, frequency, HELP and STOP instructions.",
  eyebrow: "Text messaging",
  lead: "These terms explain what to expect if you ask Greg Deskin or West Capital Lending to communicate with you by text message.",
  content:
    legalSection(`<p class="effective-date"><strong>Effective date:</strong> September 13, 2026</p>
<h2>1. Consent to receive texts</h2><p>When you provide a mobile number and affirmatively consent, you authorize Greg Deskin and West Capital Lending, including service providers acting on their behalf, to send text messages to that number. Consent is not a condition of purchasing goods or services.</p>
<h2>2. Message content and frequency</h2><p>Messages may concern your inquiry, requested appointment, application status, documentation, transaction updates, reminders or services you requested. Marketing messages will be sent only where permitted and based on the consent collected. Frequency varies with your interaction and transaction.</p>
<h2>3. Automated technology</h2><p>Messages may be sent using an automatic telephone dialing system or other automated technology where permitted. Your consent applies only to the number you provide. Tell us promptly if the number changes or is reassigned.</p>
<h2>4. Costs and carrier responsibility</h2><p>Message and data rates may apply under your wireless plan. Carriers are not responsible for delayed or undelivered messages. Delivery depends on network and device availability and is not guaranteed.</p>
<h2>5. Opt out and assistance</h2><p>Reply <strong>STOP</strong> to cancel recurring text messages. You may receive one final confirmation. Reply <strong>HELP</strong> for assistance, call (949) 864-8178 or email GDeskin@WestCapitalLending.com. Requests may take a short period to process, and legally required or individually requested messages may still be delivered where allowed.</p>
<h2>6. Privacy and security</h2><p>Text messages are not always secure. Do not send Social Security numbers, bank-account details, passwords or other highly sensitive information by SMS. Personal information is handled as described in the Privacy Policy and any financial privacy notice provided for your transaction.</p>
<h2>7. Eligibility and conduct</h2><p>You must be at least 18 years old, be the subscriber or customary user of the number and have authority to consent. Do not use the messaging program unlawfully or to harass, impersonate or transmit malicious content.</p>
<h2>8. Changes and termination</h2><p>The messaging program or these terms may change or end. Material changes will be posted here or communicated as required. Continued participation after an effective update constitutes acceptance to the extent allowed by law.</p>
<div class="notice"><strong>Contact</strong><p>Greg Deskin / West Capital Lending, Inc.<br/>17911 Von Karman Avenue, Suite 400, Irvine, CA 92614<br/>Phone: (949) 864-8178 · Email: GDeskin@WestCapitalLending.com</p></div>`),
});

writeCustomPage({
  route: "texas-complaint-recovery-fund-notice",
  title: "Texas Complaint and Recovery Fund Notice",
  description:
    "Texas mortgage complaint and recovery fund information for consumers working with Greg Deskin and West Capital Lending.",
  eyebrow: "Texas consumer notice",
  lead: "Texas consumers can submit written complaints about a residential mortgage loan originator to the Department of Savings and Mortgage Lending.",
  content:
    legalSection(`<div class="notice notice-prominent"><strong>Texas Department of Savings and Mortgage Lending</strong><p>2601 North Lamar Boulevard, Suite 201<br/>Austin, Texas 78705<br/>Telephone: 1-877-276-5550<br/>Website: sml.texas.gov</p></div>
<h2>How to submit a complaint</h2><p>A consumer who wishes to file a complaint against a mortgage banker or licensed mortgage banker residential mortgage loan originator should complete and send a complaint form to the Texas Department of Savings and Mortgage Lending. Instructions and forms are available from the Department at the contact information above.</p>
<h2>What to include</h2><p>Provide a clear description of the issue and copies of relevant documents. Useful records can include the loan originator and company names, NMLS identifiers, property address, dates, disclosures, correspondence and an explanation of the requested resolution. Do not send original documents unless the Department specifically requests them.</p>
<h2>Mortgage Grant Fund</h2><p>The Department maintains a recovery fund to make payments of certain actual out-of-pocket damages sustained by borrowers as a result of specific acts by licensed residential mortgage loan originators. A written application for reimbursement must be filed with and investigated by the Department before payment can be considered. Eligibility, limitations and the claims process are governed by Texas law and Department rules.</p>
<h2>Related identifiers</h2><ul><li>Gregory Lee Deskin — NMLS #1883221</li><li>West Capital Lending, Inc. — NMLS #1566096</li><li>West Capital Lending, Inc. — California DRE #02022356</li></ul>
<p>This internal notice is provided for convenient access and does not replace the Department’s current required notice, forms, statutes or rules.</p>`),
});

writeCustomPage({
  route: "cookie-policy",
  title: "Cookie Policy",
  description:
    "How Cookiebot and browser technologies are used on GregDeskin.com and how visitors can review or change consent choices.",
  eyebrow: "Consent controls",
  lead: "Cookiebot manages consent on this website and lets you review or change optional cookie categories at any time.",
  content:
    legalSection(`<p class="effective-date"><strong>Effective date:</strong> September 13, 2026</p>
<h2>What cookies are</h2><p>Cookies are small files or browser-storage entries used to remember information about a visit. Similar technologies can include pixels, local storage and tags. Their duration may be limited to a browser session or continue until expiry or deletion.</p>
<h2>Cookie categories</h2><ul><li><strong>Necessary:</strong> support security, navigation, consent storage and essential website behavior.</li><li><strong>Preferences:</strong> remember optional choices that improve how the website behaves.</li><li><strong>Statistics:</strong> help measure aggregated website use and performance when consent is available.</li><li><strong>Marketing:</strong> support advertising or conversion measurement when consent is available.</li></ul>
<h2>Cookiebot consent management</h2><p>The Cookiebot script uses consent ID <strong>${COOKIEBOT_ID}</strong> and automatic blocking mode. Optional technologies are expected to follow the choice made through the consent banner. Necessary technologies may operate without optional consent where allowed because the requested website function depends on them.</p>
<h2>Change or withdraw consent</h2><p>You can reopen the Cookiebot panel below. Withdrawing consent does not make prior processing unlawful, and some previously stored browser data may need to be removed through browser settings.</p><p><button class="btn" data-cookiebot-renew="" type="button">Open Cookie Preferences</button></p>
<h2>Embedded and linked services</h2><p>The site can display a privacy-enhanced YouTube video after you choose to play it. Apply Now and mortgage questionnaires open separate hosted services. Those providers may use their own necessary or optional technologies under the notices presented on their services.</p>
<h2>Browser controls and updates</h2><p>Most browsers allow you to view, block or delete stored data. Blocking necessary cookies can prevent parts of the site from working. Cookie usage can change as services are updated, so this page and the Cookiebot declaration should be reviewed periodically.</p>
<h2>Current cookie declaration</h2><div class="cookie-declaration" aria-live="polite"><script id="CookieDeclaration" src="https://consent.cookiebot.com/${COOKIEBOT_ID}/cd.js" type="text/javascript" async></script></div>`),
});

const stateRows = [
  ["Alabama", "MLO / Commercial / SBA / DSCR"],
  ["Alaska", "MLO / Commercial / SBA / DSCR"],
  ["Arizona", "MLO / Commercial / SBA / DSCR"],
  ["Arkansas", "MLO / Commercial / SBA / DSCR"],
  ["California — DRE", "MLO / Commercial / SBA / DSCR"],
  ["California — DRE", "Real Estate Salesperson"],
  ["Colorado", "MLO / Commercial / SBA / DSCR"],
  ["Connecticut", "MLO / Commercial / SBA / DSCR"],
  ["Delaware", "MLO / Commercial / SBA / DSCR"],
  ["District of Columbia", "MLO / Commercial / SBA / DSCR"],
  ["Florida", "MLO / Commercial / SBA / DSCR"],
  ["Georgia", "Commercial / SBA / DSCR"],
  ["Hawaii", "MLO / Commercial / SBA / DSCR"],
  ["Idaho", "MLO / Commercial / SBA / DSCR"],
  ["Illinois", "Commercial / SBA / DSCR"],
  ["Indiana", "Commercial / SBA / DSCR"],
  ["Iowa", "MLO / Commercial / SBA / DSCR"],
  ["Kansas", "MLO / Commercial / SBA / DSCR"],
  ["Kentucky", "MLO / Commercial / SBA / DSCR"],
  ["Louisiana", "Commercial / SBA / DSCR"],
  ["Maine", "MLO / Commercial / SBA / DSCR"],
  ["Maryland", "MLO / Commercial / SBA / DSCR"],
  ["Massachusetts", "Commercial / SBA / DSCR"],
  ["Michigan", "MLO / Commercial / SBA / DSCR"],
  ["Minnesota", "MLO / Commercial / SBA / DSCR"],
  ["Mississippi", "Commercial / SBA / DSCR"],
  ["Missouri", "MLO / Commercial / SBA / DSCR"],
  ["Montana", "Commercial / SBA / DSCR"],
  ["Nebraska", "MLO / Commercial / SBA / DSCR"],
  ["Nevada", "Commercial / SBA / DSCR"],
  ["New Hampshire", "MLO / Commercial / SBA / DSCR"],
  ["New Jersey", "Commercial / SBA / DSCR"],
  ["New Mexico", "MLO / Commercial / SBA / DSCR"],
  ["New York", "Commercial / SBA / DSCR"],
  ["North Carolina", "Commercial / SBA / DSCR"],
  ["North Dakota", "MLO / Commercial / SBA / DSCR"],
  ["Ohio", "MLO / Commercial / SBA / DSCR"],
  ["Oklahoma", "MLO / Commercial / SBA / DSCR"],
  ["Oregon", "MLO / Commercial / SBA / DSCR"],
  ["Pennsylvania", "MLO / Commercial / SBA / DSCR"],
  ["Rhode Island", "Commercial / SBA / DSCR"],
  ["South Carolina", "Commercial / SBA / DSCR"],
  ["South Dakota", "MLO / Commercial / SBA / DSCR"],
  ["Tennessee", "MLO / Commercial / SBA / DSCR"],
  ["Texas — SML", "MLO / Commercial / SBA / DSCR"],
  ["Utah — DRE", "MLO / Commercial / SBA / DSCR"],
  ["Vermont", "Commercial / SBA / DSCR"],
  ["Virginia", "MLO / Commercial / SBA / DSCR"],
  ["Washington", "MLO / Commercial / SBA / DSCR"],
  ["West Virginia", "MLO / Commercial / SBA / DSCR"],
  ["Wisconsin", "MLO / Commercial / SBA / DSCR"],
  ["Wyoming", "MLO / Commercial / SBA / DSCR"],
];
const stateTable = `<div class="table-scroll"><table class="license-table"><thead><tr><th scope="col">Jurisdiction</th><th scope="col">Activity shown in supplied summary</th></tr></thead><tbody>${stateRows.map(([state, activity]) => `<tr><th scope="row">${state}</th><td>${activity}</td></tr>`).join("")}</tbody></table></div>`;

writeCustomPage({
  route: "licensing",
  title: "Licensing & Regulatory Information",
  description:
    "Licensing summary for Gregory Lee Deskin, NMLS 1883221, and West Capital Lending, Inc., NMLS 1566096, including supplied state authorizations.",
  eyebrow: "Gregory Lee Deskin",
  lead: "Review Greg’s identifiers, company relationship and the complete jurisdiction summary supplied from NMLS Consumer Access.",
  content: `<section class="section"><div class="container"><article class="prose license-content"><div class="license-identity-card"><div><span>Individual</span><strong>Gregory Lee Deskin</strong><small>NMLS #1883221 · CA DRE #02373263</small></div><div><span>Company represented</span><strong>West Capital Lending, Inc.</strong><small>NMLS #1566096 · CA DRE #02022356</small></div><div><span>Main office</span><strong>Irvine, California</strong><small>17911 Von Karman Avenue, Suite 400</small></div></div>
<div class="notice"><strong>Record date</strong><p>The attached NMLS State Summary was retrieved September 9, 2026. Licensing, sponsorship and authorized activities can change; confirm current status for the property jurisdiction before relying on this summary.</p></div>
<h2>Professional licensing overview</h2><p>Gregory Lee Deskin is identified by NMLS #1883221 and is authorized to represent West Capital Lending, Inc., NMLS #1566096. The NMLS identifier helps consumers locate the correct individual and company record. It does not by itself indicate that every loan product is available in every location.</p>
<h2 id="state-authorizations">State authorization summary</h2><p>The table reproduces the jurisdiction and activity labels contained in the supplied summary. “MLO” means mortgage loan origination; commercial, SBA and DSCR entries refer to the listed business-purpose categories. California contains separate mortgage and real-estate salesperson entries.</p>${stateTable}
<h2>How to verify before applying</h2><ol><li>Confirm the property’s state and the purpose of the requested financing.</li><li>Use Greg’s individual NMLS #1883221 and West Capital Lending’s NMLS #1566096 to identify the correct records.</li><li>Ask Greg’s team to confirm current authorization, program availability and sponsorship for that transaction.</li><li>Review all application, privacy and loan disclosures before submitting sensitive information.</li></ol>
<div class="actions"><a class="btn" href="/contact/">Ask a Licensing Question</a><a class="btn btn-outline-dark" href="/verification/nmls/">How NMLS Verification Works</a></div>
<h2>Equal Housing Opportunity</h2><p class="equal-housing"><img alt="Equal Housing Opportunity" src="/assets/img/equal-housing.svg"/>West Capital Lending is an Equal Housing Lender.</p>
<h2>Regulatory notices</h2><ul><li><a href="/texas-complaint-recovery-fund-notice/">Texas Complaint and Recovery Fund Notice</a></li><li><a href="/privacy-policy/">Privacy Policy</a></li><li><a href="/terms-of-use/">Terms of Use</a></li><li><a href="/sms-terms-conditions/">SMS Terms &amp; Conditions</a></li></ul></article></div></section>`,
});

writeCustomPage({
  route: "about",
  title: "About Greg Deskin",
  description:
    "Meet Greg Deskin, Branch Manager and mortgage professional, NMLS 1883221, serving buyers, homeowners and investors through West Capital Lending.",
  eyebrow: "Mortgage guidance since 1991",
  lead: "Greg combines decades of lending experience with direct, practical guidance for homebuyers, homeowners and real-estate investors.",
  content: `<section class="section"><div class="container about-profile-layout"><div class="about-portrait"><picture><source srcset="/assets/img/greg-deskin-portrait.webp" type="image/webp"/><img src="/assets/img/greg-deskin-portrait.png" alt="Greg Deskin, mortgage professional" width="620" height="760"/></picture></div><article class="prose"><h2>Experience with a borrower-first approach</h2><p>Gregory Deskin is a Branch Manager and mortgage professional identified by NMLS #1883221 and California DRE #02373263. His career began in 1991, and his work centers on making complex loan choices understandable, setting clear expectations and staying engaged through underwriting and closing.</p><p>Through West Capital Lending, Greg can help qualified borrowers compare a broad network of lender and investor options instead of treating every file as though it fits one standard program. The goal is a responsible match among the borrower, property, documentation, timeline and total cost.</p>
<h2>Who Greg helps</h2><ul><li>First-time and repeat homebuyers</li><li>Homeowners considering rate-and-term or cash-out refinancing</li><li>Veterans and service members exploring VA benefits</li><li>Borrowers evaluating FHA, USDA, conventional or jumbo financing</li><li>Self-employed borrowers and investors considering non-QM or DSCR options</li><li>Clients exploring home-equity, reverse-mortgage or commercial strategies</li></ul>
<h2>What to expect</h2><p>Every transaction begins with the purpose of the financing, a realistic budget and the documents available. Greg’s team then helps explain tradeoffs among rate, points or credits, down payment, mortgage insurance, term, cash to close and qualification requirements. Final approval and terms remain subject to the lender’s current underwriting and required disclosures.</p>
<div class="profile-facts"><div><span>Career start</span><strong>1991</strong></div><div><span>NMLS ID</span><strong>1883221</strong></div><div><span>Role</span><strong>Branch Manager</strong></div><div><span>Company</span><strong>West Capital Lending</strong></div></div>
<div class="actions"><a class="btn" href="/contact/">Start a Conversation</a><a class="btn btn-outline-dark" href="/licensing/">View Licensing</a></div></article></div></section>
<section class="section section-alt"><div class="container"><div class="section-heading"><p class="kicker">Professional foundation</p><h2>Service, education and accountability</h2></div><div class="card-grid three"><article class="card"><h3>Clear explanations</h3><p>Understand the reason behind documentation requests, loan structure and costs before making a decision.</p></article><article class="card"><h3>Broad program review</h3><p>Compare options across purchase, refinance, government, jumbo, home-equity and investor scenarios where available.</p></article><article class="card"><h3>Verifiable credentials</h3><p>Review Greg’s identifiers and supplied authorization summary directly on this website.</p></article></div></div></section>`,
});

writeCustomPage({
  route: "loan-types/conventional",
  title: "Conventional Loans",
  description:
    "Understand conventional mortgages, conforming limits, occupancy, down payment, mortgage insurance and documentation with Greg Deskin.",
  eyebrow: "Loan program",
  lead: "Conventional mortgages are not insured by FHA, VA or USDA and can support primary residences, second homes and investment properties under applicable guidelines.",
  content: `<section class="section"><div class="container interior-layout"><aside class="loan-sidebar"><div class="sidebar-title"><strong>Explore Loan Types</strong><span>Research and compare options</span></div><nav class="sidebar-nav"><a aria-current="page" href="/loan-types/conventional/">Conventional Loans</a><a href="/loan-types/fha/">FHA Loans</a><a href="/loan-types/va/">VA Loans</a><a href="/loan-types/jumbo/">Jumbo Loans</a><a href="/loan-types/usda/">USDA Loans</a><a href="/loan-types/refinance/">Refinance</a><a href="/loan-types/first-time-buyer/">First-Time Buyer</a><a href="/loan-types/investment-commercial/">Investment &amp; Commercial</a></nav></aside><article class="prose"><div class="info-grid"><div class="info-box"><span>Uses</span><strong>Purchase or refinance</strong></div><div class="info-box"><span>Occupancy</span><strong>Primary, second home or investment</strong></div><div class="info-box"><span>2026 baseline</span><strong>$832,750 one-unit limit</strong></div></div>
<h2>Conforming and nonconforming conventional loans</h2><p>A conventional loan is made without government mortgage insurance. Many conventional loans are conforming, meaning their size and underwriting fit current Fannie Mae or Freddie Mac purchase requirements. A conventional loan above the county limit is generally called jumbo and can follow different credit, reserve, appraisal and documentation standards.</p>
<h2>Down payment and mortgage insurance</h2><p>Eligible primary-residence transactions may permit a low down payment, while second-home and investment-property requirements are usually higher. Private mortgage insurance is commonly required when a first mortgage exceeds 80% of property value. Coverage, price and cancellation rules vary by transaction.</p>
<h2>What underwriting reviews</h2><ul><li>Credit history and score, including housing-payment patterns</li><li>Stable qualifying income and employment or self-employment documentation</li><li>Monthly debt obligations and debt-to-income ratio</li><li>Down payment, closing funds, reserves and the source of assets</li><li>Property type, condition, value, occupancy and title</li></ul>
<h2>Occupancy affects eligibility</h2><p>A primary residence is the home the borrower will occupy as their principal dwelling. A second home generally must be suitable for year-round use and not function as a rental property. An investment property is owned for income, appreciation or another business purpose. Accurate occupancy is essential to underwriting and pricing.</p>
<h2>Benefits and tradeoffs</h2><p>Conventional financing can offer flexible terms, broad property eligibility and cancellable mortgage insurance in some circumstances. Tradeoffs may include stricter credit, reserve or property rules than another program and pricing that changes based on credit, equity, occupancy, units and other risk factors.</p>
<div class="actions"><a class="btn js-form-modal" data-modal-title="Conventional Loan Options" href="${formLinks.rate}">Check Current Options</a><a class="btn btn-outline-dark" href="/resources/conforming-loan-limits/">Review 2026 Loan Limits</a></div>
<div class="related-guides"><h2>Related guides</h2><div><a href="/resources/occupancy-types/">Mortgage occupancy types</a><a href="/resources/multiple-financed-properties/">Multiple financed properties</a><a href="/resources/loan-estimate-guide/">How to read a Loan Estimate</a></div></div></article></div></section>`,
});

// Apply the internal-link map and Cookiebot migration to every original and generated page.
for (const file of allHtmlFiles(root)) {
  let html = fs.readFileSync(file, "utf8");
  html = rewriteMappedAnchors(html);
  html = installCookiebot(html);
  html = html
    .replaceAll("Visit TheLoanCenter.com →", "Open Mortgage Learning Center →")
    .replaceAll("Watch Loan Education Videos →", "Explore Borrower Resources →")
    .replaceAll("Official Company Licensing", "Licensing Information")
    .replaceAll("Licensing Overview", "Licensing")
    .replaceAll("NMLS Consumer Access</span>", "NMLS Licensing Summary</span>");
  fs.writeFileSync(file, html);
}

const sitemapRoutes = allHtmlFiles(root)
  .map((file) => path.relative(root, file).split(path.sep).join("/"))
  .filter(
    (file) =>
      ![
        "404.html",
        "accessibility/index.html",
        "thank-you/index.html",
      ].includes(file),
  )
  .map((file) =>
    file === "index.html" ? "/" : `/${file.replace(/index\.html$/, "")}`,
  )
  .sort((a, b) => (a === "/" ? -1 : b === "/" ? 1 : a.localeCompare(b)));
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapRoutes.map((route) => `  <url><loc>https://gregdeskin.com${route}</loc><lastmod>2026-09-13</lastmod><changefreq>monthly</changefreq><priority>${route === "/" ? "1.0" : route === "/contact/" || route === "/loan-types/" ? "0.9" : "0.7"}</priority></url>`).join("\n")}
</urlset>
`;
fs.writeFileSync(path.join(root, "sitemap.xml"), sitemap);

console.log(
  `Generated ${resourcePages.length + 8} internal pages and migrated ${allHtmlFiles(root).length} HTML files.`,
);
