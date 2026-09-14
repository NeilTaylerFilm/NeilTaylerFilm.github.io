# Add photographs using R2

Your writing stays in GitHub. Your published photographs live in Cloudflare R2.

The bucket is **images-neiltaylerfilm-github-io**. The delivery address is **https://neiltaylerfilm-images.neiltayler2003.workers.dev**.

## 1. Choose the pictures

1. Open Finder.
2. Open **Documents → CodingProjects → neiltaylerfilm.github.io → photo-inbox**.
3. Copy the pictures you want to upload into **photo-inbox**.
4. Use JPEG, WebP, PNG or AVIF. Export RAW/HEIC files as JPEG first. Do not use JXL.
5. Put the pictures directly inside photo-inbox, not inside another folder.

Keep your originals in your normal photo library and backup. This folder is a temporary tray. It is excluded from GitHub, so these source pictures will not be pushed to your repository.

The upload tool makes several sizes, with a maximum longest edge of 2560 pixels. It does not enlarge small pictures. It removes EXIF/location metadata from the uploaded copies and converts them to sRGB. Your source files are untouched.

**Uploaded photographs are public immediately, even if the post using them is still a draft.** Only put photographs you are ready to share into an upload batch.

## 2. Upload them

Open Terminal (press **⌘Space**, type **Terminal**, press Return).

Copy and paste this line, then press Return:

```sh
cd "/Users/neil/Documents/CodingProjects/neiltaylerfilm.github.io"
```

Then copy and paste this line, and press Return:

```sh
npm run photos:upload
```

Wait until you see **Done**.

The tool uploads small web copies to R2. If you run it again with the same pictures, it skips copies already there. Changing a source picture produces a new image address; it does not replace the old picture.

For a preview of the amount to upload, use this instead:

```sh
npm run photos:upload -- --dry-run
```

A preview does not upload anything.

## 3. Find your image addresses

In Finder, open **photo-inbox → UPLOAD-RESULTS.md**.

Find your picture's filename. Under it are:

- Its image address.
- Its width and height.
- Copyable examples for a blog post, project and slideshow.

The long address is normal. Copy it exactly. You do not need to rename photographs to test.jpg.

The tool also updates **src → data → r2-images.json**. This is the website's picture list: it records the addresses of all the sizes. Do not edit it by hand. It contains no passwords and needs to be published to GitHub with your posts.

The results file is replaced by each successful upload batch. Previously uploaded image addresses remain in r2-images.json.

## 4. Put a picture inside a blog post

Open your blog post's .md file in **src → content → blog**. Follow PUBLISHING.md if you have not made a post yet.

In UPLOAD-RESULTS.md, copy the line under **Blog body**. Paste it on its own line between paragraphs.

It looks like:

```markdown
![Describe your photograph](PASTE-THE-IMAGE-ADDRESS-HERE)
```

Replace **Describe your photograph** with what the picture shows. Replace the example address with the complete image address. The generated line already contains the correct address.

For the picture above the article and on its homepage card, copy the two lines under **Blog cover** into the information box at the top of the post, between the two `---` lines. Replace existing image/imageAlt lines if present, rather than adding duplicates.

## 5. Put pictures in a photography project

Open the project's .md file in **src → content → photography**. The full project template is in PUBLISHING.md.

Under the existing `images:` line in its information box, paste the example under **Project image**. Add another item for each photograph:

```yaml
images:
  - src: 'PASTE-FIRST-IMAGE-ADDRESS-HERE'
    alt: 'Describe the first photograph'
    caption: 'An optional caption'
  - src: 'PASTE-SECOND-IMAGE-ADDRESS-HERE'
    alt: 'Describe the second photograph'
```

Keep the spaces at the start of each line. Use spaces, not the Tab key. You do not need to add width or height for pictures uploaded by this tool.

For the project cover, set:

```yaml
coverImage: 'PASTE-THE-IMAGE-ADDRESS-HERE'
coverAlt: 'Describe the cover photograph'
```

## 6. Add pictures to the photography slideshow

Open **src → data → featured.ts**.

Find:

```ts
export const featured: FeaturedPhoto[] = [];
```

Put the **Slideshow item** from UPLOAD-RESULTS.md between the square brackets. For example:

```ts
export const featured: FeaturedPhoto[] = [
  {
    src: 'PASTE-THE-IMAGE-ADDRESS-HERE',
    alt: 'Describe your photograph',
    width: 1920,
    height: 1280,
  },
];
```

Use the width and height from your generated example, not these example numbers. Add more items before the closing `];` to include more pictures.

Optional: add `caption: "Your caption",` inside the item. Add `project: "your-project-filename",` to link to a project; leave out .md and make sure the project is published.

## 7. Preview and publish

After uploading and editing the content, run:

```sh
npm run dev:stop
npm run dev
```

Open the address Terminal prints. Confirm the pictures and descriptions are right. The image addresses must remain in r2-images.json so the site knows their sizes.

Use the **Publish your changes** instructions in PUBLISHING.md to check, commit and push the website. Include **src/data/r2-images.json** along with your content changes. You can also ask Codex to check and publish them.

Uploading photos does not automatically add them to the blog or galleries. Publishing the content makes them appear there.

## 8. Empty the tray when finished

After a successful upload, you can move pictures out of photo-inbox. This does not remove the R2 copies. Keep your originals backed up.

Deleting a post also does not delete its R2 photos. Ask Codex to identify unused uploaded pictures before deleting anything from the bucket; a single picture can be used in several places.

## If something goes wrong

- **No supported photos found:** check that the pictures are directly inside photo-inbox.
- **R2 rejected the credentials:** ask Codex to help check the saved keys and bucket permission. Do not paste keys into chat.
- **Public image verification failed:** the files may have uploaded, but the Worker could not serve them. Ask Codex to check it, then rerun the same command.
- **Another upload is running:** wait for the first one to finish. If it was interrupted, ask Codex to check the lock.
- **Stopped at the 8 GB threshold:** do not remove the threshold just to continue. Review your account storage and unused pictures first.
- **New photos missing in local preview:** restart the dev server using Step 7.
- **A manually uploaded R2 link does not work in the site:** use the upload command so the picture's sizes are registered automatically.

A batch can finish some pictures before another picture fails. Rerunning is safe; completed copies are skipped.

## Free usage and credentials

The 8 GB check measures this bucket only and is checked before each photograph. It is not an account-wide billing cap, and simultaneous uploads from other tools can change the total. Your other R2 bucket also uses the account's free allowance.

R2 Standard's free allowances are 10 GB-month of storage, one million write/list operations and ten million read operations monthly. Check total account usage in Cloudflare. Workers Free allows 100,000 requests per day across the account; each photograph request counts. At that limit, image delivery stops until the daily reset. Keep Workers on Free.

Your keys are saved in **.env.r2**, which is excluded from Git. Never add that file to GitHub or share it. A new Mac needs its own credential setup. GitHub Actions does not need these keys: building the website uses only the public picture list.

Sources:

- https://developers.cloudflare.com/r2/pricing/
- https://developers.cloudflare.com/workers/platform/limits/
