import Link from 'next/link';
import type { ReactNode } from 'react';
import type { ButtonSize, ButtonVariant } from '@bighat/ui';

/**
 * LOCAL component, not part of Big Hat: navigation that looks like a Button.
 *
 * Big Hat's Button contract lists "navigation to another page" under notFor:
 * a <button> breaks middle-click, cmd-click, copy-link and history. So this is
 * a real link wearing the system's own button classes, which keeps the look
 * and focus ring identical while staying an anchor. See TECH.md.
 */
export function ButtonLink({
  href,
  children,
  variant = 'primary',
  size = 'md',
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <Link
      href={href}
      className={`bh-button bh-button--${variant} bh-button--${size} bh-focusable button-link`}
    >
      {children}
    </Link>
  );
}
