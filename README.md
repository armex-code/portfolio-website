This is my personal portfolio website where I experiment stuff.

[heyabdel.com](url)

## Analytics

Visitor stats (countries, pages, devices) come from Vercel Web Analytics. Every
page loads the tracking script directly — this is a plain static site, so the
`@vercel/analytics` npm package doesn't apply here.

It only records data once Web Analytics is switched on for the project:
**Vercel dashboard -> portfolio-website -> Analytics -> Enable**.

## Switzerland visitor alert

`middleware.js` runs on Vercel's Edge before each page request. Vercel resolves
the visitor's country from their IP, and when it's Switzerland an email goes out
through [Resend](https://resend.com). Repeat visits are muted for 12 hours and
crawlers are ignored, so one person browsing the site is one email.

Set these under **Settings -> Environment Variables**:

| Variable | Required | Notes |
| --- | --- | --- |
| `RESEND_API_KEY` | yes | from resend.com/api-keys |
| `ALERT_TO` | yes | where the alert lands; comma-separate for several |
| `ALERT_FROM` | no | defaults to `onboarding@resend.dev`; switch to an address on a domain verified in Resend to keep it out of spam |
| `WATCH_COUNTRY` | no | ISO country code, defaults to `CH` |

Without `RESEND_API_KEY` and `ALERT_TO` the site serves normally and just skips
the email.
