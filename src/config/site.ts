// ==========================================
// 🏠 SITE CONFIGURATION (The Website's ID Card)
// ==========================================
// Think of this file like an ID badge or business card for your entire website.
// Any page that needs to know your name, bio, or social links comes here to look it up!
// If you ever want to update your email, bio, or social handles, change them right here
// and the entire website (headers, footers, SEO tags, contact pages) updates everywhere!

// 📋 This "interface" is like a blank form checklist.
// It tells the computer: "Every website ID card MUST have these exact pieces of info."
interface SiteConfig {
  name: string;         // The name of the website (text)
  author: string;       // Who made it (text)
  description: string;  // A short summary for Google and social previews (text)
  tagline: string;      // A catchy mini-motto (text)
  defaultImage: string; // The picture to show when someone shares your link (file path)
  email: string;        // Where people can email you (text)
  // A list of social media buttons with a label, web address, and handle
  links: { label: string; url: string; username: string }[];
}

// ✍️ Here we fill in the blank form with your actual real-world details!
// We export this 'site' object so any page or component can borrow it (import { site } from '../config/site').
export const site: SiteConfig = {
  name: 'Neil Tayler Film',
  author: 'Neil Tayler',
  description:
    'Notes on images, ideas and everything in between. Writing and photography by Neil Tayler.',
  tagline: 'Images. Ideas. Everything in between.',
  defaultImage: '/images/social-card.png',
  email: 'tayler.neil@icloud.com',
  // Your list of social profiles to display on the site
  links: [
    {
      label: 'Instagram',
      url: 'https://www.instagram.com/neiltaylerfilm/',
      username: '@neiltaylerfilm',
    },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/neil-tayler/', username: 'neil-tayler' },
    { label: 'TikTok', url: 'https://www.tiktok.com/@neiltaylerfilm', username: '@neiltaylerfilm' },
  ],
};

