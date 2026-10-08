// src/commands/collab.js

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { supabase } = require('../supabaseClient');
const { getLinkedAccount, NOT_LINKED_MESSAGE } = require('../lib/account');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('collab')
    .setDescription('Propose a collaboration between your startup and another one')
    .addStringOption((opt) =>
      opt.setName('startup').setDescription('The startup you want to collaborate with').setRequired(true)
    ),

  async execute(interaction) {
    const account = await getLinkedAccount(interaction.user.id);
    if (!account) {
      await interaction.reply({ content: NOT_LINKED_MESSAGE, ephemeral: true });
      return;
    }

    const { data: myStartups } = await supabase
      .from('startups')
      .select('id, name')
      .eq('owner_user_id', account.user_id)
      .eq('status', 'approved');

    if (!myStartups?.length) {
      await interaction.reply({
        content: 'You need to own an approved startup before proposing a collaboration.',
        ephemeral: true,
      });
      return;
    }
    if (myStartups.length > 1) {
      await interaction.reply({
        content: `You own multiple startups — this command doesn't support picking one yet (${myStartups
          .map((s) => s.name)
          .join(', ')}). Message an admin if you need this.`,
        ephemeral: true,
      });
      return;
    }
    const myStartup = myStartups[0];

    const targetName = interaction.options.getString('startup');
    const { data: target } = await supabase
      .from('startups')
      .select('id, name, owner_user_id')
      .eq('status', 'approved')
      .ilike('name', targetName)
      .maybeSingle();

    if (!target) {
      await interaction.reply({ content: `Couldn't find an approved startup called "${targetName}".`, ephemeral: true });
      return;
    }
    if (target.id === myStartup.id) {
      await interaction.reply({ content: "You can't collaborate with your own startup.", ephemeral: true });
      return;
    }

    const { data: collab, error } = await supabase
      .from('startup_collaborations')
      .upsert(
        { requesting_startup_id: myStartup.id, target_startup_id: target.id, status: 'pending' },
        { onConflict: 'requesting_startup_id,target_startup_id' }
      )
      .select()
      .single();

    if (error) {
      await interaction.reply({ content: 'Something went wrong sending that proposal.', ephemeral: true });
      return;
    }

    await interaction.reply({
      content: `Collaboration proposal sent from **${myStartup.name}** to **${target.name}**.`,
      ephemeral: true,
    });

    const { data: ownerLink } = await supabase
      .from('discord_links')
      .select('discord_user_id')
      .eq('user_id', target.owner_user_id)
      .maybeSingle();

    if (ownerLink) {
      try {
        const ownerUser = await interaction.client.users.fetch(ownerLink.discord_user_id);
        const embed = new EmbedBuilder()
          .setColor(0x3d8bff)
          .setTitle(`Collaboration proposal for ${target.name}`)
          .setDescription(`**${myStartup.name}** wants to collaborate with your startup.`);
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`collab_accept_${collab.id}`).setLabel('Accept').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`collab_decline_${collab.id}`).setLabel('Decline').setStyle(ButtonStyle.Danger)
        );
        await ownerUser.send({ embeds: [embed], components: [row] });
      } catch {
        // Owner unreachable by DM — proposal still exists either way.
      }
    }
  },
};
