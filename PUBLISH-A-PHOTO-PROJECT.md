# Publish a photography project

This guide takes you from a folder of photographs to a finished project on **neiltaylerfilm.github.io**. It is written for your existing Mac and website setup. You can follow it without asking an AI to do the steps.

Your project will have a card on the Photography page. Clicking that card opens your project: its title, your introduction, and a compact Google Photos–style grid. Clicking a photograph opens a larger view.

**Reading this guide does not upload anything. Step 4 is the first step that uploads photographs. Step 10 publishes the website page.**

## Before you start

You need your Mac, an internet connection, the photographs, and the website folder already on this Mac:

`Documents → CodingProjects → neiltaylerfilm.github.io`

Your R2 connection has already been set up in this folder. Keep your original photographs and backups elsewhere. The website copies are smaller viewing copies, not a backup of your originals.

There are two separate things to publish:

- **The photographs:** the upload command sends viewing copies to Cloudflare R2.
- **The project page:** you save a small text file and send it to GitHub. GitHub updates your website.

Uploading photographs alone does not create a project card. Saving a project on your Mac alone does not change the live website.

## 1. Choose and organise your photographs

1. Open **Finder**.
2. Open your website folder, then **photo-inbox**. Create that folder if it does not exist.
3. Move any photographs from a previous batch out of this folder. Keep them backed up; moving them out does not delete their uploaded copies.
4. Copy the photographs for **one project** into photo-inbox. Copy them; do not move your only originals.
5. Put the files directly inside photo-inbox. The upload tool does **not** look inside subfolders.

Hundreds of photographs can go in one batch. Keep all the photographs for this project together until the upload and project creation are finished.

If your originals are in several dated folders, copy the pictures from each folder into photo-inbox. If Finder asks to replace a file with the same name, cancel that replacement. Give the copies distinct names first, such as `day-1-001.jpg` and `day-2-001.jpg`, so you keep both photographs.

Use **JPEG, PNG, WebP, AVIF or HEIC/HEIF**. On your Mac, the uploader automatically converts HEIC/HEIF files before making the web copies. No manual conversion or extra software is needed. Export RAW photographs as JPEG first. Do not put videos or JXL files in the batch.

HEIC conversion uses macOS’s built-in tools, including during a dry run. Large HEIC batches can take longer. Temporary conversion files are removed automatically, and your originals stay untouched. On other operating systems, export HEIC files as JPEG before uploading.

### Which format should I put in photo-inbox?

**For new exports from your photo editor, use a high-quality JPEG in sRGB.** A quality setting around **90–95 out of 100** is a useful starting point, not a requirement; settings vary between editors. Export at full resolution, and let the uploader make the smaller sizes. There is no need to make WebP files yourself or reduce the photograph to a tiny file first.

**Already have HEIC photographs? Put those straight in photo-inbox on your Mac.** There is no benefit to manually making an extra JPEG first. The uploader now handles the conversion. Keep your original HEIC files and RAW files in your archive.

This recommendation is for the **source file you give the uploader**. Visitors receive **WebP, with JPEG as a fallback**, whichever source format you started with. JPEG is a practical source for photographs; WebP provides efficient web delivery. See [MDN’s image-format guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types) for general format background. The export settings above are a recommendation for this website’s workflow.

PNG, WebP and AVIF inputs also work, but you do not need to convert your photographs into those formats first. RAW and JXL inputs are not supported. Avoid repeatedly saving or converting a compressed photograph: always start with your best available original or a fresh export from your editor.

### What happens to a HEIC file before upload?

For each photograph, the uploader:

1. **Reads the original without changing it.** The file in photo-inbox remains untouched.
2. **Makes a temporary PNG on your Mac**, using the built-in macOS image converter. This is an intermediate working copy, not a file you need to manage. Using PNG at this stage avoids an extra JPEG compression step; it cannot restore detail already lost in the original HEIC.
3. **Reads that PNG and removes the temporary conversion files.** The remaining work uses the decoded image in memory.
4. **Applies image orientation and converts the viewing copies to sRGB**, a standard colour space used for web photographs.
5. **Makes several smaller sizes**, keeping the image proportions and never enlarging a small original. The largest HEIC-derived copy has a longest edge of up to 2560 pixels; a portrait can finish a pixel or two below that because dimensions must be whole numbers. A 6000 × 4000 landscape produces widths of 480, 960, 1440, 1920 and 2560 pixels. Portraits have narrower widths to stay within the longest-edge limit.
6. **Compresses every size into WebP and JPEG.** The current output quality settings are 88 for WebP and 90 for JPEG. These are encoder settings, not percentages of original detail retained. EXIF information, including camera and GPS metadata, is omitted from the final files.
7. **Uploads only those finished WebP and JPEG copies to R2**, then records their addresses and sizes for the website. Neither the original HEIC nor the intermediate PNG is uploaded.

