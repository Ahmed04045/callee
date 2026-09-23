// src/lib/socialLinks.js
//
// The personal social links a profile can add — GitHub plus a few others.
// One shared list so the edit form (ProfileView) and the read-only display
// (ProfileView identity card, PublicProfileView) stay in sync.

export const SOCIAL_LINKS = [
  { key: 'github_url', icon: 'code', label: 'GitHub', placeholder: 'https://github.com/yourname' },
  { key: 'linkedin_url', icon: 'work', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/yourname' },
  { key: 'instagram_url', icon: 'photo_camera', label: 'Instagram', placeholder: 'https://instagram.com/yourname' },
  { key: 'website_url', icon: 'language', label: 'Website', placeholder: 'https://yoursite.com' },
];
