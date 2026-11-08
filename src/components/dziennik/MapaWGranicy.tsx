'use client';

import dynamic from 'next/dynamic';
import { Component, type ComponentProps, type ReactNode } from 'react';
import { StateBlock } from '../ds';

const MapaPunktow = dynamic(() => import('./MapaPunktow'), {
  ssr: false,
  loading: () => <StateBlock state="loading" title="Wczytywanie mapy" scope="section" />,
});

/**
 * Leaflet arrives only when the map is first opened. In the field the signal
 * may be gone by then; without this boundary the failed chunk would reach
 * error.tsx and take the whole form, and what was typed, with it.
 */
class GranicaMapy extends Component<{ children: ReactNode; zastepczy: ReactNode }, { blad: boolean }> {
  state = { blad: false };

  static getDerivedStateFromError() {
    return { blad: true };
  }

  componentDidCatch(err: unknown) {
    console.error('[dziennik] the map could not load', err);
  }

  render() {
    return this.state.blad ? this.props.zastepczy : this.props.children;
  }
}

/** The map, or an error in its place when it cannot load; `opisBledu` says what to do instead. */
export function MapaWGranicy({ opisBledu, ...props }: ComponentProps<typeof MapaPunktow> & { opisBledu: string }) {
  return (
    <GranicaMapy zastepczy={<StateBlock state="error" title="Mapa się nie wczytała" description={opisBledu} scope="section" />}>
      <MapaPunktow {...props} />
    </GranicaMapy>
  );
}
