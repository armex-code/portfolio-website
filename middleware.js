import { geolocation, next, waitUntil } from '@vercel/functions';

/* ============================================================
   Switzerland visitor alert
   ------------------------------------------------------------
   Runs on the Edge before every page request. Vercel resolves
   the visitor's country from their IP and hands it to us, so
   this works even when the visitor blocks scripts.

   When someone from Switzerland loads a page we fire off one
   email through Resend. Everyone else passes straight through.

   Env vars (Vercel dashboard -> Settings -> Environment Variables):
     RESEND_API_KEY  required, from resend.com/api-keys
     ALERT_TO        required, where the email lands
     ALERT_FROM      optional, defaults to Resend's shared sender
     WATCH_COUNTRY   optional, ISO 3166-1 code, defaults to CH
   ============================================================ */

export const config = {
  // Pages only. Skip static assets, the analytics beacon and Vercel internals
  // so a single visit doesn't trigger a dozen middleware runs.
  matcher: [
    '/((?!_vercel|css/|js/|.*\\.(?:css|js|map|png|jpe?g|gif|svg|ico|webp|avif|woff2?|ttf|mp3|mp4|txt|xml|json)$).*)',
  ],
};

const DEFAULT_COUNTRY = 'CH';
const DEFAULT_FROM = 'Portfolio Alerts <onboarding@resend.dev>';

// One alert per visitor per 12h, so a browse through five pages is one email.
const COOKIE_NAME = 'geo-alerted';
const COOKIE_MAX_AGE = 60 * 60 * 12;

// Crawlers geolocate to wherever their data centre is; they aren't visitors.
const BOT_UA = /bot|crawler|spider|crawling|slurp|bingpreview|headlesschrome|lighthouse|preview|monitor|curl|wget|python-requests|axios|node-fetch/i;

export default function middleware(request) {
  // This sits in front of the whole site, so nothing in here is allowed to
  // throw: any failure must still serve the page.
  try {
    return handle(request);
  } catch (err) {
    console.error('[geo-alert] middleware failed, passing request through', err);
    return next();
  }
}

function handle(request) {
  const watched = (process.env.WATCH_COUNTRY || DEFAULT_COUNTRY).toUpperCase();
  const geo = geolocation(request);

  if ((geo.country || '').toUpperCase() !== watched) return next();
  if (BOT_UA.test(request.headers.get('user-agent') || '')) return next();
  if (hasCookie(request, COOKIE_NAME)) return next();

  // Don't make the visitor wait on Resend: hand the send to the runtime and
  // return the page immediately.
  waitUntil(sendAlert(request, geo));

  return next({
    headers: {
      'set-cookie': `${COOKIE_NAME}=1; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
    },
  });
}

function hasCookie(request, name) {
  const header = request.headers.get('cookie');
  if (!header) return false;
  return header.split(';').some((part) => part.trim().startsWith(`${name}=`));
}

async function sendAlert(request, geo) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ALERT_TO;

  if (!apiKey || !to) {
    console.warn('[geo-alert] RESEND_API_KEY or ALERT_TO is not set, skipping email');
    return;
  }

  const url = new URL(request.url);
  const details = {
    Page: url.pathname + url.search,
    City: geo.city ? decodeURIComponent(geo.city) : 'unknown',
    Region: geo.countryRegion || geo.region || 'unknown',
    Referrer: request.headers.get('referer') || 'direct',
    Browser: request.headers.get('user-agent') || 'unknown',
    Time: new Date().toUTCString(),
  };

  const rows = Object.entries(details)
    .map(
      ([key, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#666;">${key}</td><td style="padding:4px 0;">${escapeHtml(
          String(value),
        )}</td></tr>`,
    )
    .join('');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.ALERT_FROM || DEFAULT_FROM,
        to: to.split(',').map((address) => address.trim()),
        subject: `Someone from Switzerland is on your site (${details.City})`,
        html: `<div style="font-family:system-ui,sans-serif;font-size:14px;">
  <p>A visitor from <strong>Switzerland</strong> just opened your portfolio.</p>
  <table style="border-collapse:collapse;">${rows}</table>
  <p style="color:#666;font-size:12px;">Next 12 hours from this visitor are muted so you only get one email per person.</p>
</div>`,
      }),
    });

    if (!response.ok) {
      console.error('[geo-alert] resend rejected the email', response.status, await response.text());
    }
  } catch (err) {
    console.error('[geo-alert] could not reach resend', err);
  }
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
