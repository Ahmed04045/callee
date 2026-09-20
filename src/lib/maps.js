// src/lib/maps.js
//
// Shared Google Maps settings. One key (VITE_GOOGLE_MAPS_API_KEY) serves the
// Discover map, the Create location picker and the location maps on detail
// pages. Opening a place in Google Maps uses a plain URL, so it needs no
// extra API or billing.

export const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
// Advanced markers need a Map ID; DEMO_MAP_ID works until you create your own in Google Cloud.
export const MAP_ID = import.meta.env.VITE_GOOGLE_MAP_ID || 'DEMO_MAP_ID';
export const DOHA = { lat: 25.2854, lng: 51.531 };

/** Link that opens the place (or, failing that, a search for its name) in Google Maps. */
export function googleMapsUrl({ name, lat, lng, placeId }) {
  const hasCoords = lat != null && lng != null;
  const query = hasCoords ? `${lat},${lng}` : encodeURIComponent(name || '');
  return `https://www.google.com/maps/search/?api=1&query=${query}${placeId ? `&query_place_id=${encodeURIComponent(placeId)}` : ''}`;
}
