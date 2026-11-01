import { jsonLd } from '@/lib/seo';

/** Schema.org structured data for search engines, rendered on the server into the page. */
export function DaneStrukturalne({ dane }: { dane: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(dane) }} />;
}
