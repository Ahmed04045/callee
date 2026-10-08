// src/handlers/modalSubmit.js

const { supabase } = require('../supabaseClient');
const { getLinkedAccount, NOT_LINKED_MESSAGE } = require('../lib/account');

async function handleModalSubmit(interaction) {
  const { customId } = interaction;

  if (customId === 'create_portfolio' || customId === 'edit_profile') {
    const account = await getLinkedAccount(interaction.user.id);
    if (!account) {
      await interaction.reply({ content: NOT_LINKED_MESSAGE, ephemeral: true });
      return;
    }

    const name = interaction.fields.getTextInputValue('name').trim();
    const university = interaction.fields.getTextInputValue('university').trim();
    const bio = interaction.fields.getTextInputValue('bio').trim();

    const { error } = await supabase.from('profiles').upsert({
      user_id: account.user_id,
      display_name: name || null,
      university: university || null,
      bio: bio || null,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      await interaction.reply({ content: "Couldn't save your profile — try again.", ephemeral: true });
      return;
    }
    await interaction.reply({ content: 'Profile saved.', ephemeral: true });
    return;
  }

  if (customId === 'create_startup') {
    const account = await getLinkedAccount(interaction.user.id);
    if (!account) {
      await interaction.reply({ content: NOT_LINKED_MESSAGE, ephemeral: true });
      return;
    }

    const name = interaction.fields.getTextInputValue('name').trim();
    const description = interaction.fields.getTextInputValue('description').trim();

    const { error } = await supabase.from('startups').insert({
      name,
      description,
      owner_user_id: account.user_id,
      status: 'pending',
    });

    if (error) {
      await interaction.reply({ content: "Couldn't create that startup — try again.", ephemeral: true });
      return;
    }
    await interaction.reply({
      content: `**${name}** submitted for review — it'll be searchable once approved.`,
      ephemeral: true,
    });
    return;
  }

  if (customId.startsWith('edit_startup_')) {
    const startupId = customId.replace('edit_startup_', '');
    const account = await getLinkedAccount(interaction.user.id);
    if (!account) {
      await interaction.reply({ content: NOT_LINKED_MESSAGE, ephemeral: true });
      return;
    }

    const name = interaction.fields.getTextInputValue('name').trim();
    const description = interaction.fields.getTextInputValue('description').trim();

    const { error, count } = await supabase
      .from('startups')
      .update({ name, description }, { count: 'exact' })
      .eq('id', startupId)
      .eq('owner_user_id', account.user_id); // guard: service role bypasses RLS, so this ownership check has to happen here

    if (error || count === 0) {
      await interaction.reply({ content: "Couldn't update that startup — make sure you own it.", ephemeral: true });
      return;
    }
    await interaction.reply({ content: `**${name}** updated.`, ephemeral: true });
  }
}

module.exports = { handleModalSubmit };
