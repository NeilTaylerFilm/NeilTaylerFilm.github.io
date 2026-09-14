# Your website: a step-by-step guide

You do not need to understand web development to use this guide. Work through one section at a time. Copy the examples, change the words and filenames, then check the result before publishing.

**For all new photographs, follow [the R2 photo guide](R2-PHOTOS.md).** It covers uploading, blog images, project galleries and the slideshow. The local image examples below still work, but are an alternative to the R2 workflow.

There are **two separate steps** to putting something on your website:

1. **Prepare it on your Mac.** Save your writing in the website folder. R2 photographs are public as soon as you upload them, even if your writing is still a draft.
2. **Publish it.** Send your saved changes to GitHub. GitHub then updates the public website.

Saving a file on your Mac does **not** update the public website.

## Find your website folder

1. Open **Finder**.
2. Open **Documents**.
3. Open **CodingProjects**.
4. Open **neiltaylerfilm.github.io**.

This is your **website folder**. Keep it open while following the guide.

When this guide says `src/content/blog`, it means: open **src**, then **content**, then **blog**. The slashes separate folder names.

| What you want to add                  | Where it goes                    |
| ------------------------------------- | -------------------------------- |
| A written blog post                   | `src/content/blog`               |
| A photography project                 | `src/content/photography`        |
| Your new image files                  | `photo-inbox`, then upload to R2 |
| The list of pictures in the slideshow | `src/data/featured.ts`           |

Do not put your own content in `dist`, `public/_images`, `node_modules` or `examples`. Those are not your publishing folders.

## How to create and edit the text files

A blog post is a **plain-text file**, with a name ending in `.md`. This is called Markdown. It is just normal writing with a few simple formatting marks.

If you already use a code editor, open the website folder there and use **New File**. Otherwise, you can use **TextEdit**, which comes with your Mac:

1. Open **TextEdit** and choose **File → New**.
2. Choose **Format → Make Plain Text**. If the menu says **Make Rich Text**, it is already plain text.
3. Turn off **Edit → Substitutions → Smart Quotes**. The examples need straight quotation marks: `"`, not curly ones.
4. Paste the example from this guide. Copy only the text inside the example box—not the surrounding guide.
5. Choose **File → Save**.
6. Navigate to the exact folder specified in the instructions.
7. Enter the filename, including `.md`. If TextEdit offers to add `.txt`, keep `.md` instead.

For an existing file, Finder → right-click the file → **Open With → TextEdit**. Save changes with **Command-S**.

In Finder, you can check a filename with **right-click → Get Info → Name & Extension**. `my-post.md.txt` will not work: it must be `my-post.md`.

**Naming rule:** use lowercase letters and hyphens, such as `a-week-in-london.md` or `river-at-dusk.jpg`. Avoid spaces. Use exactly the same spelling wherever you refer to a file.

# 1. Add a blog post

## Step 1: Make the file

Inside the website folder, open **src → content → blog**.

Create a plain-text file called:

```text
a-week-in-london.md
```

Choose your own name if you prefer. The filename becomes part of the web address. This example becomes `/blog/a-week-in-london/`.

## Step 2: Copy this starting point

Paste this into the new file:

```markdown
---
title: 'A week in London'
date: 2026-09-14
categories:
  - Photography
  - Technology
description: 'A few notes from a week spent photographing London.'
excerpt: 'A few notes from a week spent photographing London.'
draft: true
---

Write your first paragraph here.

Write your next paragraph here. Leave a blank line between paragraphs.

## A heading inside your article

Write some more here.
```

Change the example title and writing to your own. Save the file.

## Step 3: Understand the small box at the top

Everything between the two `---` lines tells the website about your post. Keep both lines.

| Line          | What to put there                                                                         |
| ------------- | ----------------------------------------------------------------------------------------- |
| `title`       | The title readers will see. Keep the quotation marks around it.                           |
| `date`        | Your publication date: year-month-day. For example, 5 March 2027 is `2027-03-05`.         |
| `categories`  | One or more subjects, each on its own indented line. New categories appear automatically. |
| `description` | A short summary for search engines and shared links.                                      |
| `excerpt`     | The short introduction shown on the homepage. One or two sentences is enough.             |
| `draft: true` | Keep it off the public website while you work.                                            |

Your actual article goes **below the second `---` line**.

If your title contains quotation marks, avoid using double quotes inside the surrounding double quotes. For example, use `title: "An editor’s notebook"`, not `title: "My "best" edit"`.

## Step 4: Format your writing, if you want

Copy any of these into the article, below the second `---`:

