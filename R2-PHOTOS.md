# Add photographs using R2

Your writing stays in GitHub. Your published photographs live in Cloudflare R2.

The bucket is **images-neiltaylerfilm-github-io**. The delivery address is **https://neiltaylerfilm-images.neiltayler2003.workers.dev**.

## 1. Choose the pictures

1. Open Finder.
2. Open **Documents → CodingProjects → neiltaylerfilm.github.io → photo-inbox**.
3. Copy the **full-resolution pictures** you want to upload into **photo-inbox**. A 6000 × 4000 pixel photograph is fine. You do not need to resize or compress it yourself first.
4. Use JPEG, WebP, PNG, AVIF or HEIC/HEIF. On your Mac, HEIC/HEIF files are converted automatically; export RAW files as JPEG first. Do not use JXL.
5. Put the pictures directly inside photo-inbox, not inside another folder.

Keep your originals in your normal photo library and backup. This folder is a temporary tray. It is excluded from GitHub, so these source pictures will not be pushed to your repository.

The upload tool makes several sizes, with a maximum longest edge of 2560 pixels. It does not enlarge small pictures. It removes EXIF/location metadata from the uploaded copies and converts them to sRGB. Your source files are untouched.

HEIC/HEIF conversion uses macOS’s built-in image tools. You do not need to install anything or convert the files yourself. A temporary PNG is used during processing and then removed. Only the generated JPEG/WebP sizes are uploaded, never the HEIC original. HEIC conversion also runs during a dry run, so large batches can take longer. On Windows or Linux, export HEIC files as JPEG first.

**Putting a picture in photo-inbox does not start anything automatically.** You must run the upload command in Step 2. That command handles resizing, compression and uploading for you.

**Uploaded photographs are public immediately, even if the post using them is still a draft.** Only put photographs you are ready to share into an upload batch.

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

The command reads your full-resolution pictures, creates compressed WebP and JPEG copies at several sizes, and uploads those copies. **It does not upload the full-resolution original or change the file in photo-inbox.**

The tool uploads small web copies to R2. If you run it again with the same pictures, it skips copies already there. Changing a source picture produces a new image address; it does not replace the old picture.

For a preview of the amount to upload, use this instead:

```sh
npm run photos:upload -- --dry-run
```

A preview does not upload anything.

### How the right size reaches each visitor

For example, a **6000 × 4000 pixel** photograph produces copies that are **480, 960, 1440, 1920 and 2560 pixels wide**, keeping the same proportions. Each size is made in WebP and JPEG. Smaller originals produce fewer sizes; portrait photographs are also limited to 2560 pixels on their longest edge.

When you use the generated image references, the website tells the browser which sizes are available and how much space the picture occupies. The browser chooses a suitable version for the screen size and pixel density. A phone might download a 480- or 960-pixel copy; a larger screen may need a larger copy. It does not need to download every size or your full-resolution original.

This works for **blog pictures, photography project galleries and the slideshow**. You only paste one image reference into your content—the website handles the size choices. Opening a photograph in the gallery's enlarged view can load the larger web copy.

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

## Add your About-page portrait

1. Put the portrait in **photo-inbox** and upload it using Step 2.
2. Copy its **Image address** from **UPLOAD-RESULTS.md**.
3. Open **src → data → about.ts**.
4. Find `portrait: '',` and paste the address between the quotes. For example:

```ts
portrait: 'PASTE-YOUR-UPLOADED-IMAGE-ADDRESS-HERE',
portraitAlt: 'Portrait of Neil Tayler',
```

5. Save, preview and publish as usual. The image keeps its proportions and automatically uses the registered responsive sizes.

Leaving `portrait` empty shows the **Portrait to come** placeholder. You can also use a local photograph: save it as **src/assets/about/portrait.jpg** and set `portrait: '/assets/about/portrait.jpg',`.

The slideshow now creates its thumbnail filmstrip automatically from **featured.ts**. You do not need to upload separate thumbnails. Visitors can select a thumbnail, use the arrow buttons or swipe the main image. **Expand** opens a larger viewer on the same page; **Close** or Escape returns to the page with the selected photo preserved. Reduced-motion settings turn off the directional slide animation.
