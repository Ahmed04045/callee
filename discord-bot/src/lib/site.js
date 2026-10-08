// src/lib/site.js
//
// Shared bits for the bot's embeds: the website address, the brand colour and
// small formatters. Override the address with SITE_URL in .env if the domain changes.

const { EmbedBuilder } = require('discord.js');

const SITE_URL = (process.env.SITE_URL || 'https://callee-sooty.vercel.app').replace(/\/$/, '');
const BRAND_COLOR = 0x3d8bff; // Circosodal electric blue

const embed = () => new EmbedBuilder().setColor(BRAND_COLOR);

/** Query text goes into PostgREST filter strings; strip characters that carry meaning there. */
const safeQuery = (text) => String(text ?? '').replace(/[,()%*\\]/g, ' ').replace(/\s+/g, ' ').trim();

const clip = (text, max) => {
  const value = String(text ?? '').trim();
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
};

/** Escape Discord markdown in user-written text so a title can't break an embed link. */
const md = (text) => String(text ?? '').replace(/([\\*_`~|[\]()>])/g, '\\$1');

const todayISO = () => new Date().toISOString().slice(0, 10);

function formatDay(dateISO, time) {
  if (!dateISO) return '';
  const date = new Date(`${dateISO}T${time || '00:00'}:00`);
  const day = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  return time ? `${day}, ${String(time).slice(0, 5)}` : day;
}

module.exports = { SITE_URL, BRAND_COLOR, embed, safeQuery, clip, md, todayISO, formatDay };
