'use client';

import { kluczLekcji, usePostep } from '@/lib/postep';

/**
 * A module's progress as a small ring and "2 z 5". Shown once the browser
 * copy of progress has been read; before that the card simply has no ring,
 * so nothing shows a guessed state.
 */
export function PostepModulu({ slug, lekcje }: { slug: string; lekcje: string[] }) {
  const { postep } = usePostep();
  if (!postep) return null;
  const gotowe = lekcje.filter((l) => postep[kluczLekcji(slug, l)]).length;
  const udzial = lekcje.length ? gotowe / lekcje.length : 0;
  const obwod = 2 * Math.PI * 9;
  return (
    <span className="postep-modulu" data-gotowy={gotowe === lekcje.length ? '' : undefined}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" className="postep-modulu__tor" />
        <circle
          cx="12"
          cy="12"
          r="9"
          className="postep-modulu__luk"
          strokeDasharray={`${udzial * obwod} ${obwod}`}
          transform="rotate(-90 12 12)"
        />
      </svg>
      <span>
        {gotowe === lekcje.length ? 'Zaliczony' : `${gotowe} z ${lekcje.length}`}
        <span className="visually-hidden"> lekcji ukończonych</span>
      </span>
    </span>
  );
}
