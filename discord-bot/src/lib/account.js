// src/lib/account.js

const { supabase } = require('../supabaseClient');

/**
 * @param {string} discordUserId
 * @returns {Promise<{user_id: string, discord_username: string} | null>}
 */
async function getLinkedAccount(discordUserId) {
  const { data, error } = await supabase
    .from('discord_links')
    .select('user_id, discord_username')
    .eq('discord_user_id', discordUserId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

const NOT_LINKED_MESSAGE = "Your Discord isn't linked to a Circosodal account yet — run /connect first.";

module.exports = { getLinkedAccount, NOT_LINKED_MESSAGE };
