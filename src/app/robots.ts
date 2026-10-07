import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/portal', '/share', '/feedback'] },
    sitemap: 'https://hilfe.fit-inn-trier.de/sitemap.xml',
  };
}
