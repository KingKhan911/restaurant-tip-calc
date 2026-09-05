# Restaurant Tip Calculator

Restaurant Tip Calculator is a small Astro site for calculating restaurant and delivery tips, adding optional tax and fees, splitting totals exactly to the cent, and explaining U.S. tipping guidance with sourced research.

Production domain: `https://restauranttipcalculator.com`

## Development

```sh
npm ci
npm run dev
npm test
npm run build
npm run test:dist
npm run preview
```

Browser QA uses Playwright in GitHub Actions after the production build is created.

## Architecture

- Astro static HTML is the site shell and article layer.
- Calculator UI: `src/components/Calculator.astro`
- Pure money parsing and calculation logic: `src/lib/money.js` and `src/lib/tip.js`
- Research/source constants: `src/lib/editorial.js`
- Site/crawl/ad configuration: `src/lib/site.js`
- Shared metadata, header, footer, and global ad shell: `src/layouts/Layout.astro`
- Generated sitemap endpoint: `src/pages/sitemap.xml.ts`
- Editorial/research methodology: `/methodology/`

Important public routes are the calculator, five focused tipping guides, Methodology, About, and Privacy. The custom 404 page is intentionally excluded from the sitemap.

## Advertising configuration

Live ads are **disabled by default**. The shared `AdSlot` component and reserved-size CSS can be exercised in a development/test build with:

```sh
PUBLIC_ADS_ENABLED=true npm run build
```

That switch only exposes the ad-ready layout. No ad vendor script, publisher ID, or zone ID is installed.

Before enabling a real ad or analytics vendor, update `/privacy/` and add any consent mechanism actually required for the vendor and jurisdictions served.

## Research and privacy

Phase-2 factual content and research rules are documented on `/methodology/`. Calculator values are computed in the browser. A small set of calculator preferences is stored in localStorage; bill history is not intentionally persisted.

The current build retains Fraunces and Spline Sans Mono from Google Fonts rather than introducing new local font binaries during the launch-readiness phase. This preserves the already-certified visual metrics while the shared layout reduces connection setup with preconnect hints and the Google Fonts request uses `display=swap`. The external font requests are disclosed on `/privacy/`; there are no live analytics or advertising scripts in Phase 3. If the fonts are self-hosted later, use authoritative WOFF2 files, keep only the weights/styles actually used, and re-run the responsive visual QA because font metrics can change wrapping and layout shift.
