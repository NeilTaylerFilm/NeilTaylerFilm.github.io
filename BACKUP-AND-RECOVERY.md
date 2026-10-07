# Keep your website and photographs safe

Your site uses three separate places. Each one holds different things.

1. **Your photo archive** holds the original JPEG, HEIC or RAW files. Keep these on your computer and on a separate backup drive. For your most important work, keep another copy somewhere else too. These are your full-quality photographs.
2. **GitHub** holds the website, project text and the list of photo addresses. It does not hold files inside `photo-inbox/`, and it does not hold the actual R2 photographs.
3. **Cloudflare R2** holds smaller copies made for the website. These copies are public and resized. They are not a safe place for your only copy of an original.

## Before something goes wrong

- Keep the original photographs in your normal photo archive. Do not delete them after uploading to R2.
- Keep a second copy of that archive on a separate drive. A drive stored beside your computer can be lost at the same time as the computer, so keep important work in another safe place too.
- Push website changes to GitHub after publishing. A change that only exists on your computer is not saved in GitHub yet.
- Keep `src/data/r2-images.json` with the project or blog files that use those photos. It gives the site the addresses, dimensions and responsive sizes.
- Keep your R2 upload credentials in a password manager. The private `.env.r2` file is not part of GitHub and must never be uploaded there.
- Keep `photo-inbox/UPLOAD-RESULTS.md` until you have added the pictures to your website content.

## Check the photo list

Run this from the website folder:

```sh
npm run photos:audit
```

It works offline. It checks whether photo addresses used by your posts, projects and slideshow have matching entries in `src/data/r2-images.json`. It also reports registry entries that current content does not use. It does **not** connect to Cloudflare or check whether an image is still present in R2. It never deletes anything.

Use `npm run photos:check` when you want to contact R2 and check the bucket. That command needs your saved `.env.r2` credentials and an internet connection.

## If you get a new computer

1. Restore your original photo archive from its backup.
2. Get the website from GitHub and install the project using the instructions in [README.md](README.md).
3. Restore your R2 credentials from your password manager. Do not put them in a website file or GitHub.
4. Follow [R2-PHOTOS.md](R2-PHOTOS.md) to put photographs into `photo-inbox/` and upload them.
5. Run `npm run photos:audit` before publishing site changes.

The uploader makes photo addresses from the original file's contents. Uploading the same original file with this site's current uploader recreates the same photo names, so existing project pages can keep their addresses after the R2 files are restored.

## If the R2 bucket is emptied or lost

Restore the original photographs from your separate archive. Upload them again using [R2-PHOTOS.md](R2-PHOTOS.md) and the R2 credentials. Keep `src/data/r2-images.json` in GitHub; the upload tool adds the responsive image details there. Then run `npm run photos:audit` and preview the site before publishing any changed files.

The website does not automatically keep another copy of the full-resolution originals. If the originals and their backups are both lost, the smaller R2 copies cannot restore the original quality.

## Automatic website checks

After the `Check public site` workflow is published to GitHub, GitHub Actions checks the home page, photography page and a sample R2 photo every six hours. A failed check appears in the repository's **Actions** tab. GitHub notification settings control whether it emails you.
