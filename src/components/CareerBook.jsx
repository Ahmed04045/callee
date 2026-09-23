// src/components/CareerBook.jsx
//
// A personal profile's Receipts: structured proof-of-work entries
// (projects, experience, achievements, competitions, leadership,
// milestones) — the name is on-screen only, the table underneath is still
// career_entries. `CareerBookSection` renders the list — editable on your
// own profile, read-only on someone else's — and owns the add/edit/delete
// calls itself so a page just has to pass it the entries it already loaded.
// `CareerEntryModal` is the two-step dialog (pick a type, then fill it in)
// used to add or edit one entry.
//
// The people who actually read this are gig/event posters deciding on an
// applicant, not a separate company-facing product — see
// src/lib/careerBook.js for the type list.
//
// `CVImportModal` sends a CV to the parse-cv Edge Function (Gemini reads
// it), then shows what came back for the person to pick through and edit —
// nothing is saved until they confirm. Needs GEMINI_API_KEY set on that
// function; see the README's "Import from CV" section.

import { useState } from 'react';
import themeConfig from '../theme/themeConfig';
import { supabase } from '../lib/supabaseClient';
import { CAREER_KINDS, kindMeta, kindFields, dateRange } from '../lib/careerBook';
import Icon from './Icon';
import { useT } from '../i18n';

const inputClass = (colors, radius) =>
  `w-full ${colors.bgInset} border ${colors.borderStrong} ${radius.md} px-3 py-2.5 text-sm ${colors.textPrimary} focus:outline-none focus:border-md3-primary`;