```markdown
## A section heading

### A smaller heading

This word is **bold** and this word is _italic_.

[Words the reader clicks](https://example.com)

- First item
- Second item
- Third item

> A quotation goes here.
```

You do not need to put the article title into the body again: the website already displays it.

## Step 5: Add a picture to the post (optional)

You can publish a post with no pictures. If you want one:

1. In Finder, open **src → assets**.
2. Create a folder named **a-week-in-london**.
3. Copy a web-sized export into that folder. Keep your full-size originals in your normal photo library and backup.
4. Give the copied image a simple filename, such as **river.jpg**.

Use a **JPEG**, **PNG**, **WebP** or **AVIF** file. Export RAW or HEIC photographs as JPEG first. Before copying photographs into the website folder, export them as JPEG, sRGB, with the longest edge set to 2560 pixels and quality around 80–85%. Do not enlarge a smaller picture. Check that the export looks good; adjust quality if needed. The website then makes smaller versions for different screens automatically.

The image is now saved here:

```text
src/assets/a-week-in-london/river.jpg
```

To put it **inside the article**, add this on its own line between paragraphs:

```markdown
![The river at dusk with lights reflected in the water](/assets/a-week-in-london/river.jpg)
```

Change the description to match your photograph. This description helps people who cannot see the image; it is not a visible caption.

Notice that the image address starts with `/assets/`. You leave out `src` when writing an image address in a post.

To show a picture **above the article and on its homepage card**, add these two lines inside the top information box, before the second `---`:

```yaml
image: /assets/a-week-in-london/river.jpg
imageAlt: 'The river at dusk with lights reflected in the water'
```

You can use a lead image, pictures inside the article, both, or neither.

## Step 6: Preview, then publish

Follow **Section 4: Preview your changes** below. When you are happy, follow **Section 5: Put your changes on the public website**.

# 2. Add a photography project

A **project** is a group of photographs with its own page. It might be a trip, a location, a person or a series. It appears in the Photography tab.

## Step 1: Put the pictures in a folder

1. Open **src → assets** in Finder.
2. Create a folder named **london-at-night**.
3. Copy your chosen JPEG photographs into it.
4. Name them **bridge.jpg**, **street.jpg** and **station.jpg**, or use your own simple names.

In this example, you should now have:

```text
src/assets/london-at-night/bridge.jpg
src/assets/london-at-night/street.jpg
src/assets/london-at-night/station.jpg
```

## Step 2: Make the project’s text file

Open **src → content → photography**.

Create a plain-text file named **london-at-night.md**. Paste this into it:

```markdown
---
title: 'London at night'
year: 2026
location: 'London'
category: 'Street'
description: 'Photographs made on evening walks around London.'
coverImage: /assets/london-at-night/bridge.jpg
draft: true
images:
  - src: /assets/london-at-night/bridge.jpg
    alt: 'A lit bridge crossing the river at night'
    caption: 'An evening by the river.'
  - src: /assets/london-at-night/street.jpg
    alt: 'People walking along a street under shop lights'
    caption: 'The walk home.'
  - src: /assets/london-at-night/station.jpg
    alt: 'An almost empty station platform after dark'
---

Write a short introduction to your photographs here.
```

Change the names, places, descriptions and image addresses to your own. Save it.

## Step 3: Know what controls what

- **`title`** is the project name.
- **`coverImage`** is the picture shown on the Photography index card.
- **`images:`** starts the list of photographs on the project page.
- Each **`- src:`** starts one photograph.
- **`alt`** describes what can be seen, for accessibility.
- **`caption`** is optional text that visitors can see below the photograph.
- The introduction goes below the second **`---`**.

Keep the spaces at the beginning of the image lines exactly as shown. The `alt` and `caption` lines must sit underneath the image they belong to. Use spaces, not the Tab key.

The photographs appear in the same order as the list. To change the order, move an entire image block, including its `alt` and `caption` lines.

To add another picture, copy it into the image folder, then add another block underneath the last photograph and above the closing `---`:

```yaml
- src: /assets/london-at-night/another-photo.jpg
  alt: 'Describe this photograph'
  caption: 'An optional caption.'
```

To remove a photograph from the project, remove its whole block. You do not have to delete the image file itself.

If you do not want a location, year, category or caption, delete that entire line. The website will not leave a blank label behind. A project does not need an exact date. The title is required.

## Step 4: Preview and publish

Follow Sections 4 and 5. Your project appears automatically on the Photography tab once it is published. You do not need to edit the navigation or homepage.

# 3. Add pictures to the slideshow