A **dry run** performs the conversion and compression too, so it can estimate the actual upload size. It does not upload the copies or update the website’s image list. It still needs the existing R2 connection to check which copies are already stored. A real upload skips copies already present when you repeat the same batch.

HEIC processing is available through the **R2 uploader on macOS**, not by putting HEIC files directly into src/assets or uploading them manually in the Cloudflare dashboard. It needs no additional software on your Mac. On Windows or Linux, export a JPEG first. The uploader handles still photographs, not Live Photo video or animated/multi-image sequences.

The finished files are compressed web viewing copies, not archival masters. Do not assume HEIC HDR brightness or wide-gamut colours will be preserved exactly through conversion. Before publishing a large batch, preview a few representative images, especially bright highlights and saturated colours. Keep your originals for printing and future edits.

### Full size is fine

A 6000 × 4000 photograph is fine. You do not need to resize it first. The upload command makes compressed WebP and JPEG versions at several sizes, with a maximum longest edge of 2560 pixels. It handles orientation, converts the copies to sRGB and removes embedded metadata, including GPS. Your originals are untouched.

The website lets a visitor's browser choose an appropriate size. A phone does not have to download your full-resolution original. Most gallery pictures load as the visitor scrolls; opening a picture can fetch the larger viewing copy. Hundreds of pictures still take time and storage, so choose photographs you actually want to show.

### Choose the order before uploading

The tool reads files in filename order, not the order you dragged them into Finder. The automatic project step below preserves that order.

For a deliberate order, name your copies like this:

```text
001-arriving-on-set.jpg
002-lighting-the-scene.jpg
003-between-takes.jpg
```

Use the same number of digits throughout. Use four digits if you might have more than 999 pictures. Existing filenames starting with a date and time are also useful for chronological order. Renaming the copies is optional.

## 2. Open Terminal

1. Press **Command-Space**.
2. Type **Terminal**.
3. Press **Return**.

For each command box in this guide, copy the text inside it, paste it into Terminal, and press Return. Wait until it finishes before continuing. Keep using the same Terminal window.

First, tell Terminal which folder to use:

```sh
cd "/Users/neil/Documents/CodingProjects/neiltaylerfilm.github.io"
```

No message is normal. If it says the folder does not exist, stop and check its location in Finder.

## 3. Check the connection and estimate the upload

Run:

```sh
npm run photos:check
```

You should see **Connected to the photo bucket** and a storage amount.

Then run:

```sh
npm run photos:upload -- --dry-run
```

This prepares an estimate without uploading or registering pictures. It can take a while for hundreds of files. Wait for **Preview complete. Nothing uploaded or registered.**

Each photograph can produce several files. That is expected: these are the different sizes and formats. The tool has a storage threshold, but this is not a guarantee of a zero bill. Check your total R2 account usage in Cloudflare, including other buckets, before a large upload. The bucket check only measures this website's bucket.

If either command fails, use the troubleshooting section below before continuing.

## 4. Upload the photographs

**This step makes the uploaded pictures publicly accessible through their image addresses, even while the project page is a draft.** Only proceed with pictures you are ready to share.

Run:

```sh
npm run photos:upload
```

Keep your Mac awake and connected to the internet. Do not start another upload at the same time. Hundreds of pictures may take a while; Terminal prints progress for each picture.

Wait for **Done. Open photo-inbox/UPLOAD-RESULTS.md…** before proceeding.

This command creates or updates:

- **photo-inbox/UPLOAD-RESULTS.md:** a readable list connecting your filenames with their image addresses.
- **src/data/r2-images.json:** the website's list of picture sizes. This must be published with the project. Do not edit it by hand.

