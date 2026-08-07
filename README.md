This is my personal portfolio website where I experiment stuff.

[heyabdel.com](url)

## Analytics

Visitor stats (countries, pages, devices) come from Vercel Web Analytics. Every
page loads the tracking script directly in its HTML — this is a plain static
site, so the `@vercel/analytics` npm package and its `<Analytics />` React
component don't apply here. The dashboard's setup instructions default to the
Next.js flow; the **HTML** option in that dropdown is the one that matches.

Nothing is recorded until Web Analytics is switched on for the project:
**Vercel dashboard -> portfolio-website -> Analytics -> Enable**. The country
breakdown lives on that page once the first pageviews land.