export function CareerEntryModal({ entry, onSubmit, onClose, inline = false }) {
  const { t } = useT();
  const { colors, radius } = themeConfig;
  const [kind, setKind] = useState(entry?.kind ?? null);
  const [title, setTitle] = useState(entry?.title ?? '');
  const [organization, setOrganization] = useState(entry?.organization ?? '');
  const [role, setRole] = useState(entry?.role ?? '');
  const [description, setDescription] = useState(entry?.description ?? '');
  const [link, setLink] = useState(entry?.link ?? '');
  const [startDate, setStartDate] = useState(entry?.start_date ?? '');
  const [endDate, setEndDate] = useState(entry?.end_date ?? '');
  const [isOngoing, setIsOngoing] = useState(entry?.is_ongoing ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const input = inputClass(colors, radius);
  const meta = kind ? kindMeta(kind) : null;
  const fields = kind ? kindFields(kind) : null;
  const showOrg = fields?.organization?.label != null;
  const showRole = fields?.role?.label != null;

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return setError(t('Give it a title.'));
    setError('');
    setBusy(true);
    const problem = await onSubmit({
      kind,
      title: title.trim(),
      organization: organization.trim() || null,
      role: role.trim() || null,
      description: description.trim() || null,
      link: link.trim() || null,
      start_date: startDate || null,
      end_date: isOngoing ? null : endDate || null,
      is_ongoing: isOngoing,
    });
    setBusy(false);
    if (problem) setError(problem);
  };

  const content = (
    <>
        <div className="flex items-start justify-between gap-4">
          <h2 className={`text-lg font-bold ${colors.textWhite}`}>{entry?.id ? t('Edit entry') : t('Add a receipt')}</h2>
          {onClose && (
            <button type="button" onClick={onClose} aria-label={t('Close')} className={colors.textFaint}>
              <Icon name="close" size={20} />
            </button>
          )}
        </div>

        {!meta ? (
          <div className="space-y-2">
            <p className={`text-xs ${colors.textFaint}`}>{t('Document meaningful work so posters can see what you have actually done.')}</p>
            {CAREER_KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setKind(k.id)}
                className={`w-full flex items-start gap-4 text-start ${colors.bgCard} border ${colors.borderStrong} ${radius.lg} p-3.5 hover:border-md3-primary transition`}
              >
                <div className={`${colors.accentSoftBg} ${colors.accent} p-2.5 ${radius.md} shrink-0`}>
                  <Icon name={k.icon} size={18} className="text-inherit" />
                </div>
                <div>
                  <p className={`text-sm font-bold ${colors.textWhite}`}>{t(k.label)}</p>
                  <p className={`text-xs ${colors.textFaint} mt-0.5`}>{t(k.hint)}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {!entry?.id && (
              <button type="button" onClick={() => setKind(null)} className={`flex items-center gap-1 text-xs font-semibold ${colors.accent}`}>
                <Icon name="arrow_back" size={14} /> {t(meta.label)}
              </button>
            )}

            <label className="block">
              <span className={`text-xs font-semibold ${colors.textWhite}`}>{t(fields.title.label)}</span>
              <input className={`${input} mt-1.5`} required maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t(fields.title.placeholder)} />
            </label>

            {(showOrg || showRole) && (
              <div className="grid grid-cols-2 gap-2">
                {showOrg && (
                  <label className="block">
                    <span className={`text-xs font-semibold ${colors.textWhite}`}>{t(fields.organization.label)}</span>
                    <input className={`${input} mt-1.5`} maxLength={100} placeholder={t(fields.organization.placeholder ?? '')} value={organization} onChange={(e) => setOrganization(e.target.value)} />
                  </label>
                )}
                {showRole && (
                  <label className="block">
                    <span className={`text-xs font-semibold ${colors.textWhite}`}>{t(fields.role.label)}</span>
                    <input className={`${input} mt-1.5`} maxLength={100} placeholder={t(fields.role.placeholder ?? '')} value={role} onChange={(e) => setRole(e.target.value)} />
                  </label>
                )}
              </div>
            )}

            {fields.showDates && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className={`text-xs font-semibold ${colors.textWhite}`}>{t('Started')}</span>
                    <input type="date" className={`${input} mt-1.5`} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </label>
                  <label className={`block ${isOngoing ? 'opacity-40' : ''}`}>
                    <span className={`text-xs font-semibold ${colors.textWhite}`}>{t('Ended')}</span>
                    <input type="date" disabled={isOngoing} className={`${input} mt-1.5`} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </label>
                </div>
                <label className={`flex items-center gap-2 text-xs ${colors.textMuted}`}>
                  <input type="checkbox" checked={isOngoing} onChange={(e) => setIsOngoing(e.target.checked)} className="accent-md3-primary" /> {t('Still ongoing')}
                </label>
              </>
            )}

            <label className="block">
              <span className={`text-xs font-semibold ${colors.textWhite}`}>{t('Description (optional)')}</span>
              <textarea className={`${input} mt-1.5 resize-none`} rows={3} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>

            <label className="block">
              <span className={`text-xs font-semibold ${colors.textWhite}`}>{t(fields.link.label)}</span>
              <input className={`${input} mt-1.5`} maxLength={300} placeholder={t(fields.link.placeholder)} value={link} onChange={(e) => setLink(e.target.value)} />
            </label>

            {error && <p className={`text-xs ${colors.error}`}>{error}</p>}
            <button disabled={busy} className={`w-full ${colors.accentBg} ${colors.accentOn} font-bold text-sm py-2.5 ${radius.full} disabled:opacity-50`}>
              {busy ? t('Saving…') : entry?.id ? t('Save changes') : t('Add entry')}
            </button>
          </form>
        )}
    </>
  );

  if (inline) return content;

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/60 sm:px-4 animate-modal-backdrop" role="dialog" aria-modal="true" aria-label={t('Add entry')} onClick={onClose}>
      <div className={`w-full sm:max-w-lg max-h-[92vh] overflow-y-auto ${colors.bgCardStrong} border ${colors.borderStrong} ${radius.lg} p-5 space-y-5 animate-modal-in`} onClick={(e) => e.stopPropagation()}>
        {content}
      </div>
    </div>
  );
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}

const MAX_CV_BYTES = 8 * 1024 * 1024;

