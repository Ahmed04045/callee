// src/hooks/useSupabaseTable.js
//
// One hook, every view. Handles the loading/error/data dance for a simple
// `select` query so individual views don't each reimplement it.
//
// Caching: React Router unmounts a view's component every time you
// navigate away from its tab, and remounts a fresh instance when you come
// back — so plain useState-only data resets to empty and refetches from
// scratch on every single revisit, which is what was showing as "the feed
// reloads and flashes Loading every time I come back to it."
//
// Fix: a plain in-memory Map living at module scope (outside the hook, so
// it survives component unmount/remount, but resets on a real page
// reload — which is correct, that's a fresh session). On mount, if a
// previous result for this exact query is cached, render it immediately
// (no loading flash) and quietly refetch in the background to catch
// anything that changed (stale-while-revalidate). First-ever visit to a
// given query still shows a real loading state, same as before.
//
// This is intentionally simple — no TTL/expiry, no size limit. Fine for
// this app's query variety; swap for React Query/SWR later if that stops
// being true.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const queryCache = new Map();

function buildCacheKey(table, select, orderBy, ascending, filterKey) {
  return `${table}::${select}::${orderBy ?? ''}::${ascending}::${filterKey}`;
}

/**
 * @param {string} table - table name
 * @param {object} [options]
 * @param {string} [options.select] - PostgREST select string, default '*'
 * @param {string} [options.orderBy] - column to order by
 * @param {boolean} [options.ascending] - order direction, default true
 * @param {Record<string, any>} [options.filters] - equality filters, e.g. { featured: true }
 * @param {boolean} [options.enabled] - skip fetching until this is true (e.g. waiting on a user id)
 */
export function useSupabaseTable(
  table,
  { select = '*', orderBy, ascending = true, filters, enabled = true } = {}
) {
  const filterKey = JSON.stringify(filters ?? {});
  const cacheKey = buildCacheKey(table, select, orderBy, ascending, filterKey);
  const cached = queryCache.get(cacheKey);

  // Lazy-seeded from cache: renders the previous result instantly on
  // revisit instead of an empty/loading state. Only used on first mount —
  // React ignores this value on re-renders.
  const [data, setData] = useState(() => cached?.data ?? []);
  const [status, setStatus] = useState(() => (cached ? 'ready' : enabled ? 'loading' : 'idle'));
  const [error, setError] = useState(null);

  const load = useCallback(
    async (isBackgroundRefresh = false) => {
      if (!enabled) {
        setData([]);
        setStatus('idle');
        return;
      }

      // A background revalidation of already-cached data shouldn't flash
      // the UI back to a loading state — only show it when we truly have
      // nothing to display yet.
      if (!isBackgroundRefresh) setStatus('loading');
      setError(null);

      let query = supabase.from(table).select(select);
      if (orderBy) query = query.order(orderBy, { ascending });
      if (filters) {
        Object.entries(filters).forEach(([column, value]) => {
          query = query.eq(column, value);
        });
      }

      const { data: rows, error: queryError } = await query;

      if (queryError) {
        setError(queryError.message);
        setStatus('error');
        return;
      }

      queryCache.set(cacheKey, { data: rows ?? [] });
      setData(rows ?? []);
      setStatus('ready');
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [table, select, orderBy, ascending, filterKey, enabled, cacheKey]
  );

  useEffect(() => {
    if (queryCache.has(cacheKey)) {
      const entry = queryCache.get(cacheKey);
      setData(entry.data);
      setStatus('ready');
      load(true); // quiet background refresh
    } else {
      load(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, load]);

  const refetch = useCallback(() => load(false), [load]);

  return { data, status, error, refetch };
}

export default useSupabaseTable;