The slideshow is the large photograph with left/right arrows at the top of the Photography tab. It is separate from the project cards beneath it.

Adding a photograph to a project does **not** automatically put it in the slideshow. You choose the slideshow pictures yourself.

## Step 1: Choose your photographs

You can reuse pictures already in a project folder. You do not need to copy them again.

For slideshow-only pictures, create **src → assets → slideshow** and put them there. Their addresses would look like `/assets/slideshow/my-photo.jpg`.

## Step 2: Open the slideshow list

In Finder, open **src → data**.

Open **featured.ts** in your plain-text editor. The `.ts` ending is correct for this particular file. Do not change it to `.md` or `.txt`.

This file has a little more punctuation than a blog post. The easiest first setup is to **replace its entire contents** with this example, then change the image addresses and descriptions:

```typescript
type FeaturedPhoto = {
  src: string;
  alt: string;
  caption?: string;
  project?: string;
  width: number;
  height: number;
};

export const featured: FeaturedPhoto[] = [
  {
    src: '/assets/london-at-night/bridge.jpg',
    alt: 'A lit bridge crossing the river at night',
    caption: 'An evening by the river',
    width: 6000,
    height: 4000,
  },
  {
    src: '/assets/london-at-night/street.jpg',
    alt: 'People walking along a street under shop lights',
    caption: 'The walk home',
    width: 6000,
    height: 4000,
  },
];

export const featuredIsDemo = false;
```

**The two image addresses must point to real files you have added.** Do not leave the example addresses unless you created those exact files.

For `width` and `height`, use the image’s pixel dimensions. In Finder, select the photograph and press **Command-I**. Look under **More Info → Dimensions**. If it says `6000 × 4000`, enter `width: 6000` and `height: 4000`. The first number is width. The image pipeline also reads the real dimensions automatically for local files.

Save with **Command-S**.

## Step 3: Add or remove slideshow pictures

Each picture is one block between `{` and `},`.

To add a third picture, copy one whole block and paste it **before the final `];`**, then change its contents:

```typescript
  {
    src: '/assets/london-at-night/station.jpg',
    alt: 'An almost empty station platform after dark',
    caption: 'Last train',
    width: 6000,
    height: 4000,
  },
```

Keep the commas, braces and quotation marks. Use the straight quotes shown in the example. Avoid apostrophes inside single-quoted descriptions; for example, write `'The station at night'` rather than `'The station's lights'`.

Move whole blocks to change the slideshow order. Remove a whole block to remove a picture. The first block is the first picture visitors see.

## Step 4: Optionally make a slide open a project

Inside a picture block, add this line:

```typescript
    project: 'london-at-night',
```

Use the project’s `.md` filename **without** `.md`. The project must be published (`draft: false`) before you publish a slideshow link to it. Otherwise, the public link would be broken.

If you leave out the `project` line, clicking the slide opens the photograph instead.

**The slideshow has no draft switch.** Changes become public the next time you publish website changes. They can be previewed locally first.

## Step 5: Preview and publish

Follow Sections 4 and 5. Open the Photography tab and try the arrows. With only one photograph, the arrows are hidden because there is nothing to switch to.

# 4. Preview your changes on your Mac

This is your private rehearsal. Visitors cannot see it.

## Step 1: Open Terminal

Press **Command-Space**, type **Terminal**, and press **Return**.

Copy this whole line into Terminal and press Return:

```sh
cd /Users/neil/Documents/CodingProjects/neiltaylerfilm.github.io
```

This tells Terminal which folder you are working in. Do this whenever you open a new Terminal window for the website.

## Step 2: Start the private preview

Run these commands **one at a time**, pressing Return after each and waiting for it to finish:

```sh
npm run dev:stop
```

```sh
npm run dev
```

If the first command says no server is running, that is fine. The second command prepares the images and starts the preview.

Open the address printed by the second command. It is usually:

```text
http://127.0.0.1:4321/
```

Use the address Terminal actually prints if it differs. This preview shows drafts as well as published content.

After editing your writing, save and refresh the browser. After adding or changing pictures, repeat the two commands above: restarting prepares the new image files too.

The server runs in the background, so Terminal returning to its normal prompt does not mean the preview has stopped.

If you see `npm: command not found`, or a missing-dependency error, stop and ask for help with the exact error. On this Mac the tools are already installed. On a newly set-up computer, the dependencies also need installing with `npm ci`.

## Step 3: Check what you made

Open the relevant tab and check:

- Your title and writing are correct.
- Every photograph appears, with the correct caption.
- The project gallery opens and closes correctly.
- The slideshow arrows work, if you added more than one picture.
- Any slideshow link opens the intended project.

You may still have the old preview on **port 4322** open. That is different: it shows the last built public version and hides drafts. Use the **development address printed above** while writing.

# 5. Put your changes on the public website

## Step 1: Mark finished posts and projects as published

In each post or project you want visitors to see, change:

```yaml
draft: true
```

to:

```yaml
draft: false
```

Save the file. Leave unfinished posts set to `true`.

## Step 2: Check the website

In Terminal, first make sure you are in the website folder:

```sh
cd /Users/neil/Documents/CodingProjects/neiltaylerfilm.github.io
```

Then run these **one at a time**. Wait for each to finish:

```sh
npm run check
```

```sh
npm test
```

```sh
npm run build
```

```sh
npm run verify
```

These commands check your files, test the website, prepare the public pages and check their links.

If a command reports an error, **do not continue to publishing**. Copy the error and ask for help. If you have not added any posts or projects yet, notices about empty collections are expected.

## Step 3: Look at the public version before uploading it

Run:

```sh
npm run preview -- --background --port 4322
```

Open the printed address, normally `http://127.0.0.1:4322/`.

This is the version that will go public. Drafts should be absent. Check it once more.

If you change something after this step, save it and run `npm run build` and `npm run verify` again before publishing. Refresh the browser to see the new build.

## Step 4: Send the changes to GitHub

A **commit** is a saved bundle of changes. A **push** sends that bundle from your Mac to GitHub.

You can ask Codex to help with this step:

> Please review my website changes, check that my intended posts and projects are published, then commit and push them to main. Check the GitHub Pages deployment afterwards.

Or use Terminal yourself:

1. Check which branch you are on:

```sh
git branch --show-current
```

It should say **main**. If it says something else, stop and ask for help rather than switching branches blindly.

2. See which files have changed:

```sh
git status --short
```

3. Select the files you want to publish. For the examples in this guide, run only the commands that match files/folders you actually created:

```sh
git add src/content/blog/a-week-in-london.md src/assets/a-week-in-london
```

```sh
git add src/content/photography/london-at-night.md src/assets/london-at-night
```

```sh
git add src/data/featured.ts
```

If your slideshow uses its own image folder, add that too:

```sh
git add src/assets/slideshow
```

Replace the example filenames with yours. If Git says a path does not exist, check its spelling; do not ignore the error.

4. Review the selected file list:

```sh
git diff --cached --stat
```

The list should contain the writing and images you intend to publish. If unexpected files appear, ask for help before continuing.

5. Save the bundle, using a short description of your change:

```sh
git commit -m "Add my new post and photographs"
```

6. Send it to GitHub:

```sh
git push origin main
```

If Git asks you to sign in, complete its sign-in flow. If you get an authentication error, ask for help; do not paste passwords or access tokens into the chat.

The website setup has already been committed and pushed. For future posts, the example `git add` commands above select your new content. If you also change the website itself, review and include those files separately.

## Step 5: Wait for GitHub to finish

1. Open your website repository on GitHub: `NeilTaylerFilm/NeilTaylerFilm.github.io`.
2. Open its **Actions** tab.
3. Look for the latest **Deploy Astro to GitHub Pages** run.
4. Wait until both its build and deployment finish successfully.
5. Open `https://neiltaylerfilm.github.io/` and refresh it.

If the run fails, the new version has not successfully deployed. Open the failed run and share the error message when asking for help.

# 6. Change something you already published

For writing or captions, open the original `.md` file, edit it and save. For new pictures, copy the files into the image folder and update the image list.

Preview and publish again using Sections 4 and 5.

Keep an already-published post or project’s filename unchanged: changing it changes its web address. You can change the displayed `title` without changing the filename.

For a genuinely revised blog post, you can add a line such as `updated: 2027-03-08` inside its top information box. Keep the original publication `date`.

# If something goes wrong

| Problem                                        | First thing to check                                                                                             |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| My new post is missing from the public preview | Is it still `draft: true`? Did you save and rebuild?                                                             |
| My photo is missing                            | Does the actual file exist? Does its address match exactly, including `.jpg` versus `.jpeg` and capital letters? |
| I see my writing but not the latest pictures   | Restart the development preview so the images are prepared again.                                                |
| My project images do not appear                | Check the spaces before `- src:`, `alt:` and `caption:` against the example.                                     |
| My project is missing from the slideshow       | Projects and slideshow pictures are separate lists. Add the slide in `featured.ts`.                              |
| A slideshow link is broken                     | The `project` value must match the project filename without `.md`, and the project must be published.            |
| The preview cannot be reached                  | Start it again and use the address Terminal prints.                                                              |
| The public website has not changed             | Saving is not publishing. Check that you committed, pushed and the GitHub deployment succeeded.                  |
| I get an error I do not understand             | Stop, copy the exact error, and ask for help. You do not need to guess.                                          |

