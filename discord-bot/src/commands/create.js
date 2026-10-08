// src/commands/create.js

const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { getLinkedAccount, NOT_LINKED_MESSAGE } = require('../lib/account');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('create')
    .setDescription('Create a portfolio or a startup idea')
    .addSubcommand((sub) => sub.setName('portfolio').setDescription('Set up your personal profile'))
    .addSubcommand((sub) => sub.setName('startup').setDescription('Post a new startup idea')),

  async execute(interaction) {
    const account = await getLinkedAccount(interaction.user.id);
    if (!account) {
      await interaction.reply({ content: NOT_LINKED_MESSAGE, ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'portfolio') {
      const modal = new ModalBuilder().setCustomId('create_portfolio').setTitle('Set up your portfolio');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('name')
            .setLabel('Name')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(60)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('university')
            .setLabel('School / University')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(100)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('bio')
            .setLabel('Bio (max 200 characters)')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setMaxLength(200)
        )
      );
      await interaction.showModal(modal);
      return;
    }

    if (sub === 'startup') {
      const modal = new ModalBuilder().setCustomId('create_startup').setTitle('Post a startup idea');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('name')
            .setLabel('Startup name')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(80)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('description')
            .setLabel('What are you building?')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1000)
        )
      );
      await interaction.showModal(modal);
    }
  },
};
