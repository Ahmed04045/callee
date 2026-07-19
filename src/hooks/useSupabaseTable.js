// src/hooks/useSupabaseTable.js
//
// One hook, every view. Handles the loading/error/data dance for a simple
// `select` query so individual views don't each reimplement it. For
// anything more complex than a filtered/ordered select (joins, RPC calls),
// query supabase directly in the view instead of stretching this hook.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

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
  const [data, setData] = useState([]);
  const [status, setStatus] = useState(enabled ? 'loading' : 'idle'); // 'idle' | 'loading' | 'ready' | 'error'
  const [error, setError] = useState(null);

  const filterKey = JSON.stringify(filters ?? {});

  const load = useCallback(async () => {
    if (!enabled) {
      setData([]);
      setStatus('idle');
      return;
    }

    setStatus('loading');
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

    setData(rows ?? []);
    setStatus('ready');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, select, orderBy, ascending, filterKey, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, status, error, refetch: load };
}

export default useSupabaseTable;
