// src/data/mockData.js
//
// Placeholder content for the pre-backend UI. Swap these arrays for real
// API responses later — every view already reads through this module
// rather than declaring its own inline data, so that swap touches one file.

export const featuredEvents = [
  {
    id: 'fe1',
    title: 'Qatar Youth Tech Hackathon',
    organizer: 'Digital Innovators Hub',
    organizerVerified: true,
    date: 'July 18, 2026',
    location: 'Doha Tech District',
    coordinates: { lat: 25.2854, lng: 51.531 },
    spots: 22,
    tag: 'Tech',
  },
  {
    id: 'fe2',
    title: 'Streetwear & Design Pop-Up',
    organizer: 'Raw Collective',
    organizerVerified: false,
    date: 'July 24, 2026',
    location: 'The Pearl, Gallery 3',
    coordinates: { lat: 25.3707, lng: 51.5528 },
    spots: 8,
    tag: 'Fashion',
  },
];

export const allRecruitment = [
  {
    id: 'r1',
    role: 'Frontend Web Developer (React/Vite)',
    postedBy: 'Nexus Startup Labs',
    verified: true,
    compensation: 'Paid + Equity',
    tags: ['Tech', 'Coding'],
    details:
      'Building a localized delivery prototype. Need a junior dev to bring Figma designs to life using clean Tailwind layouts.',
    featured: true,
  },
  {
    id: 'r2',
    role: 'TikTok Content Creator / Editor',
    postedBy: 'Volt Energy Drink Partner',
    verified: false,
    compensation: 'Paid per video package',
    tags: ['Media', 'Video'],
    details:
      'Looking for a creator to manage local content and trend rollouts. Remote submission only — no in-person shoots required.',
    featured: true,
  },
  {
    id: 'r3',
    role: 'Graphic Designer for Apparel Line',
    postedBy: 'Ghost Thread Co.',
    verified: false,
    compensation: 'Paid + Profit Share',
    tags: ['Design', 'Art'],
    details:
      'Launching a minimalist local clothing brand. Need vector graphics and typography assets ready for screenprinting.',
    featured: false,
  },
];

export const systemUpdates = [
  {
    id: 'u1',
    author: 'Captee Core Team',
    date: 'Today',
    title: 'Welcome to the Unified Youth Ecosystem',
    content:
      "We've expanded the platform to cover tech, media, fashion, and business roles, all in one place built for young creators.",
  },
];

export const localNews = [
  {
    id: 'n1',
    author: 'Local Desk',
    date: 'Yesterday',
    title: 'Doha Tech District adds a youth co-working floor',
    content:
      'A new shared workspace floor opens this month with discounted desks for student and youth-led teams.',
  },
];
