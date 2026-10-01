import type { MetadataRoute } from 'next';

// Only the public landing page should be indexed. App areas and the API are private.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/e/', '/v/', '/a/', '/join/', '/events'] } };
}
