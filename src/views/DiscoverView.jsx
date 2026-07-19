// src/views/DiscoverView.jsx
//
// Mock-rendered map, real data. Pin data comes from useMapPins fed by a
// live `events` query — dropping in the real Google Maps SDK later means
// implementing useMapPins differently; this component's JSX stays as-is.

import React from 'react';
import { Map, MapPin } from 'lucide-react';
import themeConfig from '../theme/themeConfig';
import { useMapPins } from '../hooks/useMapPins';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import { logUserAction } from '../components/TelemetryLog';

export default function DiscoverView() {
  const { colors, radius } = themeConfig;
  const { data: events, status: eventsStatus } = useSupabaseTable('events', {
    orderBy: 'event_date',
  });
  const { pins, status: pinStatus } = useMapPins(events);

  const handlePinClick = (pin) => {
    logUserAction('MAP_PIN_CLICK', { eventId: pin.id, title: pin.label });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Map surface */}
      <div className="md:col-span-2 space-y-6">
        <div className={`border-b ${colors.border} pb-3 flex items-center gap-2`}>
          <Map size={18} className={colors.accent} />
          <h2 className={`text-lg font-bold ${colors.textWhite}`}>Interactive Discovery</h2>
        </div>

        <div
          className={`w-full h-80 ${colors.bgPanel} border ${colors.borderStrong} ${radius.lg} relative overflow-hidden flex items-center justify-center`}
        >
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

          {pinStatus === 'ready' &&
            pins.map((pin) => (
              <button
                key={pin.id}
                onClick={() => handlePinClick(pin)}
                style={{ top: pin.mockPosition.top, left: pin.mockPosition.left }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 ${colors.accentBg} ${colors.accentOn} p-2 ${radius.full} font-bold shadow-lg text-xs flex items-center gap-1 hover:scale-105 transition`}
              >
                <MapPin size={12} /> <span>{pin.label}</span>
              </button>
            ))}

          <p
            className={`text-xs ${colors.textFaint} z-10 font-mono tracking-widest uppercase ${colors.bgPill} px-3 py-1.5 ${radius.md} border ${colors.borderStrong}`}
          >
            {eventsStatus === 'loading' ? 'Loading events…' : 'Native Map SDK slot — mock view'}
          </p>
        </div>

        <p className={`text-[11px] ${colors.textDim} leading-relaxed`}>
          Locations shown are approximate until an event listing is confirmed. Meet at public,
          organizer-verified venues and let a parent or guardian know your plans.
        </p>
      </div>

      {/* Nearby list */}
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
          <p className="text-xs text-red-400">Couldn't load events. Try refreshing.</p>
        )}
        {eventsStatus === 'ready' && events.length === 0 && (
          <p className={`text-xs ${colors.textFaint}`}>No nearby events posted yet.</p>
        )}

        {events.map((event) => (
          <div
            key={event.id}
            className={`${colors.bgCardStrong} border ${colors.border} ${radius.md} p-4 flex gap-3 items-start`}
          >
            <div
              className={`p-2 ${colors.bgPill} border ${colors.borderStrong} ${radius.sm} ${colors.accent} shrink-0`}
            >
              <MapPin size={16} />
            </div>
            <div>
              <h4 className={`text-xs font-bold ${colors.textWhite}`}>{event.title}</h4>
              <p className={`text-[11px] ${colors.textFaint} mt-0.5`}>{event.location}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}