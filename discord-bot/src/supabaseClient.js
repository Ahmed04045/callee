// src/supabaseClient.js
//
// Service role key — this bypasses RLS entirely, which is correct for a
// trusted bot backend that never runs in a browser. Every authorization
// check the website gets "for free" from RLS (is this user the owner? are
// they linked?), this bot has to do explicitly in its own command code
// instead. Never expose SUPABASE_SERVICE_ROLE_KEY to Discord users, log
// it, or commit it — it's equivalent to a database superuser password.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env and fill both in.'
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

module.exports = { supabase };
