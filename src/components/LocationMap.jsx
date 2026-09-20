// src/components/LocationMap.jsx
//
// Read-only map preview for a listing's location. Clicking anywhere on it
// opens the place in Google Maps (a plain link — no extra API needed). If the
// listing has no coordinates (typed location, older rows), it falls back to a
// "Open in Google Maps" link that searches by name.

import React from 'react';
import { AdvancedMarker, APIProvider, Map } from '@vis.gl/react-google-maps';
import themeConfig from '../theme/themeConfig';
import Icon from './Icon';
import { MAPS_API_KEY, MAP_ID, googleMapsUrl } from '../lib/maps';

export default function LocationMap({ name, lat, lng, placeId, height = 'h-44' }) {
  const { colors, radius } = themeConfig;
  const hasCoords = lat != null && lng != null;
  const href = googleMapsUrl({ name, lat, lng, placeId });

  if (!name && !hasCoords) return null;

  if (!hasCoords || !MAPS_API_KEY) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${colors.accent}`}
      >
        <Icon name="map" size={14} /> Open in Google Maps
      </a>
    );
  }

  return (
    <div className={`relative ${height} w-full ${radius.md} overflow-hidden border ${colors.border} px-box`}>
      <APIProvider apiKey={MAPS_API_KEY}>
        <Map
          mapId={MAP_ID}
          defaultCenter={{ lat, lng }}
          defaultZoom={15}
          gestureHandling="none"
          disableDefaultUI
          clickableIcons={false}
        >
          <AdvancedMarker position={{ lat, lng }} />
        </Map>
      </APIProvider>
      {/* Covers the map so a tap/click always opens Google Maps instead of panning it. */}
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open ${name || 'this location'} in Google Maps`}
        className="absolute inset-0 flex items-end justify-start p-2"
      >
        <span className={`flex items-center gap-1 text-[11px] font-semibold ${colors.textWhite} ${colors.bgCardStrong} border ${colors.borderStrong} ${radius.full} px-2.5 py-1 shadow`}>
          <Icon name="open_in_new" size={12} className="text-inherit" /> Open in Google Maps
        </span>
      </a>
    </div>
  );
}
