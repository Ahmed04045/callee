// src/lib/questions.js
//
// Custom questions: the person who creates a gig, an event or a group can ask
// applicants / attendees / joiners a few questions. Shapes (also cleaned and
// enforced by the database, see 013_questions_prefs_reminders.sql):
//   question: { id, label, type: 'text' | 'long' | 'choice' | 'yesno', required, options? }
//   answers:  { [question.id]: string }   ('yes' / 'no' for yesno questions)

export const MAX_QUESTIONS = 8;

export const QUESTION_TYPES = [
  { id: 'text', label: 'Short answer' },
  { id: 'long', label: 'Long answer' },
  { id: 'choice', label: 'Multiple choice' },
  { id: 'yesno', label: 'Yes / No' },
];

// One-tap starting points in the builder.
export const SUGGESTED_QUESTIONS = [
  { label: 'Why do you want to join?', type: 'long', required: true },
  { label: 'Link to your portfolio or work', type: 'text', required: false },
  { label: 'What days are you available?', type: 'text', required: false },
  { label: 'Have you done something like this before?', type: 'yesno', required: false },
];

let counter = 0;
export const newQuestion = (patch = {}) => ({
  id: `q${Date.now().toString(36)}${counter++}`,
  label: '',
  type: 'text',
  required: false,
  ...patch,
});

/** Questions that are ready to save: non-empty label, choices have at least 2 options. */
export function cleanForSave(questions) {
  return (questions ?? [])
    .map((q) => {
      const label = q.label.trim();
      if (!label) return null;
      if (q.type !== 'choice') return { id: q.id, label, type: q.type, required: Boolean(q.required) };
      const options = (q.options ?? []).map((o) => o.trim()).filter(Boolean);
      return options.length >= 2 ? { id: q.id, label, type: 'choice', required: Boolean(q.required), options } : null;
    })
    .filter(Boolean)
    .slice(0, MAX_QUESTIONS);
}

/** @returns {string | null} the label of the first required question left blank */
export function firstMissingRequired(questions, answers) {
  for (const q of questions ?? []) {
    if (q.required && !String(answers?.[q.id] ?? '').trim()) return q.label;
  }
  return null;
}

export const hasQuestions = (questions) => Array.isArray(questions) && questions.length > 0;

/** Answers as ordered { question, answer } pairs (questions that were left blank are skipped). */
export function pairAnswers(questions, answers) {
  return (questions ?? [])
    .map((q) => ({ question: q, answer: String(answers?.[q.id] ?? '').trim() }))
    .filter((p) => p.answer);
}
