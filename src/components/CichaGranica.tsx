'use client';

import { Component, type ReactNode } from 'react';

/**
 * An error boundary for a helper that shows nothing of its own (the "Moje
 * niebo" watcher): if it fails, it logs and steps aside, so the page around
 * it keeps working instead of falling to the global error page.
 */
export class CichaGranica extends Component<{ nazwa: string; children: ReactNode }, { blad: boolean }> {
  state = { blad: false };

  static getDerivedStateFromError() {
    return { blad: true };
  }

  componentDidCatch(error: unknown) {
    console.error(`[${this.props.nazwa}] failed; the page goes on without it`, error);
  }

  render() {
    return this.state.blad ? null : this.props.children;
  }
}
