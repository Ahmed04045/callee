// src/views/create/formKit.jsx
//
// Small shared building blocks for the Create forms so each form file stays
// about its own fields: Field wrapper, chip pickers, submit button, styles.

import React, { useEffect, useRef, useState } from 'react';
import themeConfig from '../../theme/themeConfig';
import { useT } from '../../i18n';
import Icon from '../../components/Icon';
import { validateImageFile } from '../../lib/imageUpload';

/**
 * State + handlers for `ImagePicker`: holds `[{ file, previewUrl }]` in
 * memory, validates on add, and revokes every preview URL on unmount (a
 * cancelled form has nothing uploaded to clean up — see ImagePicker's
 * comment — this just frees the local object URLs).
 */
export function useImagePicker(max = 1) {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);

  const add = (fileList) => {
    const room = max - files.length;
    const picked = Array.from(fileList).slice(0, room);
    const problem = picked.map(validateImageFile).find(Boolean);
    if (problem) return setError(problem);
    setError(null);
    setFiles((prev) => [...prev, ...picked.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))]);
  };
  const remove = (index) => {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const filesRef = useRef(files);
  filesRef.current = files;
  useEffect(() => () => filesRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl)), []);

  return { files, add, remove, error };
}

export const useFormStyles = () => {
  const { colors, radius } = themeConfig;
  return {
    input: `w-full mt-1 ${colors.bgInset} border ${colors.borderStrong} ${radius.md} px-3 py-2.5 text-sm ${colors.textPrimary} focus:outline-none focus:border-md3-primary ${colors.transition}`,
  };
};

export function Field({ label, hint, right, children }) {
  const { colors } = themeConfig;
  return (
    <div className="block text-start">
      <div className="flex items-baseline justify-between">
        <span className={`text-[11px] font-semibold ${colors.textFaint}`}>
          {label} {hint && <span className={colors.textDim}>{hint}</span>}
        </span>
        {right}
      </div>
      {children}
    </div>
  );
}

/** Single- or multi-select chip picker. `value` is a string (single) or array (multi). */
export function ChipPicker({ options, value, onChange, multiple = false, max }) {
  const { t } = useT();
  const { colors, radius } = themeConfig;
  const selected = multiple ? value : [value];
  const toggle = (option) => {
    if (!multiple) return onChange(option);
    if (value.includes(option)) return onChange(value.filter((v) => v !== option));
    if (max && value.length >= max) return;
    return onChange([...value, option]);
  };
  return (
    <div className="flex flex-wrap gap-2 mt-1.5">
      {options.map((option) => {
        const on = selected.includes(option);
        const locked = multiple && max && !on && value.length >= max;
        return (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            disabled={locked}
            className={`text-xs font-semibold px-3 py-1.5 ${radius.full} border transition disabled:opacity-40 ${
              on ? `${colors.accentBg} ${colors.accentOn} border-transparent` : `${colors.textMuted} ${colors.borderStrong} ${colors.textHoverStrong}`
            }`}
          >
            {t(option)}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Local file thumbnails + an add tile — presentation only. The caller owns
 * the `files` state (`[{ file, previewUrl }]`) and validation; nothing here
 * uploads anything. That's deliberate: Storage's per-object RLS needs a
 * real, owned row to check the folder against, so callers upload these only
 * after their row exists (see EventForm's top comment for the full reasoning).
 */
export function ImagePicker({ files, onAdd, onRemove, max = 1 }) {
  const { t } = useT();
  const { colors, radius } = themeConfig;
  return (
    <div className="flex flex-wrap gap-2 mt-1.5">
      {files.map((p, i) => (
        <div key={p.previewUrl} className="relative w-16 h-16 shrink-0">
          <img src={p.previewUrl} alt="" className={`w-full h-full object-cover ${radius.md}`} />
          <button type="button" onClick={() => onRemove(i)} aria-label={t('Remove photo')} className="absolute -top-1.5 -end-1.5 bg-black/80 rounded-full p-0.5">
            <Icon name="close" size={12} className="text-white" />
          </button>
        </div>
      ))}
      {files.length < max && (
        <label className={`w-16 h-16 shrink-0 flex items-center justify-center ${radius.md} border border-dashed ${colors.borderStrong} ${colors.textFaint} cursor-pointer`}>
          <Icon name="add_photo_alternate" size={20} />
          <input type="file" accept="image/*" multiple={max > 1} className="hidden" onChange={(e) => { onAdd(e.target.files); e.target.value = ''; }} />
        </label>
      )}
    </div>
  );
}

export function SubmitButton({ busy, children = 'Submit for review' }) {
  const { colors, radius } = themeConfig;
  return (
    <button
      type="submit"
      disabled={busy}
      className={`w-full flex items-center justify-center gap-2 ${radius.full} py-2.5 text-sm font-bold ${colors.accentOn} ${colors.accentBg} ${colors.accentBgHover} transition disabled:opacity-60`}
    >
      {busy && <Icon name="progress_activity" size={16} className="animate-spin text-inherit" />}
      {children}
    </button>
  );
}

export const todayISO = () => new Date().toISOString().split('T')[0];
