// src/hooks/useMapPins.js
//
// Isolates "where do pins come from" from "how pins are drawn."
// DiscoverView only ever consumes { pins, status } from this hook. Today
// it normalizes local mock data; later it can call the Google Maps SDK,
// a geocoding endpoint, or a live events API and DiscoverView's render
// code will not need to change.

import { useEffect, useMemo, useState } from 'react';

/**
 * @param {Array<{id:string,title:string,location:string,coordinates:{lat:number,lng:number},tag?:string}>} sourceEvents
 */
export function useMapPins(sourceEvents = []) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'ready' | 'error'

  const pins = useMemo(
    () =>
      sourceEvents.map((event, index) => ({
        id: event.id,
        label: event.title,
        location: event.location,
        tag: event.tag,
        coordinates: event.coordinates,
        // Deterministic mock screen-position so the placeholder map looks
        // intentional instead of random on every render. A real SDK
        // integration would replace this with a lat/lng -> pixel projection.
        mockPosition: MOCK_POSITIONS[index % MOCK_POSITIONS.length],
      })),
    [sourceEvents]
  );

  useEffect(() => {
    setStatus('loading');
    // Placeholder for an async load (SDK init, geocoding, fetch...).
    const timer = setTimeout(() => setStatus('ready'), 200);
    return () => clearTimeout(timer);
  }, [sourceEvents]);

  return { pins, status };
}

const MOCK_POSITIONS = [
  { top: '25%', left: '33%' },
  { top: '62%', left: '70%' },
  { top: '45%', left: '18%' },
  { top: '70%', left: '45%' },
];

export default useMapPins;
