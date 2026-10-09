// ==========================================
// 🙋 ABOUT ME DATA (Bio, Photo & Work Focus)
// ==========================================
// This is your digital introduction card!
// Whenever you want to change what your "About" page says,
// you can edit the text and picture right here.

// About page content: portrait, heading, bio text, and social links.
// Portrait: upload through photo-inbox, then paste its Image address into portrait below.
// Or save src/assets/about/portrait.jpg and use /assets/about/portrait.jpg.
// Keep portrait empty to show the intentional placeholder. Registered images supply dimensions.
// This data is imported and displayed by src/pages/about.astro.
export const about = {
  // 👋 The big friendly title greeting at the top of the About page
  heading: 'Hello, I’m Neil.',

  // 📷 Your profile photo (leave empty '' to show the default stylish placeholder box)
  portrait: '',

  // 🗣️ Screen reader description for people who cannot see the picture
  portraitAlt: 'Portrait of Neil Tayler',

  // 📖 The story/bio paragraphs explaining who you are and what you do
  // Each line in this list becomes its own paragraph block <p> on the About page!
  paragraphs: [
    'I’m a photographer and I work in film and post-production. This is a place for my writing, photographs and the things that catch my attention.',
  ],

  // 🏷️ Pill tags listing your main creative disciplines
  // Rendered as styled pill badges at the bottom of the bio!
  areas: ['Photography', 'Film', 'Post-production'],
};

