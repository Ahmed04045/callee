// src/commands/join.js

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { supabase } = require('../supabaseClient');
const { getLinkedAccount, NOT_LINKED_MESSAGE } = require('../lib/account');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Request to join a startup')
    .addStringOption((opt) => opt.setName('startup').setDescription('Startup name').setRequired(true)),

  async execute(interaction) {
    const account = await getLinkedAccount(interaction.user.id);
    if (!account) {
      await interaction.reply({ content: NOT_LINKED_MESSAGE, ephemeral: true });
      return;
    }

    const startupName = interaction.options.getString('startup');
    const { data: startup } = await supabase
      .from('startups')
      .select('id, name, owner_user_id')
      .eq('status', 'approved')
      .ilike('name', startupName)
      .maybeSingle();

    if (!startup) {
      await interaction.reply({ content: `Couldn't find an approved startup called "${startupName}".`, ephemeral: true });
      return;
    }
    if (startup.owner_user_id === account.user_id) {
      await interaction.reply({ content: 'You already own this startup.', ephemeral: true });
      return;
    }

    const { data: existingMember } = await supabase
      .from('startup_members')
      .select('id')
      .eq('startup_id', startup.id)
      .eq('user_id', account.user_id)
      .maybeSingle();
    if (existingMember) {
      await interaction.reply({ content: "You're already a member of this startup.", ephemeral: true });
      return;
    }

    const { data: request, error } = await supabase
      .from('startup_join_requests')
      .upsert(
        { startup_id: startup.id, user_id: account.user_id, status: 'pending' },
        { onConflict: 'startup_id,user_id' }
      )
      .select()
      .single();

    if (error) {
      await interaction.reply({ content: 'Something went wrong sending that request.', ephemeral: true });
      return;
    }

    await interaction.reply({ content: `Request sent to join **${startup.name}**.`, ephemeral: true });

    const { data: ownerLink } = await supabase
      .from('discord_links')
      .select('discord_user_id')
      .eq('user_id', startup.owner_user_id)
      .maybeSingle();

    if (ownerLink) {
      try {
        const ownerUser = await interaction.client.users.fetch(ownerLink.discord_user_id);
        const embed = new EmbedBuilder()
          .setColor(0x3d8bff)
          .setTitle(`Join request for ${startup.name}`)
          .setDescription(`**${interaction.user.username}** wants to join your startup.`);
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`join_accept_${request.id}`).setLabel('Accept').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`join_decline_${request.id}`).setLabel('Decline').setStyle(ButtonStyle.Danger)
        );
        await ownerUser.send({ embeds: [embed], components: [row] });
      } catch {
        // Owner has DMs closed, or blocked the bot — the request still
        // exists and shows up next time they check, they just won't get
        // pinged for it.
      }
    }
  },
};
