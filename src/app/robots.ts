import type { MetadataRoute } from 'next';
import { ADRES } from '@/lib/seo';

// The personal pages are not disallowed here: a crawler has to fetch them to read their noindex.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/konto', '/pora-nieba', '/nazwy-gatunkow'] },
    sitemap: `${ADRES}/sitemap.xml`,
  };
}
