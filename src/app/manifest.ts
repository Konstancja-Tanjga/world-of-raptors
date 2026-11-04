import type { MetadataRoute } from 'next';

/** Lets a phone add the course to its home screen, under its own name and icon, in the paper colour. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'World of Raptors',
    short_name: 'Raptors',
    description: 'Kurs o ptakach drapieżnych: jak je rozpoznać w terenie, od Polski po Cieśninę Gibraltarską.',
    lang: 'pl',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8f3e9',
    theme_color: '#f8f3e9',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
