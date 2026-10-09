# GregDeskin.com Website

A responsive HTML, CSS and JavaScript website with a Node.js serverless contact handler. The site source is static; it is not a React project. Use Vercel or Netlify for contact form delivery.

## Included in this version

- The 24 former non-form external destinations now open as internal pages in the Greg Deskin theme.
- Apply Now still opens the existing Loanzify application in a new tab.
- The retained Secure-Clix product questionnaires keep their original URLs and modal behavior, including the “Open in new tab” fallback. Those external questionnaires are managed by Secure-Clix and are separate from this site's local Brevo forms.
- Cookiebot is installed on all HTML pages with consent ID `d2ca8e0a-6a9c-471f-97e9-06ca1f4fdc80` and automatic blocking mode.
- The homepage shows the existing configured introduction video (`f9FBwnZGEBE`) in the hero. It attempts muted autoplay and uses YouTube player controls for pause and sound, with an additional center full screen button. Autoplay requires browser permission and any applicable Cookiebot consent.
- The homepage content order is hero, home loan products, then the complete existing footer.
- All 43 on-site inquiry and scheduling form instances send through a private Brevo API handler, with a custom HTML email template.
- The licensing page identifies Gregory Lee Deskin as NMLS #1883221 and includes the complete jurisdiction/activity table from the supplied September 9, 2026 NMLS summary.
- Privacy, Terms, SMS, Cookie and Texas consumer-notice pages are hosted internally.
- The XML sitemap includes the new internal pages.

The complete 24-link conversion is documented in `INTERNAL-PAGE-MAP.md`.

## Configure form delivery

The included `.env` is a fill-in template. Add a **Brevo API key** to `BREVO_API_KEY`; a Brevo SMTP key will not work. Verify `BREVO_SENDER_EMAIL` or its domain in Brevo. The delivery address for every on-site form is set in only one place: `CONTACT_RECIPIENT_EMAIL`. The included value is `Info@GregDeskin.com`.

Production: set the same four variables in your Vercel or Netlify project settings. The build only publishes `dist/`, which excludes `.env` and the server code. Never put the Brevo API key in `assets/js/site-config.js`, HTML, or a public environment variable.

## Local preview with working forms

Node.js 20.6 or later is required. Fill in `.env` and run:

```bash
npm run dev
```

Open `http://localhost:8080/`. The built-in server serves both the site and `/api/contact`. A plain static preview, direct opening of an HTML file, or a host without serverless functions cannot deliver the forms.

## Deploy

- **Vercel:** import this folder as a project. It uses `vercel.json` to build `dist/`, and `api/contact.js` handles form requests. Set all four environment variables in Vercel's project settings, then redeploy.
- **Netlify:** import this folder as a project. `netlify.toml` builds `dist/`, and `_redirects` routes `/api/contact` to the Netlify function. Set the four environment variables in Netlify's project settings, then redeploy.
- **Apache/cPanel:** the HTML can be hosted as a static site, but the Node.js API will not run on ordinary PHP-only hosting. Use Vercel, Netlify, or another Node-compatible serverless setup for functional forms.

Submit one inquiry and one scheduling request after adding a real API key. Check both the Brevo transactional logs and the recipient inbox, including spam. Brevo accepting a request is not a final delivery confirmation.

## Validation

Run:

```bash
npm run build
npm test
```

The validator checks internal destinations, local links, duplicate IDs, Cookiebot installation, homepage order/video, form actions and licensing. Unit tests cover validation, HTML escaping, provider responses and both form types.

## Production notes

- The recipient and Brevo credentials are server environment variables; `assets/js/site-config.js` holds only public site settings such as the video URL.
- Secure-Clix can refuse iframe embedding in some browsers or privacy configurations; the existing fallback remains available.
- Mortgage claims, licensing and legal notices should receive final company/compliance approval before launch.

Deployment support files are included for Netlify (`netlify.toml` and `_redirects`) and Vercel (`vercel.json`). `.htaccess` remains in the source for the legacy Apache static site, which has no form API.
