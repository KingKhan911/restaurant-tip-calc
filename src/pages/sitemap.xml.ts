import type { APIRoute } from 'astro';
import { INDEXABLE_ROUTES, SITE_ORIGIN } from '../lib/site.js';

export const prerender = true;

export const GET: APIRoute = () => {
  const urls = INDEXABLE_ROUTES
    .map((route) => `  <url><loc>${new URL(route, SITE_ORIGIN).href}</loc></url>`)
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
