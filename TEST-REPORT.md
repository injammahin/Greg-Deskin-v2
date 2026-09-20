# Validation Report — September 20, 2026

## Completed checks

- `npm run build`: passed. Validated 40 HTML pages, 24 required internal destinations, links, duplicate IDs, Cookiebot installation, homepage section order, forms and licensing. Built the public site in `dist/`.
- `npm test`: passed five form delivery checks: lead and schedule messages, URL encoded fallback, escaped email HTML, configuration/provider failures, recipient protection and spam honeypot.
- `node --check` passed for the browser script and server-side entry points.
- Invoked both the Vercel and Netlify function handlers using a mocked Brevo HTTP response. Both returned success only after a simulated Brevo 201 response and routed to `Gdeskin@WestCapitalLending.com`.
- Local HTTP smoke checks: homepage 200, contact page 200, `.env` 404, unconfigured `/api/contact` 503. The public `dist/` does not contain `.env`.
- Homepage contains only the hero (with the configured YouTube player and full screen control), product section and complete footer. All 43 site-owned form instances target `/api/contact`.

## Requires deployment credentials and browser verification

No Brevo API key was included in the supplied ZIP. A real email cannot be sent until a valid Brevo API key and a verified sender are configured. Check one lead request and one scheduling request in Brevo's transactional logs and the recipient inbox after deployment.

The test environment did not contain an installed Chromium binary; visual browser screenshots and actual YouTube autoplay were not exercised here. YouTube autoplay is requested muted and can also depend on browser permissions and Cookiebot consent.

Product questionnaire links still open provider-hosted Secure-Clix forms. Their submissions are controlled by that provider, not the new Brevo handler.
