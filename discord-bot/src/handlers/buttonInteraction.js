// src/handlers/buttonInteraction.js
//
// customId format is "<type>_<decision>_<uuid>" — e.g. "join_accept_<id>".
// A UUID contains hyphens, never underscores, so splitting on '_' always
// yields exactly 3 parts safely.

const { supabase } = require('../supabaseClient');
const { getLinkedAccount } = require('../lib/account');

async function handleJoinButton(interaction, decision, requestId) {
  const { data: request } = await supabase
    .from('startup_join_requests')
    .select('id, status, startup_id, user_id, startups(name, owner_user_id)')
    .eq('id', requestId)
    .maybeSingle();

  if (!request || request.status !== 'pending') {
    await interaction.reply({ content: 'This request is no longer pending.', ephemeral: true });
    return;
  }

  // Whoever clicked has to actually be the startup's owner — this DM went
  // out to them specifically, but verifying here costs nothing and closes
  // off "forwarded DM" style edge cases.
  const responder = await getLinkedAccount(interaction.user.id);
  if (!responder || responder.user_id !== request.startups.owner_user_id) {
    await interaction.reply({ content: "Only the startup's owner can respond to this.", ephemeral: true });
    return;
  }

  if (decision === 'accept') {
    await supabase.from('startup_join_requests').update({ status: 'accepted' }).eq('id', requestId);
    await supabase
      .from('startup_members')
      .insert({ startup_id: request.startup_id, user_id: request.user_id, role: 'member' });
    await interaction.update({
      content: `Accepted — they're now a member of ${request.startups.name}.`,
      embeds: [],
      components: [],
    });
  } else {
    await supabase.from('startup_join_requests').update({ status: 'declined' }).eq('id', requestId);
    await interaction.update({ content: 'Declined.', embeds: [], components: [] });
  }
}

async function handleCollabButton(interaction, decision, collabId) {
  const { data: collab } = await supabase
    .from('startup_collaborations')
    .select('id, status, target_startup_id, startups!startup_collaborations_target_startup_id_fkey(name, owner_user_id)')
    .eq('id', collabId)
    .maybeSingle();

  if (!collab || collab.status !== 'pending') {
    await interaction.reply({ content: 'This proposal is no longer pending.', ephemeral: true });
    return;
  }

  const responder = await getLinkedAccount(interaction.user.id);
  if (!responder || responder.user_id !== collab.startups.owner_user_id) {
    await interaction.reply({ content: "Only that startup's owner can respond to this.", ephemeral: true });
    return;
  }

  const nextStatus = decision === 'accept' ? 'accepted' : 'declined';
  await supabase.from('startup_collaborations').update({ status: nextStatus }).eq('id', collabId);
  await interaction.update({
    content: decision === 'accept' ? 'Collaboration accepted.' : 'Collaboration declined.',
    embeds: [],
    components: [],
  });
}

async function handleButtonInteraction(interaction) {
  const [type, decision, id] = interaction.customId.split('_');

  if (type === 'join') {
    await handleJoinButton(interaction, decision, id);
    return;
  }
  if (type === 'collab') {
    await handleCollabButton(interaction, decision, id);
  }
}

module.exports = { handleButtonInteraction };