export function CVImportModal({ userId, onImported, onClose }) {
  const { t, locale } = useT();
  const { colors, radius } = themeConfig;
  const [file, setFile] = useState(null);
  const [pastedText, setPastedText] = useState('');
  const [proposals, setProposals] = useState(null); // null = not parsed yet
  const [checked, setChecked] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const input = inputClass(colors, radius);

  const parse = async () => {
    setError('');
    if (!file && !pastedText.trim()) return setError(t('Upload a CV file (PDF) or paste its text.'));
    if (file && file.size > MAX_CV_BYTES) return setError(t('That file is too large — 8MB max.'));
    setBusy(true);
    const body = file ? { fileBase64: await fileToBase64(file), mimeType: file.type || 'application/pdf' } : { text: pastedText.trim() };
    const { data, error: fnError } = await supabase.functions.invoke('parse-cv', { body });
    setBusy(false);
    if (fnError || data?.error) return setError(data?.error || fnError?.message || t('Something went wrong.'));
    if (!data.entries?.length) return setError(t("Couldn't find anything usable in that CV."));
    setProposals(data.entries);
    setChecked(Object.fromEntries(data.entries.map((_, i) => [i, true])));
  };

  const save = async () => {
    const picked = proposals.filter((_, i) => checked[i]);
    if (!picked.length) return setError(t('Pick at least one entry to add.'));
    setBusy(true);
    const { error: insertError } = await supabase.from('career_entries').insert(picked.map((p) => ({ user_id: userId, ...p })));
    setBusy(false);
    if (insertError) return setError(insertError.message);
    onImported();
  };

  return (
    <div className="fixed inset-0 z-[91] flex items-end sm:items-center justify-center bg-black/60 sm:px-4 animate-modal-backdrop" role="dialog" aria-modal="true" aria-label={t('Import from CV')} onClick={onClose}>
      <div className={`w-full sm:max-w-lg max-h-[92vh] overflow-y-auto ${colors.bgCardStrong} border ${colors.borderStrong} ${radius.lg} p-5 space-y-5 animate-modal-in`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <h2 className={`text-lg font-bold ${colors.textWhite}`}>{t('Import from CV')}</h2>
          <button type="button" onClick={onClose} aria-label={t('Close')} className={colors.textFaint}>
            <Icon name="close" size={20} />
          </button>
        </div>

        {!proposals ? (
          <div className="space-y-4">
            <p className={`text-xs ${colors.textFaint}`}>{t('Upload your CV and we’ll suggest receipts from it — review and edit before anything is saved.')}</p>
            <label className={`flex items-center gap-3 p-3 ${colors.bgInset} border ${colors.border} ${radius.md} cursor-pointer`}>
              <Icon name="upload_file" size={18} className={colors.accent} />
              <span className={`text-sm ${colors.textWhite} truncate`}>{file ? file.name : t('Choose a PDF')}</span>
              <input type="file" accept="application/pdf" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPastedText(''); }} />
            </label>
            <p className={`text-[11px] ${colors.textFaint} text-center`}>{t('or')}</p>
            <textarea
              className={`${input} resize-none`}
              rows={5}
              placeholder={t('Paste your CV as text instead')}
              value={pastedText}
              onChange={(e) => { setPastedText(e.target.value); setFile(null); }}
            />
            {error && <p className={`text-xs ${colors.error}`}>{error}</p>}
            <button type="button" onClick={parse} disabled={busy} className={`w-full ${colors.accentBg} ${colors.accentOn} font-bold text-sm py-2.5 ${radius.full} disabled:opacity-50`}>
              {busy ? t('Reading…') : t('Read my CV')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className={`text-xs ${colors.textFaint}`}>{t('Uncheck anything that’s not right — you can edit every entry after adding it.')}</p>
            <div className="space-y-2">
              {proposals.map((p, i) => {
                const meta = kindMeta(p.kind);
                const range = dateRange(p, t, locale);
                return (
                  <label key={i} className={`flex items-start gap-3 ${colors.bgCardSoft} border ${checked[i] ? 'border-md3-primary' : colors.border} ${radius.md} p-3 cursor-pointer`}>
                    <input type="checkbox" checked={Boolean(checked[i])} onChange={(e) => setChecked((prev) => ({ ...prev, [i]: e.target.checked }))} className="mt-1 accent-md3-primary shrink-0" />
                    <div className="min-w-0">
                      <p className={`text-[10px] font-mono font-bold uppercase tracking-wider ${colors.textFaint}`}>{t(meta.label)}</p>
                      <p className={`text-sm font-bold ${colors.textWhite}`}>{p.title}</p>
                      {(p.role || p.organization) && <p className={`text-xs ${colors.textMuted}`}>{[p.role, p.organization].filter(Boolean).join(' · ')}</p>}
                      {range && <p className={`text-[11px] ${colors.textFaint}`}>{range}</p>}
                    </div>
                  </label>
                );
              })}
            </div>
            {error && <p className={`text-xs ${colors.error}`}>{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setProposals(null)} className={`flex-1 border ${colors.borderStrong} ${colors.textWhite} font-bold text-sm py-2.5 ${radius.full}`}>
                {t('Back')}
              </button>
              <button type="button" onClick={save} disabled={busy} className={`flex-1 ${colors.accentBg} ${colors.accentOn} font-bold text-sm py-2.5 ${radius.full} disabled:opacity-50`}>
                {busy ? t('Saving…') : t('Add selected')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function CareerBookSection({ userId, entries, own, onChanged }) {
  const { t, locale } = useT();
  const { colors, radius } = themeConfig;
  const [modalEntry, setModalEntry] = useState(undefined); // undefined = closed, null = new, object = editing
  const [importOpen, setImportOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const save = async (payload) => {
    if (modalEntry?.id) {
      const { error } = await supabase.from('career_entries').update(payload).eq('id', modalEntry.id);
      if (error) return error.message;
    } else {
      const { error } = await supabase.from('career_entries').insert({ user_id: userId, ...payload });
      if (error) return error.message;
    }
    setModalEntry(undefined);
    onChanged?.();
    return null;
  };

  const remove = async (id) => {
    if (!window.confirm(t('Remove this entry?'))) return;
    setBusyId(id);
    await supabase.from('career_entries').delete().eq('id', id);
    setBusyId(null);
    onChanged?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className={`text-sm font-bold ${colors.textWhite} flex items-center gap-2`}>
          <Icon name="auto_stories" size={16} className={colors.accent} /> {t('Receipts')}
        </h2>
        {own && (
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setImportOpen(true)} className={`flex items-center gap-1 text-xs font-semibold ${colors.textMuted}`}>
              <Icon name="upload_file" size={13} className="text-inherit" /> {t('Import from CV')}
            </button>
            <button type="button" onClick={() => setModalEntry(null)} className={`flex items-center gap-1 text-xs font-bold ${colors.accent}`}>
              <Icon name="add_circle" size={14} className="text-inherit" /> {t('Add entry')}
            </button>
          </div>
        )}
      </div>

      {entries.length === 0 ? (
        <p className={`text-xs ${colors.textFaint}`}>
          {own ? t('Document meaningful work so posters can see what you have actually done.') : t('Nothing added yet.')}
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const meta = kindMeta(entry.kind);
            const range = dateRange(entry, t, locale);
            return (
              <div key={entry.id} className={`${colors.bgCardSoft} border ${colors.border} ${radius.md} p-3.5 flex gap-3`}>
                <div className={`${colors.accentSoftBg} ${colors.accent} p-2 ${radius.md} shrink-0 h-fit`}>
                  <Icon name={meta.icon} size={16} className="text-inherit" />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className={`text-[10px] font-mono font-bold uppercase tracking-wider ${colors.textFaint}`}>{t(meta.label)}</p>
                  <p className={`text-sm font-bold ${colors.textWhite}`}>{entry.title}</p>
                  {(entry.role || entry.organization) && (
                    <p className={`text-xs ${colors.textMuted}`}>{[entry.role, entry.organization].filter(Boolean).join(' · ')}</p>
                  )}
                  {range && <p className={`text-[11px] ${colors.textFaint}`}>{range}</p>}
                  {entry.description && <p className={`text-xs ${colors.textMuted} mt-1 leading-relaxed`}>{entry.description}</p>}
                  {entry.link && (
                    <a href={entry.link} target="_blank" rel="noreferrer" className={`text-xs font-semibold ${colors.accent} inline-flex items-center gap-1 mt-1`}>
                      <Icon name="open_in_new" size={12} className="text-inherit" /> {t('View proof')}
                    </a>
                  )}
                </div>
                {own && (
                  <div className="flex flex-col gap-1 shrink-0">
                    <button type="button" onClick={() => setModalEntry(entry)} aria-label={t('Edit')} className={colors.textFaint}>
                      <Icon name="edit" size={15} />
                    </button>
                    <button type="button" disabled={busyId === entry.id} onClick={() => remove(entry.id)} aria-label={t('Remove')} className={colors.error}>
                      <Icon name="delete" size={15} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modalEntry !== undefined && <CareerEntryModal entry={modalEntry} onSubmit={save} onClose={() => setModalEntry(undefined)} />}
      {importOpen && (
        <CVImportModal
          userId={userId}
          onImported={() => {
            setImportOpen(false);
            onChanged?.();
          }}
          onClose={() => setImportOpen(false)}
        />
      )}
    </div>
  );
}
