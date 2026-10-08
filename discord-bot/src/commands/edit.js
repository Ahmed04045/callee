// src/commands/edit.js

const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { supabase } = require('../supabaseClient');
const { getLinkedAccount, NOT_LINKED_MESSAGE } = require('../lib/account');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('edit')
    .setDescription('Edit your profile or a startup you own')
    .addSubcommand((sub) => sub.setName('profile').setDescription('Edit your personal profile'))
    .addSubcommand((sub) =>
      sub
        .setName('startup')
        .setDescription('Edit a startup you own')
        .addStringOption((opt) =>
          opt.setName('name').setDescription('Which startup (if you own more than one)').setRequired(false)
        )
    ),

  async execute(interaction) {
    const account = await getLinkedAccount(interaction.user.id);
    if (!account) {
      await interaction.reply({ content: NOT_LINKED_MESSAGE, ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'profile') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, university, bio')
        .eq('user_id', account.user_id)
        .maybeSingle();

      const modal = new ModalBuilder().setCustomId('edit_profile').setTitle('Edit your profile');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('name')
            .setLabel('Name')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(60)
            .setValue(profile?.display_name ?? '')
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('university')
            .setLabel('School / University')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(100)
            .setValue(profile?.university ?? '')
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('bio')
            .setLabel('Bio (max 200 characters)')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setMaxLength(200)
            .setValue(profile?.bio ?? '')
        )
      );
      await interaction.showModal(modal);
      return;
    }

    if (sub === 'startup') {
      const nameOption = interaction.options.getString('name');
      let query = supabase.from('startups').select('id, name, description').eq('owner_user_id', account.user_id);
      if (nameOption) query = query.ilike('name', nameOption);
      const { data: startups } = await query;

      if (!startups?.length) {
        await interaction.reply({
          content: nameOption ? `You don't own a startup called "${nameOption}".` : "You don't own any startups yet.",
          ephemeral: true,
        });
        return;
      }
      if (startups.length > 1) {
        await interaction.reply({
          content: `You own multiple startups — specify which one with the \`name\` option: ${startups
            .map((s) => s.name)
            .join(', ')}`,
          ephemeral: true,
        });
        return;
      }

      const startup = startups[0];
      const modal = new ModalBuilder()
        .setCustomId(`edit_startup_${startup.id}`)
        .setTitle(`Edit ${startup.name}`.slice(0, 45));
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('name')
            .setLabel('Startup name')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(80)
            .setValue(startup.name)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('description')
            .setLabel('Description')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1000)
            .setValue(startup.description ?? '')
        )
      );
      await interaction.showModal(modal);
    }
  },
};
