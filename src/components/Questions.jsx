// src/components/Questions.jsx
//
// Three pieces of the custom-questions feature:
//   QuestionBuilder  the creator adds / edits up to 8 questions
//   AnswerForm       whoever applies / joins / RSVPs answers them
//   AnswersView      the poster reads the answers (applicants, join requests, RSVPs)

import React from 'react';
import themeConfig from '../theme/themeConfig';
import Icon from './Icon';
import { MAX_QUESTIONS, QUESTION_TYPES, SUGGESTED_QUESTIONS, newQuestion, pairAnswers } from '../lib/questions';

const inputClass = (colors, radius) =>
  `w-full ${colors.bgInset} border ${colors.borderStrong} ${radius.md} px-3 py-2.5 text-sm ${colors.textPrimary} focus:outline-none focus:border-md3-primary`;

export function QuestionBuilder({ value, onChange, hint }) {
  const { colors, radius } = themeConfig;
  const questions = value ?? [];
  const input = inputClass(colors, radius);

  const update = (id, patch) => onChange(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  const remove = (id) => onChange(questions.filter((q) => q.id !== id));
  const move = (index, dir) => {
    const next = [...questions];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  const add = (patch) => questions.length < MAX_QUESTIONS && onChange([...questions, newQuestion(patch)]);

  return (
    <div className="space-y-3">
      {hint && <p className={`text-[11px] ${colors.textFaint}`}>{hint}</p>}

      {questions.map((q, i) => (
        <div key={q.id} className={`${colors.bgCardSoft} border ${colors.border} ${radius.md} p-3 space-y-2`}>
          <div className="flex items-center justify-between gap-2">
            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${colors.textFaint}`}>Question {i + 1}</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className={`p-1 ${colors.textFaint} disabled:opacity-30`}>
                <Icon name="expand_more" size={16} className="rotate-180" />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === questions.length - 1} aria-label="Move down" className={`p-1 ${colors.textFaint} disabled:opacity-30`}>
                <Icon name="expand_more" size={16} />
              </button>
              <button type="button" onClick={() => remove(q.id)} aria-label="Remove question" className={`p-1 ${colors.error}`}>
                <Icon name="delete" size={16} />
              </button>
            </div>
          </div>

          <input className={input} value={q.label} maxLength={200} placeholder="Type your question" aria-label="Question" onChange={(e) => update(q.id, { label: e.target.value })} />

          <div className="flex flex-wrap items-center gap-3">
            <select className={`${input} !w-auto`} value={q.type} aria-label="Answer type" onChange={(e) => update(q.id, { type: e.target.value, options: e.target.value === 'choice' ? q.options ?? ['', ''] : undefined })}>
              {QUESTION_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <label className={`flex items-center gap-2 text-xs ${colors.textMuted}`}>
              <input type="checkbox" checked={q.required} onChange={(e) => update(q.id, { required: e.target.checked })} className="accent-md3-primary" />
              Required
            </label>
          </div>

          {q.type === 'choice' && (
            <div className="space-y-1.5">
              <textarea
                className={`${input} resize-none`}
                rows={3}
                value={(q.options ?? []).join('\n')}
                aria-label="Options, one per line"
                placeholder={'One option per line (at least 2)'}
                onChange={(e) => update(q.id, { options: e.target.value.split('\n').slice(0, 10) })}
              />
            </div>
          )}
        </div>
      ))}

      {questions.length < MAX_QUESTIONS && (
        <div className="space-y-2">
          <button type="button" onClick={() => add()} className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 border ${colors.borderStrong} ${colors.textWhite} ${radius.full} ${colors.bgHoverInset}`}>
            <Icon name="add_circle" size={14} className="text-inherit" /> Add a question
          </button>
          {questions.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((s) => (
                <button key={s.label} type="button" onClick={() => add(s)} className={`text-[11px] px-2.5 py-1 border ${colors.border} ${colors.textMuted} ${radius.full} ${colors.bgHoverInset}`}>
                  + {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AnswerForm({ questions, answers, onChange }) {
  const { colors, radius } = themeConfig;
  const input = inputClass(colors, radius);
  const set = (id, value) => onChange({ ...answers, [id]: value });

  return (
    <div className="space-y-4">
      {questions.map((q) => (
        <fieldset key={q.id} className="space-y-1.5">
          <legend className={`text-xs font-semibold ${colors.textWhite}`}>
            {q.label}
            {q.required && <span className={`ms-1 ${colors.error}`} aria-label="required">*</span>}
          </legend>

          {q.type === 'text' && <input className={input} maxLength={300} value={answers[q.id] ?? ''} onChange={(e) => set(q.id, e.target.value)} />}
          {q.type === 'long' && <textarea className={`${input} resize-none`} rows={3} maxLength={1000} value={answers[q.id] ?? ''} onChange={(e) => set(q.id, e.target.value)} />}
          {q.type === 'yesno' && (
            <div className="flex gap-2">
              {[['yes', 'Yes'], ['no', 'No']].map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={answers[q.id] === v}
                  onClick={() => set(q.id, answers[q.id] === v ? '' : v)}
                  className={`px-4 py-2 text-xs font-bold border ${radius.full} ${answers[q.id] === v ? `${colors.accentBg} ${colors.accentOn} border-transparent` : `${colors.textMuted} ${colors.borderStrong}`}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {q.type === 'choice' && (
            <div className="space-y-1.5">
              {(q.options ?? []).map((opt) => (
                <label key={opt} className={`flex items-center gap-3 p-2.5 border ${answers[q.id] === opt ? 'border-md3-primary' : colors.border} ${radius.md} cursor-pointer`}>
                  <input type="radio" name={q.id} checked={answers[q.id] === opt} onChange={() => set(q.id, opt)} className="accent-md3-primary" />
                  <span className={`text-sm ${colors.textWhite}`}>{opt}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>
      ))}
    </div>
  );
}

const ANSWER_LABEL = { yes: 'Yes', no: 'No' };

export function AnswersView({ questions, answers, emptyLabel }) {
  const { colors, radius } = themeConfig;
  const pairs = pairAnswers(questions, answers);
  if (!pairs.length) {
    return emptyLabel ? <p className={`text-[11px] ${colors.textFaint}`}>{emptyLabel}</p> : null;
  }
  return (
    <dl className={`space-y-2 ${colors.bgInset} ${radius.md} p-3`}>
      {pairs.map(({ question, answer }) => (
        <div key={question.id}>
          <dt className={`text-[11px] font-semibold ${colors.textFaint}`}>{question.label}</dt>
          <dd className={`text-sm ${colors.textWhite} whitespace-pre-line`}>{question.type === 'yesno' ? ANSWER_LABEL[answer] ?? answer : answer}</dd>
        </div>
      ))}
    </dl>
  );
}
