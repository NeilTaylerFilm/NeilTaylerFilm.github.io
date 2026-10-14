# Add a photography post

Use these steps when you have a new set of photos for the website.

1. Drag the new photos into the `photo-inbox` folder inside the website folder. The uploader accepts JPG, JPEG, PNG, WebP, AVIF and HEIC/HEIF files. It skips camera RAW files. It uses every supported photo in `photo-inbox`. Each filename must include the shoot date as `YYYYMMDD` (year, month, day), such as `20250227`.
2. Find the `neiltaylerfilm.github.io` folder in Finder, but do not open it. Right-click the folder and choose **Services > New Terminal at Folder**. If you do not see that option, open Terminal, type `cd ` with a space after `cd`, drag the website folder into the Terminal window, and press Return.

   Then run:

   ```sh
   npm run photos:upload && npm run photos:new
   ```

   The second command starts after the upload finishes. If the upload shows an error, stop here and ask for help before making the post.

3. When Terminal asks `Photo project title:`, type the title for the post and press Return. The command uses the newest date in the uploaded photo filenames, creates a draft and prints where it saved the file.
4. Open the file path printed in Terminal and add your introduction where it says `Write your introduction here.` The post stays off the live website until you publish it.
5. Before your next set of photos, move these photos out of `photo-inbox`. Keep your original copies in your photo archive. Otherwise, the next post will include the old photos too.

If you already uploaded the photos, keep them in `photo-inbox`, skip the upload command, and run `npm run photos:new` on its own.
