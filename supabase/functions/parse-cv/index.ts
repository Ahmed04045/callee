// supabase/functions/parse-cv/index.ts
//
// "Import from CV": the client sends a CV (PDF, or plain text pasted in)
// here, this asks Gemini to pull out Career Book entries, and returns them
// for the person to review and edit before anything is saved — nothing
// touches the database from this function. Deployed separately from the
// migrations (see README's "Import from CV" section for the exact steps);
// it needs GEMINI_API_KEY set as a function secret, which is never sent to
// the browser.
//
// Supabase verifies the caller's JWT before this code runs (the project
// default — see supabase/config.toml's verify_jwt), so this never runs for
// a signed-out request; it doesn't need its own auth check on top of that.
//
// Deno + Web APIs only (no npm deps) — this runs on Supabase's Edge
// Function runtime, not Node.

const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-flash-lite-latest';
// ^ Check the exact model id string Google AI Studio's own code sample
// shows for the model you picked (names change over time) — set
// GEMINI_MODEL as a function secret to override this without redeploying.

const MAX_ENTRIES = 10;
const MAX_INPUT_BYTES = 8 * 1024 * 1024; // 8MB — comfortably covers a real CV, keeps the request small

const KINDS = ['project', 'experience', 'achievement', 'competition', 'leadership', 'milestone'];

const PROMPT = `You are reading a CV/resume to help a student fill in their "Career Book" on a student community platform. Pull out distinct, concrete entries: projects, jobs/internships, awards/scholarships, competitions/hackathons, leadership/volunteering roles, and other notable milestones. Skip generic filler (objective statements, references, skills-only lists with nothing concrete attached).

Return ONLY a JSON array (no markdown fences, no commentary), at most ${MAX_ENTRIES} items, each shaped exactly like:
{
  "kind": one of ${JSON.stringify(KINDS)},
  "title": short string, required,
  "organization": string or null,
  "role": string or null,
  "description": one or two plain sentences, string or null,
  "start_date": "YYYY-MM-DD" or null (use the 1st of the month if only a month is given),
  "end_date": "YYYY-MM-DD" or null,
  "is_ongoing": boolean (true if the CV implies this is current/present)
}
If the CV gives no usable entries, return [].`;

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

  let body: { text?: string; fileBase64?: string; mimeType?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Expected JSON body.' }, 400);
  }

  const parts: Record<string, unknown>[] = [{ text: PROMPT }];
  if (body.fileBase64) {
    if (body.fileBase64.length > MAX_INPUT_BYTES * 1.4) return json({ error: 'That file is too large.' }, 400); // base64 is ~33% bigger than the source bytes
    parts.push({ inline_data: { mime_type: body.mimeType || 'application/pdf', data: body.fileBase64 } });
  } else if (body.text?.trim()) {
    parts.push({ text: body.text.slice(0, MAX_INPUT_BYTES) });
  } else {
    return json({ error: 'Send a CV file (fileBase64) or pasted text (text).' }, 400);
  }

  const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
    }),
  });

  if (!geminiRes.ok) {
    const detail = await geminiRes.text();
    return json({ error: `Gemini request failed (${geminiRes.status}).`, detail: detail.slice(0, 500) }, 502);
  }

  const data = await geminiRes.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return json({ error: "Gemini didn't return anything usable." }, 502);

  let entries: unknown;
  try {
    entries = JSON.parse(raw);
  } catch {
    return json({ error: "Couldn't parse Gemini's response as JSON.", detail: raw.slice(0, 500) }, 502);
  }
  if (!Array.isArray(entries)) return json({ error: 'Expected a JSON array of entries.' }, 502);

  // Trust nothing from the model beyond shape — the client still lets the
  // person review and edit every field before any of this is saved.
  const cleaned = entries.slice(0, MAX_ENTRIES).map((e) => ({
    kind: KINDS.includes(e?.kind) ? e.kind : 'milestone',
    title: String(e?.title ?? '').slice(0, 100) || 'Untitled',
    organization: e?.organization ? String(e.organization).slice(0, 100) : null,
    role: e?.role ? String(e.role).slice(0, 100) : null,
    description: e?.description ? String(e.description).slice(0, 1000) : null,
    start_date: /^\d{4}-\d{2}-\d{2}$/.test(e?.start_date) ? e.start_date : null,
    end_date: /^\d{4}-\d{2}-\d{2}$/.test(e?.end_date) ? e.end_date : null,
    is_ongoing: Boolean(e?.is_ongoing),
  }));

  return json({ entries: cleaned });
});
