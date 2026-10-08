// src/commands/help.js

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('help').setDescription('List everything this bot can do'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x3d8bff)
      .setTitle('Circosodal Bot')
      .setDescription('Browse events, gigs and clubs right here. Link your account with **/connect** for the personal commands.')
      .addFields(
        {
          name: 'Browse (no account needed)',
          value: [
            '**/events** [query]: upcoming events',
            '**/gigs** [query] [remote]: open gigs',
            '**/clubs** [query] [university]: clubs and groups',
            '**/search user | startup**: find students or startups',
          ].join('\n'),
        },
        {
          name: 'Your account',
          value: [
            '**/connect**: link Discord to your Circosodal account',
            '**/me**: your tickets, applications and notifications (private)',
            '**/create portfolio | startup**, **/edit profile | startup**',
          ].join('\n'),
        },
        { name: 'Startups', value: '**/join** <startup>: ask to join one\n**/collab** <startup>: propose a collaboration' },
        {
          name: 'Good to know',
          value: "Clubs are private: request to join on the website. Tickets, RSVPs and applications (with the poster's questions) happen on the website too.",
        }
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
