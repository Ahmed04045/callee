// src/lib/education.js
//
// Single list of schools/universities, shared by Profile, Onboarding, the
// Clubs page and the Create > Group form. profiles.university and
// clubs.university both store one of these exact strings, which is how the
// Clubs page matches "your university" to its clubs.

export const EDUCATION_OPTIONS = [
  'High School',
  'Qatar University',
  'Hamad Bin Khalifa University (HBKU)',
  'University of Doha for Science and Technology (UDST)',
  'Carnegie Mellon University in Qatar',
  'Georgetown University in Qatar',
  'Northwestern University in Qatar',
  'Texas A&M University at Qatar',
  'VCUarts Qatar',
  'Weill Cornell Medicine - Qatar',
  'HEC Paris in Qatar',
  'Community College of Qatar',
  'University of Calgary in Qatar',
  'Al Rayyan International University',
  'Lusail University',
  'Doha Institute for Graduate Studies',
];

// Universities that can host clubs/groups (High School is a profile option only).
export const CLUB_UNIVERSITIES = EDUCATION_OPTIONS.filter((option) => option !== 'High School');

export const UDST = 'University of Doha for Science and Technology (UDST)';
