// supabase/functions/identity-word/index.ts
//
// Answers to a few short questions about yourself go here, and come back
// as one word — shown as a banner on the profile — plus a short note on
// why, shown when that banner is tapped. Nothing scored, no leaderboard,
// just a small mirror. Same shape as parse-cv/index.ts (see its comment for
// the deploy steps, JWT verification and CORS notes — identical here).

const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-flash-lite-latest';
const MAX_ANSWER_CHARS = 600;

export const QUESTIONS = [
  'What is something you have done that you are genuinely proud of?',
  'How would people who know you well describe you in conversation?',
  'What do you actually do with your free time, when nobody is telling you what to do?',
  'Finish this sentence: people can always count on me to ___.',
];

const PROMPT = `You are giving someone a single-word "identity word" for their profile on a student community platform, based on their own short answers about themselves below. Pick one real English word (or a short, natural two-word phrase if one word truly cannot capture it, e.g. "Quiet Storm") that feels specific to THEM, not generic ("Creative", "Hardworking" and "Passionate" are overused — dig for something sharper and more particular). It should read as a compliment or an interesting observation, never negative or joking at their expense.

Then write a short, warm note (2-4 sentences) explaining why you picked it, referencing specifics from what they actually wrote — not generic flattery.

Answers:
{{ANSWERS}}

Return ONLY JSON (no markdown fences, no commentary), shaped exactly like:
{"word": "...", "reason": "..."}`;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return json({ error: 'GEMINI_API_KEY is not set on this function.' }, 500);

  let body: { answers?: string[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Expected JSON body.' }, 400);
  }

  const answers = (body.answers ?? []).map((a) => String(a ?? '').trim().slice(0, MAX_ANSWER_CHARS));
  if (answers.length !== QUESTIONS.length || answers.every((a) => !a)) {
    return json({ error: `Answer all ${QUESTIONS.length} questions first.` }, 400);
  }

  const answersBlock = QUESTIONS.map((q, i) => `${i + 1}. ${q}\n${answers[i] || '(skipped)'}`).join('\n\n');
  const prompt = PROMPT.replace('{{ANSWERS}}', answersBlock);

  const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.9 },
    }),
  });

  if (!geminiRes.ok) {
    const detail = await geminiRes.text();
    return json({ error: `Gemini request failed (${geminiRes.status}).`, detail: detail.slice(0, 500) }, 502);
  }

  const data = await geminiRes.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return json({ error: "Gemini didn't return anything usable." }, 502);

  let parsed: { word?: unknown; reason?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return json({ error: "Couldn't parse Gemini's response as JSON.", detail: raw.slice(0, 500) }, 502);
  }

  const word = String(parsed.word ?? '').trim().slice(0, 40);
  const reason = String(parsed.reason ?? '').trim().slice(0, 600);
  if (!word || !reason) return json({ error: "Gemini's response was missing a word or a reason." }, 502);

  return json({ word, reason });
});
