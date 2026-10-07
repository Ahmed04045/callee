import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import themeConfig from '../theme/themeConfig';
import SubPageHeader from '../components/SubPageHeader';
import { PixelEmpty } from '../components/Pixel';
import { formatLongDate } from '../components/FeedCards';
import { useT } from '../i18n';
import usePageMeta from '../lib/usePageMeta';

const STATUS_LABELS = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };

export default function OrganizerView() {
  const { user, status: authStatus } = useAuth();
  const { t } = useT();
  const { colors, radius } = themeConfig;
  const [result, setResult] = useState({ owner: null, status: 'loading', events: [] });
  const [reload, setReload] = useState(0);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  usePageMeta('Organizer hub');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const owner = user.id;
    setResult({ owner, status: 'loading', events: [] });
    (async () => {
      try {
        // Ownership is explicit here; existing RLS remains the authorization layer.
        // No attendee identities or ticket codes are needed for this overview.
        const { data, error } = await supabase.from('events')
          .select('id,title,event_date,start_time,location,status,capacity,spots')
          .eq('posted_by_user_id', owner).order('event_date', { ascending: false });
        if (error) throw error;
        if (!cancelled) setResult({ owner, status: 'ready', events: data ?? [] });
      } catch {
        if (!cancelled) setResult({ owner, status: 'error', events: [] });
      }
    })();
    return () => { cancelled = true; };
  }, [user, reload]);

  const button = `inline-flex items-center justify-center text-xs font-bold px-4 py-2 border ${colors.borderStrong} ${radius.full} ${colors.bgHoverInset}`;
  const events = result.owner === user?.id ? result.events : [];
  const loading = authStatus === 'loading' || (user && (result.owner !== user.id || result.status === 'loading'));
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Qatar', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const shown = events.filter((event) => {
    const matches = `${event.title} ${event.location ?? ''}`.toLowerCase().includes(search.trim().toLowerCase());
    return matches && (filter === 'all' || (filter === 'upcoming' ? event.event_date >= today : filter === 'past' ? event.event_date < today : event.status === filter));
  });

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <SubPageHeader title={t('Organizer hub')} fallbackTo="/" />
      <p className={`text-sm ${colors.textMuted}`}>{t('Your events, guest lists and check-in tools in one place.')}</p>
      {loading ? <p role="status">{t('Loading…')}</p> : !user ? (
        <p>{t('Sign in to manage your events.')} <Link to="/" className={colors.accent}>{t('Home')}</Link></p>
      ) : <>
        <div className="flex flex-wrap gap-2">
          <Link to="/create/event" className={button}>{t('Create event')}</Link>
          <Link to="/my-submissions" className={button}>{t('My Submissions')}</Link>
          <button onClick={() => setReload((n) => n + 1)} className={button}>{t('Refresh')}</button>
        </div>
        {result.status === 'error' ? <p role="alert" className={colors.error}>{t('Could not load your events. Please refresh to try again.')}</p> : <>
          <div className="grid grid-cols-3 gap-3">
            {[
              ['Total events', events.length],
              ['Upcoming events', events.filter((e) => e.event_date >= today && e.status === 'approved').length],
              ['Pending review', events.filter((e) => e.status === 'pending').length],
            ].map(([label, count]) => <div key={label} className={`p-4 border ${colors.border} ${colors.bgCard} ${radius.lg}`}>
              <p className="text-2xl font-bold">{count}</p><p className={`text-xs ${colors.textMuted}`}>{t(label)}</p>
            </div>)}
          </div>
          <div className="flex flex-wrap gap-3">
            <input aria-label={t('Search your events')} placeholder={t('Search your events')} value={search} onChange={(e) => setSearch(e.target.value)} className={`min-w-0 flex-1 p-3 border ${colors.border} ${colors.bgInset} ${radius.md}`} />
            <select aria-label={t('Filter events')} value={filter} onChange={(e) => setFilter(e.target.value)} className={`p-3 border ${colors.border} ${colors.bgInset} ${radius.md}`}>
              {[['all', 'All events'], ['upcoming', 'Upcoming'], ['past', 'Past events'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']].map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
            </select>
          </div>
          {!events.length ? <PixelEmpty sprite="box" title={t('No events yet')}>{t('Create your first event to start welcoming people.')}</PixelEmpty>
            : !shown.length ? <p role="status">{t('No events match your filters.')}</p>
              : <div className="space-y-3">{shown.map((event) => (
                <article key={event.id} className={`p-5 border ${colors.border} ${colors.bgCard} ${radius.lg} space-y-3`}>
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-bold min-w-0 break-words"><Link to={`/events/${event.id}`} className={colors.textHoverAccent}>{event.title}</Link></h2>
                    <span className={`text-xs shrink-0 ${colors.textMuted}`}>{t(STATUS_LABELS[event.status] ?? 'Pending')}</span>
                  </div>
                  <p className={`text-xs ${colors.textMuted}`}>{formatLongDate(event.event_date, event.start_time)} · {event.location}</p>
                  {event.capacity != null && event.spots != null && <p className={`text-xs ${colors.textMuted}`}>{t('{count} of {capacity} seats reserved', { count: Math.max(0, event.capacity - event.spots), capacity: event.capacity })}</p>}
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/events/${event.id}/manage`} className={button}>{t('Manage event')}</Link>
                    {event.status === 'approved' && <Link to={`/events/${event.id}/scan`} className={button}>{t('Scan tickets')}</Link>}
                    <Link to={`/events/${event.id}`} className={button}>{t('View event')}</Link>
                  </div>
                </article>
              ))}</div>}
        </>}
      </>}
    </div>
  );
}
