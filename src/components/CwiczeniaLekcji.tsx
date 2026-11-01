'use client';

import dynamic from 'next/dynamic';

/**
 * The client components of B7's, A9's and B8's lesson tags, each in its own chunk. Markdown
 * renders every lesson and is imported by most pages, so importing them
 * there directly would ship them (and the silhouette generator the morphs
 * need) everywhere; a server component's dynamic import does not split code,
 * so the split happens here. They still render on the server.
 */
export const MorfGrup = dynamic(() => import('./start/MorfGrup').then((m) => m.MorfGrup));
export const SuwakMorfu = dynamic(() => import('./SuwakMorfu').then((m) => m.SuwakMorfu));
export const PtasiaMiarka = dynamic(() => import('./PtasiaMiarka').then((m) => m.PtasiaMiarka));
export const ZgadnijSylwetke = dynamic(() => import('./ZgadnijSylwetke').then((m) => m.ZgadnijSylwetke));
export const Model3D = dynamic(() => import('./Model3D').then((m) => m.Model3D));
export const PunktObserwacyjny = dynamic(() => import('./punkt/PunktObserwacyjny').then((m) => m.PunktObserwacyjny));
export const Komin = dynamic(() => import('./punkt/Komin').then((m) => m.Komin));
