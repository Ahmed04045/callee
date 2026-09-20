// src/views/create/PlacePicker.jsx
//
// Location chooser backed by the Google Places API (New) through the same
// @vis.gl/react-google-maps provider + VITE_GOOGLE_MAPS_API_KEY that the
// Discover map uses. Replaces free-typed "location" fields: you search, pick
// a suggestion, and we save the place name, address, place id and lat/lng —
// which is also what makes the event show up as a pin on Discover.
//
// Requires "Places API (New)" to be enabled on the key in Google Cloud. If
// the library can't load or a search fails, the picker says so and (when
// `allowManual`) falls back to a plain text box so posting is never blocked.
//
// value/onChange shape: { name, address, placeId, lat, lng } | null

import React, { useEffect, useRef, useState } from 'react';
import { AdvancedMarker, APIProvider, Map, useMapsLibrary } from '@vis.gl/react-google-maps';
import themeConfig from '../../theme/themeConfig';
import Icon from '../../components/Icon';
import { useFormStyles } from './formKit';
import { DOHA, MAPS_API_KEY as API_KEY, MAP_ID } from '../../lib/maps';

function PickerInner({ value, onChange, allowManual }) {
  const { colors, radius } = themeConfig;
  const { input } = useFormStyles();
  const places = useMapsLibrary('places');
  const [mapOpen, setMapOpen] = useState(false);
  const [mapAuthFailed, setMapAuthFailed] = useState(false);
  const [mapKey, setMapKey] = useState(0); // bumped when a search result should recenter the map
  const [text, setText] = useState(value?.name ?? '');
  const [suggestions, setSuggestions] = useState([]);
  const [searchError, setSearchError] = useState(false);
  const [manual, setManual] = useState(false);
  const sessionToken = useRef(null);
  const requestId = useRef(0);

  // Google calls this global when it rejects the key for the map (referrer not
  // allowed, Maps JavaScript API not enabled, ...). Without it the map just
  // renders as an unexplained gray box.
  useEffect(() => {
    const previous = window.gm_authFailure;
    window.gm_authFailure = () => {
      setMapAuthFailed(true);
      previous?.();
    };
    return () => {
      window.gm_authFailure = previous;
    };
  }, []);

  // Debounced autocomplete. A session token groups keystrokes + the final
  // place fetch into one billing session.
  useEffect(() => {
    if (!places || manual || value || text.trim().length < 3) {
      setSuggestions([]);
      return undefined;
    }
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        if (!sessionToken.current) sessionToken.current = new places.AutocompleteSessionToken();
        const { suggestions: results } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: text,
          sessionToken: sessionToken.current,
          includedRegionCodes: ['qa'],
        });
        if (id === requestId.current) {
          setSuggestions(results.filter((r) => r.placePrediction));
          setSearchError(false);
        }
      } catch {
        if (id === requestId.current) {
          setSuggestions([]);
          setSearchError(true);
        }
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [text, places, value, manual]);

  const choose = async (suggestion) => {
    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location', 'id'] });
      sessionToken.current = null; // session ends once details are fetched
      const picked = {
        name: place.displayName || suggestion.placePrediction.text.text,
        address: place.formattedAddress || '',
        placeId: place.id,
        lat: place.location?.lat() ?? null,
        lng: place.location?.lng() ?? null,
      };
      setText(picked.name);
      setSuggestions([]);
      setMapKey((k) => k + 1);
      setMapOpen(true); // show the pin right away so it can be adjusted
      onChange(picked);
    } catch {
      setSearchError(true);
    }
  };

  // Move/click the pin: keep the searched name, drop the address and place id
  // (they no longer match the exact point) and remember the pin was adjusted.
  // No reverse geocoding on purpose — that would need the Geocoding API.
  const setPin = (lat, lng) => {
    const name = value?.name || 'Pinned location';
    setText(name);
    onChange({ name, address: '', placeId: null, lat, lng, adjusted: true });
  };

  const clear = () => {
    setText('');
    setSuggestions([]);
    onChange(null);
  };

  if (manual) {
    return (
      <div>
        <input
          className={input}
          value={text}
          maxLength={150}
          placeholder="Type the venue or address"
          onChange={(e) => {
            setText(e.target.value);
            onChange(e.target.value.trim() ? { name: e.target.value.trim(), address: '', placeId: null, lat: null, lng: null } : null);
          }}
        />
        <p className={`text-[10px] ${colors.textDim} mt-1`}>Typed locations won't appear as a pin on the Discover map.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Icon name="location_on" size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 mt-0.5 ${colors.textFaint}`} />
        <input
          className={`${input} pl-9 pr-9`}
          value={text}
          maxLength={150}
          placeholder="Search for a place in Qatar"
          onChange={(e) => {
            setText(e.target.value);
            if (value) onChange(null); // editing after picking invalidates the pick
          }}
        />
        {(value || text) && (
          <button type="button" onClick={clear} aria-label="Clear location" className={`absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 ${colors.textFaint}`}>
            <Icon name="close" size={16} />
          </button>
        )}
      </div>

      {suggestions.length > 0 && (
        <ul className={`absolute z-20 left-0 right-0 mt-1 ${colors.bgCardStrong} border ${colors.borderStrong} ${radius.md} overflow-hidden shadow-xl`}>
          {suggestions.map((s) => (
            <li key={s.placePrediction.placeId}>
              <button type="button" onClick={() => choose(s)} className={`w-full text-left px-3 py-2 text-sm ${colors.textPrimary} ${colors.bgHoverInset}`}>
                {s.placePrediction.text.text}
              </button>
            </li>
          ))}
        </ul>
      )}

      {value && (
        <p className={`text-[11px] ${colors.success} mt-1 flex items-center gap-1`}>
          <Icon name="check_circle" size={13} className="text-inherit" /> {value.adjusted ? `${value.name} — pin adjusted` : value.address || value.name}
        </p>
      )}

      <button type="button" onClick={() => setMapOpen((o) => !o)} className={`mt-2 text-[11px] font-semibold ${colors.accent} flex items-center gap-1`}>
        <Icon name="pin_drop" size={14} className="text-inherit" />
        {mapOpen ? 'Hide map' : value ? 'Adjust pin on map' : 'Pick on map'}
      </button>
      {mapOpen && (
        <div className={`mt-2 h-56 ${radius.md} overflow-hidden border ${colors.borderStrong} px-box`}>
          <Map
            key={mapKey}
            mapId={MAP_ID}
            defaultCenter={value?.lat != null ? { lat: value.lat, lng: value.lng } : DOHA}
            defaultZoom={value?.lat != null ? 15 : 11}
            gestureHandling="greedy"
            disableDefaultUI
            onClick={(e) => e.detail.latLng && setPin(e.detail.latLng.lat, e.detail.latLng.lng)}
          >
            {value?.lat != null && (
              <AdvancedMarker
                position={{ lat: value.lat, lng: value.lng }}
                draggable
                onDragEnd={(e) => e.latLng && setPin(e.latLng.lat(), e.latLng.lng())}
              />
            )}
          </Map>
        </div>
      )}
      {mapOpen && mapAuthFailed && (
        <p className={`text-[11px] ${colors.error} mt-1`}>
          Google rejected the key for the map. Check that this site's address (including the port) is in the key's website restrictions and that Maps JavaScript API is enabled.
        </p>
      )}
      {mapOpen && <p className={`text-[10px] ${colors.textDim} mt-1`}>Tap the map or drag the pin to set the exact spot.</p>}
      {!value && text.trim().length >= 3 && suggestions.length === 0 && !searchError && places && (
        <p className={`text-[11px] ${colors.textFaint} mt-1`}>Pick one of the suggestions to set the location.</p>
      )}
      {searchError && (
        <p className={`text-[11px] ${colors.warning} mt-1`}>
          Place search isn't available right now (is Places API enabled for the key?).
          {allowManual && (
            <button type="button" onClick={() => setManual(true)} className={`ml-1 underline ${colors.accent}`}>Type it instead</button>
          )}
        </p>
      )}
    </div>
  );
}

export default function PlacePicker({ value, onChange, allowManual = true }) {
  const { colors } = themeConfig;
  if (!API_KEY) {
    return <p className={`text-xs ${colors.warning} mt-1`}>Add VITE_GOOGLE_MAPS_API_KEY to enable location search.</p>;
  }
  return (
    <APIProvider apiKey={API_KEY}>
      <PickerInner value={value} onChange={onChange} allowManual={allowManual} />
    </APIProvider>
  );
}
