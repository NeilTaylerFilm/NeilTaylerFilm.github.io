// src/data/featured-slideshow.js
// Data for the featured photography slideshow on the photography page.
// Export an array of slide objects.
// Each slide object should have:
//   src: string (path to image, relative to src/)
//   alt: string
//   caption: string (optional)
//   link: string (optional, a URL to link to, e.g., a photography project)

export const featuredSlides = [
  {
    src: '/assets/photography/featured/01.jpg',
    alt: 'A black and white portrait of a person',
    caption: 'Portrait session, 2023',
    link: '/photography/portraits-2023'
  },
  {
    src: '/assets/photography/featured/02.jpg',
    alt: 'A landscape photo of mountains',
    caption: 'Mountain landscape, 2022',
    link: '/photography/mountains-2022'
  },
  {
    src: '/assets/photography/featured/03.jpg',
    alt: 'A street photography shot',
    caption: 'Street photography, 2021',
    link: '/photography/street-2021'
  }
];

// Note: To add your own slides, replace the above array with your data.
// Place your images in src/assets/photography/featured/ and update the paths accordingly.