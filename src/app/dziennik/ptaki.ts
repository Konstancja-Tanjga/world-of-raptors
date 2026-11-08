import 'server-only';
import { ptakiEuropy, ptakiNaLiscie } from '@/lib/content';
import type { PtakDoWyboru } from '@/components/dziennik/FormularzObserwacji';

/** Every bird the log takes, with the names it is searched by: the course's first, then the rest of Europe's. */
export const ptakiDziennika: PtakDoWyboru[] = [...ptakiNaLiscie, ...ptakiEuropy].map(({ id, pl, lat, en, es }) => ({ id, pl, lat, en, es }));