If an upload fails halfway, run the same upload command again with the same photographs. It skips viewing copies that already exist. Do not use an incomplete results file to create the project.

## 5. Create the whole project in one step

You do **not** need to copy hundreds of addresses individually. The following block reads the latest upload results and makes a draft project containing every picture in that batch.

Do this **before uploading a different project**, because another batch replaces UPLOAD-RESULTS.md. This step belongs to one complete batch for one project.

### Choose a page name

The example uses `my-photo-project`. Replace that text in the block below with a short, unique name using lowercase letters, numbers and hyphens. For example: `late-night-drive-bts`.

That becomes both the filename and the final page address:

```text
src/content/photography/late-night-drive-bts.md
https://neiltaylerfilm.github.io/photography/late-night-drive-bts/
```

Do not include `.md` in the page name you type into the block. Avoid changing the name after publishing, because that changes the page address.

**For your current Late Night Drive test:** use `late-night-drive-bts`. The existing `late-night-drive.md` is an intentionally ignored local preview with image addresses that only work on your Mac. Do not just change that old file to `draft: false` or force it into GitHub. Make a new project from the R2 upload using this guide. You may see both drafts in your local preview; the old test remains hidden from production.

### Copy this entire block into Terminal

Only change `my-photo-project` before running it. Include the first and last lines. The block is long because it does the repetitive work for you. It does not upload or publish anything and refuses to overwrite an existing project.

```sh
node --input-type=module <<'PHOTO_PROJECT'
import { readFileSync, writeFileSync } from 'node:fs';

const pageName = 'my-photo-project';
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pageName)) {
  throw new Error('Use only lowercase letters, numbers and single hyphens for the page name.');
}
const report = readFileSync('photo-inbox/UPLOAD-RESULTS.md', 'utf8');
const registered = JSON.parse(readFileSync('src/data/r2-images.json', 'utf8'));
const addresses = [...report.matchAll(/^Image address: (https:\/\/\S+)\r?$/gm)]
  .map(match => match[1]);
if (!addresses.length || addresses.some(address => !registered[address])) {
  throw new Error('No complete registered photo list found. Finish the upload first.');
}
const project = {
  title: 'Your project title',
  subtitle: 'Your role, for example BTS Photographer',
  description: 'A short description of this project.',
  year: new Date().getFullYear(),
  category: 'Behind the scenes',
  draft: true,
  galleryLayout: 'justified',
  coverImage: addresses[0],
  coverAlt: 'Describe the cover photograph',
  images: addresses.map(src => ({ src, alt: 'Describe this photograph' })),
};
const filename = `src/content/photography/${pageName}.md`;
const content = `---\n${JSON.stringify(project, null, 2)}\n---\n\nWrite your introduction here.\n`;
writeFileSync(filename, content, { flag: 'wx' });
console.log(`Created ${filename} with ${addresses.length} photographs. Nothing published.`);
PHOTO_PROJECT
```

You should see **Created … with … photographs. Nothing published.** Check that the number matches your intended batch.

If you see **EEXIST**, a project with that filename already exists. Nothing was overwritten. Open that project instead, or choose a different page name if this really is a separate project.

## 6. Add your title and introduction

In Finder, open **src → content → photography** inside your website folder. Open the new `.md` file in a plain-text editor.

If using TextEdit, choose **Format → Make Plain Text** if that option appears. In **Edit → Substitutions**, turn off **Smart Quotes**. Keep the filename ending in `.md`, not `.md.txt`. A code editor you already use is also fine; do not use Word or Pages.

The file has an information section between two lines containing `---`, followed by your introduction. The automatically generated information uses braces, commas and straight quotation marks. Keep those in place.

At the top, replace the example wording:

```json
  "title": "Late Night Drive",
  "subtitle": "BTS Photographer",
  "description": "Behind-the-scenes photography from the short film Late Night Drive.",
  "year": 2026,
  "category": "Behind the scenes",
  "draft": true,
  "galleryLayout": "justified",
```

These lines are an example of the top fields, **not a replacement for the entire file**. Keep your generated cover and image list underneath them.

