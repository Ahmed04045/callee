// src/views/create/formKit.jsx
//
// Small shared building blocks for the Create forms so each form file stays
// about its own fields: Field wrapper, chip pickers, submit button, styles.

import React from 'react';
import themeConfig from '../../theme/themeConfig';
import Icon from '../../components/Icon';

export const useFormStyles = () => {
  const { colors, radius } = themeConfig;
  return {
    input: `w-full mt-1 ${colors.bgInset} border ${colors.borderStrong} ${radius.md} px-3 py-2.5 text-sm ${colors.textPrimary} focus:outline-none focus:border-md3-primary ${colors.transition}`,
  };
};

export function Field({ label, hint, right, children }) {
  const { colors } = themeConfig;
  return (
    <div className="block text-left">
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
            {option}
          </button>
        );
      })}
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
