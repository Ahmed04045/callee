// src/components/TelemetryLog.js
//
// Minimal event-logging wrapper. Every call point in the app should funnel
// through `logUserAction` instead of calling console.log directly, so that
// swapping this for a real analytics dispatch (e.g. POST to /api/telemetry)
// later is a one-file change.
//
// NOTE ON MINOR USERS: Povolum's audience is teens. Before wiring this up to
// a real backend, make sure whatever is collected here (action type +
// payload) is limited to what's actually needed, is covered by a clear
// privacy policy, and follows applicable youth-data-privacy rules for
// wherever the app operates (e.g. parental notice/consent requirements).
// Avoid logging free-text search queries or precise location data as-is;
// consider aggregating or truncating first.

/**
 * Log a structured user action.
 * @param {string} actionType - short, SCREAMING_SNAKE_CASE event name, e.g. 'SEARCH_SUBMIT'
 * @param {Record<string, unknown>} [payload] - small, serializable event details
 * @returns {{action: string, payload: object, timestamp: string}} the logged entry
 */
export function logUserAction(actionType, payload = {}) {
  const entry = {
    action: actionType,
    payload,
    timestamp: new Date().toISOString(),
  };

  const readablePayload = Object.entries(payload)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' | ');

  // Swap this console.log for a real dispatch (fetch/beacon/queue) when a
  // telemetry backend exists. Keep the call signature identical.
  console.log(
    `[TELEMETRY] Action: ${actionType}${readablePayload ? ` | ${readablePayload}` : ''}`,
    entry
  );

  return entry;
}

export default logUserAction;