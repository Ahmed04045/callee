import React from 'react';
import { useNavigate } from 'react-router-dom';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import themeConfig from '../theme/themeConfig';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import { logUserAction } from '../components/TelemetryLog';
import Icon from '../components/Icon';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
// Default center set to Doha, Qatar
const DEFAULT_CENTER = { lat: 25.2854, lng: 51.5310 };

export default function DiscoverView() {
  const { colors, radius } = themeConfig;
  const navigate = useNavigate();

  const { data: events, status: eventsStatus } = useSupabaseTable('events', {
    orderBy: 'event_date',
  });

  const handlePinClick = (event) => {
    logUserAction('MAP_PIN_CLICK', { eventId: event.id, title: event.title });
    navigate(`/events/${event.id}`);
  };

  return (
    <APIProvider apiKey={API_KEY}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Map Surface */}
        <div className="md:col-span-2 space-y-6">
          <div className={`border-b ${colors.border} pb-3 flex items-center gap-2`}>
            <Icon name="map" size={18} className={colors.accent} />
            <h2 className={`text-lg font-bold ${colors.textWhite}`}>Interactive Discovery</h2>
          </div>

          <div
            className={`w-full h-80 ${colors.bgPanel} border ${colors.borderStrong} ${radius.lg} relative overflow-hidden`}
          >
            {eventsStatus === 'loading' ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className={`text-xs ${colors.textFaint} z-10 uppercase ${colors.bgPill} px-3 py-1.5 ${radius.md} border ${colors.borderStrong}`}>
                  Loading map & events…
                </p>
              </div>
            ) : (
              <Map
                defaultCenter={DEFAULT_CENTER}
                defaultZoom={12}
                mapId="povolum_dark_map" // Set up dark map styling in Google Cloud Console
                gestureHandling="greedy"
                disableDefaultUI={true}
              >
                {events.map((event) => {
                  if (!event.lat || !event.lng) return null;
                  return (
                    <AdvancedMarker
                      key={event.id}
                      position={{ lat: event.lat, lng: event.lng }}
                      onClick={() => handlePinClick(event)}
                      title={event.title}
                    >
                      <Pin
                        background="#6750A4"
                        borderColor="#ffffff"
                        glyphColor="#ffffff"
                      />
                    </AdvancedMarker>
                  );
                })}
              </Map>
            )}
          </div>

          <p className={`text-[11px] ${colors.textDim} leading-relaxed`}>
            Locations shown are approximate until an event listing is confirmed. Meet at public,
            organizer-verified venues and let a parent or guardian know your plans.
          </p>
        </div>

        {/* Nearby List */}
        <div className="space-y-4">
          <div className={`border-b ${colors.border} pb-3`}>
            <h3 className={`text-sm font-bold ${colors.textMuted} uppercase tracking-wider`}>
              Nearby You
            </h3>
          </div>

          {eventsStatus === 'loading' && (
            <p className={`text-xs ${colors.textFaint}`}>Loading events…</p>
          )}
          {eventsStatus === 'error' && (
            <p className={`text-xs ${colors.error}`}>Couldn't load events. Try refreshing.</p>
          )}
          {eventsStatus === 'ready' && events.length === 0 && (
            <p className={`text-xs ${colors.textFaint}`}>No nearby events posted yet.</p>
          )}

          {events.map((event) => (
            <div
              key={event.id}
              onClick={() => navigate(`/events/${event.id}`)}
              className={`${colors.bgCardStrong} border ${colors.border} ${radius.md} p-4 flex gap-3 items-start cursor-pointer ${colors.borderHover} transition`}
            >
              <div
                className={`p-2 ${colors.accentSoftBg} border ${colors.accentBorder} ${radius.sm} ${colors.accent} shrink-0`}
              >
                <Icon name="location_on" size={16} />
              </div>
              <div>
                <h4 className={`text-xs font-bold ${colors.textWhite}`}>{event.title}</h4>
                <p className={`text-[11px] ${colors.textFaint} mt-0.5`}>{event.location}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </APIProvider>
  );
}