import type { Metadata } from 'next';
import { Markdown } from '@/components/Markdown';
import { czytajMarkdown } from '@/lib/content';

export const metadata: Metadata = { title: 'Plan kursu' };

export default async function PlanPage() {
  const source = await czytajMarkdown('PLAN-KURSU.md');
  return (
    <div className="page page--reading">
      <Markdown source={source} baseDir="" />
    </div>
  );
}