- **title:** the project name visitors see.
- **subtitle:** your role, such as BTS Photographer.
- **description:** one short sentence describing the project.
- **year:** the year the project happened. Change the automatically filled year if necessary.
- **category:** a label used by the Photography page's filter. Use a consistent spelling across projects.
- **draft:** keep `true` while preparing the page. Change it to `false` when ready to publish.
- **galleryLayout:** keep `"justified"`. This turns on the Google Photos–style grid.

Do not delete the image addresses. Keep commas between entries; the last item in a list has no trailing comma. Avoid typing double quotation marks inside a quoted description; use single quotation marks in the wording instead.

### Write the introduction

Below the **second** `---` line, replace `Write your introduction here.` with your own text. For example:

```markdown
I worked as the BTS photographer on **Late Night Drive**.

These photographs follow the cast and crew through the shoot, from setting up each scene to the moments between takes.
```

Blank lines separate paragraphs. Two asterisks on each side make words **bold**. You do not have to repeat the photographs here; the image list makes the gallery automatically.

### Choose the cover

The first uploaded photograph is selected automatically. To change it, find your preferred filename in **photo-inbox/UPLOAD-RESULTS.md**, copy its **Image address**, and replace only the address beside `"coverImage"` in the project.

Replace `"Describe the cover photograph"` with a short description of that cover.

### Describe the photographs

Every picture has an `"alt"` line. Replace `"Describe this photograph"` with what that photograph shows, for example:

```json
"alt": "Camera crew lighting a car interior at night"
```

This helps people using screen readers. It is not a visible caption underneath every thumbnail. Use the filename/address pairs in UPLOAD-RESULTS.md to identify each photograph. The computer can make the list for you, but it cannot supply accurate descriptions of what is happening in each picture.

Visible captions are optional. For a compact photo grid, leaving them out is the simplest choice.

Press **Command-S** to save.

## 7. Preview it on your Mac

In Terminal, run these separately:

```sh
npm run dev:stop
```

```sh
npm run dev
```

If the first command says no server is running, continue to the second command.

**Use the exact address Terminal prints.** The port number can change. If it says `http://127.0.0.1:4334`, open:

```text
http://127.0.0.1:4334/photography/
```

Paste it into the browser's **address bar**, then press Return. Keep `http://`, rather than changing it to `https://`. Do not assume the port is 4322.

Scroll below the slideshow to the project index, then click your new project. Drafts appear in this development preview. They do not appear in the production build.

Check the title, introduction, cover, photograph count and order. Scroll through the gallery. Click several pictures to enlarge them, including portrait and landscape photographs. Try narrowing the browser window to check the smaller layout.

The grid uses compact rows with small gaps. Its thumbnails may crop slightly to fill the row; opening a photograph shows the full image. This is a Google Photos–style layout, not a connection to Google Photos.

If you change the project text, save it and refresh. If you upload more images, restart the preview so it picks up the updated picture-size list.

## 8. Mark the project ready and check it

In the project file, change:

```json
"draft": true,
```

to:

```json
"draft": false,
```

Save. This still does not publish anything by itself.

In Terminal, run each command separately and wait for it to finish:

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

Stop if any command fails. Fix the problem before publishing. Notices about empty blog or post-production collections are expected if those sections have no entries.

Now preview the finished build:

```sh
npm run preview -- --background
```

Open the **new address printed by this command**, then visit `/photography/` and your project. This preview shows what will be published, with draft projects hidden. Confirm that your new project and images work here too.

If you make an edit afterwards, save and repeat the checks and build before publishing.

## 9. Select the files to publish

Run:

```sh
git branch --show-current
```

It should say **main**. If it does not, stop: these publishing steps assume main. Do not switch branches blindly when you have unfinished work.

Run:

```sh
git status --short
```

This lists files changed on your Mac. `M` means modified; `??` means new; `D` means deleted. You may see unrelated website changes. You do not have to publish them with this project.

Select your project, replacing `my-photo-project.md` with your actual filename:

```sh
git add src/content/photography/my-photo-project.md
```

Also select the updated photograph-size list:

```sh
git add src/data/r2-images.json
```

These are the two files normally needed for a new R2 photo project. Do **not** select everything using `git add .`. Do not add photo-inbox or `.env.r2`; the latter contains private credentials.

Check what is selected:

```sh
git diff --cached --stat
```

This includes anything selected earlier, too. If an unrelated file appears, remove it from the selection by running `git restore --staged` followed by that file's path. For example:

