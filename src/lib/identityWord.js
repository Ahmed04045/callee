// src/lib/identityWord.js
//
// Must read identically to supabase/functions/identity-word/index.ts's
// QUESTIONS — that function can't import from the site's bundle (it runs on
// Deno, separately deployed), so this is a deliberate, commented duplicate.
// Change one, change the other.

export const IDENTITY_QUESTIONS = [
  'What is something you have done that you are genuinely proud of?',
  'How would people who know you well describe you in conversation?',
  'What do you actually do with your free time, when nobody is telling you what to do?',
  'Finish this sentence: people can always count on me to ___.',
];