Your retired examples are stored in `examples/retired-demo/`. They are not published. You can refer to them, but create new posts and projects in the folders described above.

## Should I use JPEG XL (.jxl)?

For this website as currently configured, use high-quality JPEG exports for photographs. You do not need to make WebP copies yourself: the website does that automatically.

JPEG XL can show a rough image first and sharpen it as more data arrives. This is called progressive loading. Browser support and progressive-display support are separate issues, so a JPEG XL file does not guarantee that effect for every visitor. Ordinary JPEG can also be encoded progressively.

This site's image pipeline currently does not accept `.jxl` files. Its responsive images choose a suitably sized download for the screen; this is different from showing a blurry preview and sharpening it. If you want that preview effect later, ask for it as a website feature rather than converting your whole photo collection first.

References checked September 2026: [Mozilla's JPEG XL announcement](https://hacks.mozilla.org/2026/08/intent-to-ship-jpeg-xl/), [MDN's image format guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types), and [WebKit's progressive-decoding tracker](https://bugs.webkit.org/show_bug.cgi?id=272350).

## Put a blog post in more than one category

In the small information box at the top of your blog post, use this:

```yaml
categories:
  - Photography
  - Technology
  - Film
```

Put each category on its own line. Copy the two spaces and the dash before each name. Add or remove lines to choose the subjects that fit your post. For just one category:

```yaml
categories:
  - Photography
```

The post appears under every category you list when visitors use the filter. It appears only once in the main feed. New categories appear automatically.

Older posts using `category: "Photography"` still work. When changing an older post to multiple categories, replace that entire line with the list above. Do not put several names in one quoted string. If both `category` and `categories` exist, the `categories` list takes precedence. Repeated names, ignoring spaces and capitalisation, count only once.

Photography projects still use the single `category` field shown in the project instructions.

## Keeping photo storage manageable

Your website is a display shelf, not a backup of your photo library. These steps apply to blog pictures, the slideshow and photography projects.

1. Keep RAW files and full-resolution originals in your usual photo library and backup.
2. In your photo editor, export only the pictures you want to publish: JPEG, sRGB, longest edge 2560 pixels, quality around 80–85%.
3. Look at the exported picture before uploading. Around 300 KB–1 MB is a useful target, not a rule; detailed photographs may need more.
4. Copy that export into the website image folder and follow the instructions above.

The automatic resizing makes smaller pictures for visitors. It does **not** shrink the file you put into GitHub. Git also remembers older versions, so deleting or replacing a large photograph does not immediately reclaim all its repository space.

GitHub recommends keeping a Pages source repository within 1 GB. The published website also has a 1 GB maximum; its generated image sizes count toward that. This is enough to start a carefully selected portfolio, but it is not unlimited photo storage. See [GitHub's limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).

### What about Cloudflare R2?

R2 can hold your web pictures separately from GitHub. You can display a public R2 image using its address. The photo upload command creates smaller versions locally and records their public addresses for the site. Use the command rather than manually uploading a large file.

R2 Standard includes 10 GB-month of storage, one million write/list operations and ten million read operations each month. Internet download bandwidth is free. Usage beyond the free allowances is billed: the free allowance is **not** a spending cap. See [R2 pricing](https://developers.cloudflare.com/r2/pricing/).

For perspective, 10 GB holds roughly 10,000 pictures averaging 1 MB each, before allowing for extra sizes or other files. Cloudflare recommends a custom domain for production use; the provided r2.dev address is for development and is rate limited. A domain may add a cost if you do not already own one. See [public bucket setup](https://developers.cloudflare.com/r2/buckets/public-buckets/).

This site now supports R2 uploads through the Worker. Follow [R2-PHOTOS.md](R2-PHOTOS.md) for the current workflow. Keep original photographs in your usual photo library and backup.

## Changing your contact details

Open **src → config → site.ts** in your text editor. The email address is after `email:`. The Contact page shows an **Email me** button, which opens the visitor's email app. The address is still inside the link, so this hides it from casual view but does not prevent automated collection.

Each social link has a `label`, a `url` and a `username`. Change the username to change the visible text; change the URL to change where the link goes. Save and publish using the steps above.
