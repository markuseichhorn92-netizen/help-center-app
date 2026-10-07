import type { MetadataRoute } from 'next';

const BLOCKED = ['/admin', '/api', '/portal', '/share', '/feedback', '/legacy', '/md'];
// KI-/Such-Crawler ausdrücklich erlaubt (öffentliche Hilfe-Inhalte), interne Bereiche bleiben gesperrt.
const AI_CRAWLERS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: BLOCKED },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: '/', disallow: BLOCKED })),
    ],
    sitemap: 'https://hilfe.fit-inn-trier.de/sitemap.xml',
  };
}