```sh
git restore --staged src/pages/contact.astro
```

This only removes the file from the publishing selection. It keeps your edits on your Mac. Run the selected-list check again afterwards.

## 10. Publish the project page

Save the selected files as a bundle:

```sh
git commit -m "Add photography project"
```

You can change the message inside the quotes to describe your project. A **commit** is a saved bundle of changes, still on your Mac.

Before sending, run:

```sh
git status -sb
```

If this reports your branch is behind or diverged from the remote, stop and resolve that before publishing. Do not force-push. If there are several commits ahead, the push will send all of them, including earlier work. Review those too before proceeding.

**The next command sends your saved changes to GitHub and starts the website update:**

```sh
git push origin main
```

Then:

1. Open [your GitHub Actions page](https://github.com/NeilTaylerFilm/NeilTaylerFilm.github.io/actions).
2. Open the newest **Deploy Astro to GitHub Pages** entry for your commit.
3. Wait for both **build** and **deploy** to show green ticks.
4. Open [the live Photography page](https://neiltaylerfilm.github.io/photography/).
5. Find your project, open it, and check the images.

You are finished when the deployment succeeds **and the project works on the live website**. A failed deployment is not a successful publication. Open the failed step to read the error, fix the relevant file locally, and repeat the checks and publishing steps.

## 11. Put the upload tray away

Save a copy of **UPLOAD-RESULTS.md** alongside your original project photographs if you want an easy record of which filename belongs to which web address. Do this before uploading another project.

You can now move the source pictures out of photo-inbox. The website will keep working because visitors use the uploaded R2 copies. Keep the originals in your normal archive and backup.

To stop the development preview:

```sh
npm run dev:stop
```

To stop the production preview:

```sh
npm exec -- astro preview stop
```

Stopping these local previews does not turn off the public website.

## Changing a project later

### Change words, cover or category

Edit the existing project file, save it, preview, check and publish again. You do not have to reupload unchanged pictures.

### Add more photographs

1. Put just the additional photographs into photo-inbox and complete the upload steps.
2. Open UPLOAD-RESULTS.md and find each new image address.
3. Open the existing project file. At the bottom of its `"images"` list, add the new entries using the same format as the existing ones. Put a comma between entries. For example, the final two entries might look like:

```json
    {
      "src": "THE-EXISTING-IMAGE-ADDRESS",
      "alt": "The existing description"
    },
    {
      "src": "THE-NEW-IMAGE-ADDRESS",
      "alt": "Describe the new photograph"
    }
```

4. Keep the closing `]` and `}` beneath the list. Preview, check and publish both the project file and r2-images.json again.

For a large additional batch, the simplest approach is to put **all** the project's photographs back in photo-inbox, run the upload again, and generate a new file using a temporary page name. Unchanged image copies are skipped. Copy the new file's entire `"images"` list into your existing project, keeping your title, introduction, cover and any descriptions you already wrote. Remove the temporary file once finished. Do not publish the temporary project. The generator deliberately never overwrites your existing writing.

### Reorder or remove photographs

Each photograph is one `{ ... }` entry inside `"images"`. Move the whole entry to reorder it; delete the whole entry to remove it. Keep commas between entries and no comma after the last one. Preview and run the checks afterwards.

Removing an image entry only removes it from that gallery. It does not delete the R2 file. Deleting a project does not delete its R2 photographs either. Do not delete bucket files unless you have checked that no other project, post or slideshow uses them.

### Add a project image to the top slideshow

Publishing a project does not automatically change the Photography page's top slideshow. That is a separate selection. To add a picture there, follow the slideshow section of [R2-PHOTOS.md](R2-PHOTOS.md). Its `project` value should be your project's filename without `.md`, such as `late-night-drive-bts`.

## Troubleshooting without guessing

| What you see | What to do |
| --- | --- |
| `command not found: astro` | Use the `npm run ...` commands in this guide. Astro is installed inside the project, not as a general Mac command. |
| `command not found: npm` | Node.js is missing from that Terminal session. Use your normal Mac Terminal and installed Node setup. This guide assumes the existing website tools are installed. |
| `No supported photos found` | Put supported image files directly in photo-inbox, not a nested folder. |
| No `Done` message after upload | Do not generate the project yet. Read the error and rerun the upload after fixing it. The results may only contain part of the batch. |
| The gallery has too few or the wrong photographs | Check the count in UPLOAD-RESULTS.md and which files were in photo-inbox. A later upload batch replaces that report. |
| `EEXIST` when creating a project | That project file already exists. Open it or choose a different page name. The generator has not replaced it. |
| A check reports a parsing error | Open the named file near the reported line. Check straight quotes, commas between entries, matching braces, and both `---` lines. Undo your last edit if needed and retry. |
| Project missing locally | Open `/photography/` and scroll below the slideshow. Confirm you saved the file in src/content/photography with a `.md` extension. Restart the development server. |
| Browser cannot connect | Run `npm run dev:status`. If stopped, run `npm run dev`. Use the exact printed address and port, with `http://`. |
| `git add` says the file is ignored | The old Late Night Drive local test is deliberately ignored. Use a new name, such as late-night-drive-bts, and generate it from R2 results. Do not use a force-add to publish the local test. |
| Pictures work locally but fail in production | Look for `/@fs/`, `.qa`, `/Volumes/` or a Mac file path in your project. Those belong to the old local test. Published projects need the R2 addresses. Also confirm r2-images.json was included in the commit. |
| Project missing from the finished build or live site | Check `"draft": false`, save, rebuild, then publish. Check the newest deployment succeeded. |
| Live site still looks old | Wait for the matching deployment's green ticks, then open the live URL in a private browser window. |
| Upload credentials rejected | In Cloudflare, check the R2 API token is active and has read/write access to the website bucket. Check the saved settings in .env.r2 locally; never share or commit that file. Use cloudflare/SETUP.md for your connection setup. |
| Public image verification failed | In Cloudflare, check the image Worker's `IMAGES` binding points to images-neiltaylerfilm-github-io. Try an already uploaded image URL in your browser, then retry the upload when delivery works. |
| Another upload is running | Wait for it to finish. If an upload crashed, restart the Mac to ensure no uploader remains, then use Finder's Command-Shift-period to show hidden files and remove only `.photo-upload.lock` from the website folder. Retry. Never remove that lock while an upload is active. |
| Storage threshold reached | Stop uploading and review storage across your Cloudflare account. Do not disable the threshold simply to continue. |
| Push rejected or sign-in requested | Your changes remain on your Mac. Check GitHub sign-in/access. If GitHub has newer work, it must be combined with your work before pushing. Do not use a force push; read the exact error before taking further action. |

If you get an unfamiliar error, stop at that step. Your saved originals and project file remain available. You can consult the relevant tool's documentation or a developer using the error message; never share passwords or tokens. Do not rerun unrelated commands or delete files to try to clear an error.

## Next project's short checklist

1. Put one project's selected photographs directly in photo-inbox.
2. Run the connection check and dry run.
3. Upload; wait for Done.
4. Generate a new project using a unique page name.
5. Edit the title, role, description, year, category, introduction and image descriptions.
6. Keep `galleryLayout` set to `justified`.
7. Preview using the address Terminal actually prints.
8. Set draft to false; check, test, build and verify.
9. Select the project file and r2-images.json; review the selection.
10. Commit, push, wait for green deployment ticks and check the live project.

The local page generator uses your existing upload report. It does not change the upload tool, upload originals, or publish anything itself.

## Showing the exact date of a project

If you know the day, replace the `"year": 2026,` line in your project's details with:

```json
"date": "2026-07-18",
```

That means 18 July 2026. The website writes it as **18 July 2026** for you, on both the project card and project page. Always type the year, month and day in that order, with hyphens and quotation marks. Do not type `18 July 2026` into the file. Impossible dates will stop the preview/build and show an error so you can correct them.

If you only know the year, keep:

```json
"year": 2025,
```

You do not need to invent a day or month. Use one of these lines, not both. Older year-only projects still work. Dates do not change the page's address. Year-only projects sort as the beginning of that year; that is only a sorting convention, not a claimed shoot date.

## How gallery image sizes work

You still upload through the same photo-inbox workflow. The grid automatically chooses from the prepared image sizes. Opening a photograph uses a separate larger image source, so small grid previews do not limit enlarged-image quality. Existing uploads work without uploading them again.
