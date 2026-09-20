# Building a Website with Astro and GitHub Pages — A Complete Beginner's Guide

This guide teaches you how to build and publish a website from scratch, even if you have never written a single line of code before. You will learn what each tool does, why it matters, and how they work together.

---

## Table of Contents

1. [What You Are Building](#1-what-you-are-building)
2. [The Tools You Will Need](#2-the-tools-you-will-need)
3. [Setting Up Your Accounts](#3-setting-up-your-accounts)
4. [Creating Your First Project](#4-creating-your-first-project)
5. [Understanding the File Structure](#5-understanding-the-file-structure)
6. [Writing Your First Page](#6-writing-your-first-page)
7. [Previewing Your Website Locally](#7-previewing-your-website-locally)
8. [Publishing to the World](#8-publishing-to-the-world)
9. [Making Regular Updates](#9-making-regular-updates)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. What You Are Building

You will create a **static website** — a collection of plain HTML files that live on the internet and can be viewed by anyone with a web browser. Unlike websites built with blog platforms (WordPress, Wix, Squarespace), you control every detail, and the hosting is completely free.

The tools you will use are:

- **Astro** — a modern website builder that turns your text files and images into a finished website. Think of it as a chef that takes your raw ingredients and produces a meal.
- **GitHub Pages** — free web hosting provided by GitHub. Once you publish, your site gets a public address like `yourname.github.io`.
- **Git** — a system for tracking changes to your files, like a save-game feature for your website. It lets you undo mistakes and share your work.
- **Terminal** — a text-based interface for giving your computer commands. Don't worry — you only need to copy and paste a handful of commands.

You do not need to understand any of these to follow this guide. Just follow the steps in order.

---

## 2. The Tools You Will Need

### 2.1 A Computer

This guide is written for Mac. If you use Windows, the commands are slightly different — see the notes at the end.

### 2.2 Node.js

Node.js is a program that lets your computer run JavaScript outside of a web browser. Many website tools, including Astro, need it.

**Check if you have it:**

1. Open **Terminal** (press Command-Space, type "Terminal", press Return).
2. Type `node --version` and press Return.
3. If you see a version number like `v22.x.x`, you're good. If you see an error, install it:
   - Go to [https://nodejs.org](https://nodejs.org) in your browser.
   - Download the **LTS** (Long Term Support) version.
   - Open the downloaded file and follow the installation prompts.

### 2.3 Git

Git tracks changes to your files. It comes pre-installed on most Macs.

**Check if you have it:** In Terminal, type `git --version` and press Return. If you see a version number, you're set. If not, open Terminal and type `xcode-select --install`, then press Return and follow the prompts.

### 2.4 A GitHub Account

GitHub is a website where developers store their code. You need one to host your site.

**Create an account:**

1. Go to [https://github.com](https://github.com) in your browser.
2. Click **Sign up**.
3. Enter your email, create a password, and pick a username.
4. Verify your email address when GitHub asks you to.

That's it for setup. Now let's build.

---

## 3. Setting Up Your Accounts

### 3.1 Create Your GitHub Repository

A **repository** (or "repo") is a folder that lives on GitHub. Your website will live inside one.

1. Log in to GitHub.
2. Click the **+** icon in the top-right corner and select **New repository**.
3. Under **Repository name**, type something like `my-website` or `yourusername.github.io`.
   - **Important:** If you name it `yourusername.github.io` (replacing `yourusername` with your actual GitHub username), your site will be available at `https://yourusername.github.io` automatically. Any other name means your site will be at `https://yourusername.github.io/my-website`.
4. Make sure **Public** is selected.
5. Check the box that says **Add a README file**.
6. Click **Create repository**.

### 3.2 Clone the Repository to Your Computer

**Cloning** means making a local copy of the repository on your Mac.

1. On your new repository page, click the green **Code** button.
2. Make sure **HTTPS** is selected (not SSH).
3. Click the copy icon next to the URL.
4. Open Terminal and run:

```sh
cd ~/Documents
git clone https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
```

Replace `YOUR-USERNAME` and `YOUR-REPO-NAME` with your actual values. You can paste the URL by pressing Command-V.

5. Enter your folder:

```sh
cd YOUR-REPO-NAME
```

Your website project is now on your computer. Any changes you make here will stay here until you tell Git to send them to GitHub.

---

## 4. Creating Your First Project

### 4.1 Install Astro

Now you need to install Astro and the other tools your website will need. This happens once, the first time you set up a project.

In Terminal, while still inside your repository folder, run:

```sh
npm create astro@latest . -- --template minimal
```

You will be asked a few questions. Here's what to choose:

| Question | Your Answer |
|----------|-------------|
| Where should we create your new project? | `.` (just press Return — you're already in the right folder) |
| How would you like to add your new project? | `Initialize a git repository` |
| Install dependencies? | `Yes` |

This command does three things:
- Creates the Astro project files in your current folder.
- Starts a Git repository (if you chose to initialize one).
- Downloads all the software Astro needs to run.

The `npm install` step may take a minute or two. Be patient.

### 4.2 Understand What Just Happened

After the install finishes, your folder now contains:

```
your-repo-name/
├── astro.config.mjs      ← Configuration for Astro
├── package.json           ← Lists all the tools your project needs
├── public/                ← Files served exactly as-is (images, icons)
├── src/                   ← Where you write your website content
│   ├── components/        ← Reusable pieces of your site
│   ├── layouts/           ← Page templates
│   └── pages/             ← Your actual pages
└── ...
```

You don't need to understand all of this yet. Just know that **`src/pages/` is where your web pages live**, and **`public/` is where you put files that shouldn't be modified**.

---

## 5. Understanding the File Structure

Let's look at the most important folders and files:

### `src/pages/index.astro`

This is the **homepage** of your website. When someone visits your site, this file becomes the first thing they see. Astro uses `.astro` files, which combine HTML, CSS, and JavaScript in a single file.

Open it in a text editor. If you don't have one, download **VS Code** (free at [https://code.visualstudio.com](https://code.visualstudio.com)) — it's excellent for beginners.

The file will look something like this:

```astro
---
// This section is called "front matter". It runs once when the site builds.
// You can put JavaScript here.
---

<html>
  <body>
    <h1>Hello, World!</h1>
    <p>Welcome to my new website.</p>
  </body>
</html>
```

The code between `---` lines is hidden from the browser — it's for setting up the page. Everything below is what the visitor sees.

### `src/layouts/Layout.astro`

This is a **template** that all your pages can use. Instead of writing the same `<html>`, `<head>`, and navigation code on every page, you write it once here and include it everywhere.

### `public/`

Put static files here — images, fonts, icons. Anything you place in `public/` is copied exactly as-is to your live website. If you put `public/photo.jpg` there, visitors will find it at `https://yourusername.github.io/photo.jpg`.

---

## 6. Writing Your First Page

### 6.1 Edit the Homepage

Open `src/pages/index.astro` in your text editor. Replace everything with this:

```astro
---
---

<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My Website</title>
    <meta name="description" content="A personal website built with Astro." />
    <style>
      body {
        font-family: system-ui, -apple-system, sans-serif;
        max-width: 680px;
        margin: 0 auto;
        padding: 2rem;
        line-height: 1.6;
        color: #333;
      }
      h1 { color: #1a1a1a; }
      a { color: #0066cc; }
    </style>
  </head>
  <body>
    <h1>Welcome to My Website</h1>
    <p>Hello! This is my first website, built with Astro and hosted on GitHub Pages.</p>
    <p>I'm learning how to build websites, and this is step one.</p>
    <ul>
      <li><a href="/about/">About me</a></li>
    </ul>
  </body>
</html>
```

### 6.2 Create an About Page

1. In the `src/pages/` folder, create a new file called `about.astro`.
2. Paste this into it:

```astro
---
---

<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>About Me</title>
    <style>
      body {
        font-family: system-ui, -apple-system, sans-serif;
        max-width: 680px;
        margin: 0 auto;
        padding: 2rem;
        line-height: 1.6;
        color: #333;
      }
      h1 { color: #1a1a1a; }
      a { color: #0066cc; }
    </style>
  </head>
  <body>
    <h1>About Me</h1>
    <p>Hi there! I'm learning to build websites.</p>
    <p><a href="/">Go back home</a></p>
  </body>
</html>
```

Now you have two pages. The homepage is at `/` and the about page is at `/about/`. Astro creates the `/about/` URL automatically because the file is named `about.astro`.

---

## 7. Previewing Your Website Locally

Before publishing, you should always check how your website looks on your own computer. This is called a **local preview**, and nobody else can see it.

### 7.1 Start the Development Server

In Terminal, make sure you're in your project folder, then run:

```sh
npm run dev
```

You'll see output like this:

```
  Astro v7.x.x
  Local:    http://localhost:4321/
  Network:  http://192.168.x.x:4321/
```

### 7.2 Open Your Browser

1. Open your web browser.
2. Go to `http://localhost:4321/`.
3. You should see your homepage.
4. Click the "About me" link to visit your second page.

If anything looks wrong, go back to your text editor, fix the code, save the file, and refresh your browser. Astro updates instantly — you don't need to restart anything.

### 7.3 Stop the Server When Done

When you're finished previewing, press **Control-C** in Terminal to stop the server.

---

## 8. Publishing to the World

This is the moment of truth. Your website will go from living only on your computer to being visible to anyone on the internet.

### 8.1 Build Your Website

**Building** means Astro takes your source files and creates a finished, optimised website ready for the internet.

In Terminal:

```sh
npm run build
```

This creates a `dist/` folder containing all your website files. You don't need to touch this folder — Git will handle it. But it's useful to know it exists.

### 8.2 Commit Your Changes to Git

**Committing** is like taking a screenshot of all your changes and saving them with a note about what you changed.

Run these commands one at a time:

```sh
git status
```

This shows you which files have changed. You should see your `.astro` files listed.

```sh
git add .
```

This tells Git to track all your changes.

```sh
git commit -m "Initial website setup with homepage and about page"
```

This saves your changes with a descriptive message.

### 8.3 Push to GitHub

**Pushing** sends your committed changes from your computer to GitHub.

```sh
git push origin main
```

(If your default branch is called `master` instead of `main`, use `git push origin master`.)

You may be asked to log in to GitHub. Follow the prompts.

### 8.4 Enable GitHub Pages

1. Go to your repository on GitHub.
2. Click the **Settings** tab.
3. Click **Pages** in the left sidebar.
4. Under **Source**, select **Deploy from a branch**.
5. Under **Branch**, select **main** (or **master**) and leave the folder as **/(root)**.
6. Click **Save**.

### 8.5 Wait for Deployment

GitHub will now build and publish your site. This usually takes 1–2 minutes.

1. Click the **Actions** tab at the top of your repository.
2. You'll see a workflow running. Wait for it to show a green checkmark.
3. Once it's done, visit `https://yourusername.github.io/` (or `https://yourusername.github.io/your-repo-name/` if you didn't name your repo `yourusername.github.io`).

Congratulations — your website is live!

---

## 9. Making Regular Updates

Every time you want to change your website, follow this cycle:

### Step 1: Edit Your Files

Open the files you want to change in your text editor. Make your edits and save.

### Step 2: Preview Locally

```sh
npm run dev
```

Visit `http://localhost:4321/` and check everything looks right.

### Step 3: Build

```sh
npm run build
```

### Step 4: Commit and Push

```sh
git add .
git commit -m "Describe what you changed"
git push origin main
```

### Step 5: Wait for GitHub to Deploy

Check the **Actions** tab. When the workflow completes, refresh your live site.

That's it. This cycle never gets more complicated than this.

---

## 10. Troubleshooting

### "npm: command not found"

Node.js is not installed. Go to [https://nodejs.org](https://nodejs.org) and install the LTS version.

### "Cannot find module 'astro'"

You skipped the `npm create astro@latest` step or the install failed. Run `npm install` inside your project folder.

### My changes don't appear on the live site

You probably forgot to push to GitHub. Remember: editing files on your computer does nothing until you `git push`. Also check the **Actions** tab to make sure the deploy workflow succeeded.

### I see an error page on my live site

Check the **Actions** tab. Click on the failed workflow run and read the error. Common causes:
- A typo in your `.astro` file.
- A missing closing tag (`</html>`, `</body>`, etc.).
- A broken link to an image or page.

### I want to use a custom domain (like www.myname.com)

GitHub Pages supports custom domains. In your repository Settings → Pages, you'll find a field to enter your domain. You'll need to configure a DNS record with your domain provider — GitHub gives you the exact values to enter.

### I'm on Windows

The commands are almost identical. Use **Git Bash** or **PowerShell** instead of Terminal. For Node.js installation, use the Windows installer from [https://nodejs.org](https://nodejs.org). The `~/Documents` path becomes something like `C:\Users\YourName\Documents`.

---

## Quick Reference: All Commands You'll Ever Need

| What you want to do | Command |
|---------------------|---------|
| Start local preview | `npm run dev` |
| Stop local preview | Press Control-C in Terminal |
| Build for publishing | `npm run build` |
| Check what changed | `git status` |
| Save your changes | `git add .` |
| Commit with a message | `git commit -m "your message"` |
| Send to GitHub | `git push origin main` |
| See your commit history | `git log --oneline` |

---

## What Comes Next

Now that you have a working website, here are some natural next steps:

- **Add more pages.** Copy `about.astro` and rename it. Each `.astro` file in `src/pages/` becomes a page.
- **Add images.** Put them in `public/` and link to them with `<img src="/my-photo.jpg" alt="Description" />`.
- **Learn Markdown.** Astro supports `.md` files for blog posts — simpler than writing HTML by hand.
- **Customise the design.** Edit the `<style>` sections in your pages, or learn CSS properly.
- **Add a contact form.** You'll need a backend service for this — services like Formspree make it easy.

Your website is yours now. Tinker with it, break it, fix it — that's how you learn.
