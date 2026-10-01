import type { MetadataRoute } from 'next';

// Lets attendees and volunteers "Add to Home Screen" so the app opens like a native one.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CrewPulse',
    short_name: 'CrewPulse',
    description: 'Live updates, alerts and crew coordination for your event.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f8fb',
    theme_color: '#5b4df0',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
