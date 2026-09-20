# Put your changes on the live website

This guide is only about publishing changes you have already made. You do not need to understand website code.

**“Production” means your real website—the one other people can visit:**

[https://neiltaylerfilm.github.io/](https://neiltaylerfilm.github.io/)

Saving a file on your Mac does **not** change that website. Neither does refreshing your test website.

Publishing has three parts:

1. Check your changes on your Mac.
2. Send the changes to GitHub, where a copy of your website files is kept.
3. Wait while GitHub prepares and updates the live website.

## The easiest option: ask Codex

Save your changes first. Then send this message to Codex while working in this website’s task:

> Please help me publish my website changes. Show me what will be included, check the site, then commit and push the changes to main. Check that the GitHub Pages deployment succeeds and give me the live website link. Keep unfinished posts as drafts.

If you only want to publish certain changes, name them in your message. For example: “Only publish the new slideshow films.”

You can use this option every time. You do not have to learn the commands below.

## Publish it yourself, step by step

These instructions are for your existing website setup on this Mac. They do not cover setting up a new computer.

### 1. Save what you have changed

In the app where you edited a file, press **Command-S**. Do this for each file you edited.

For a blog post or project that is ready to appear on the website, find this line near the top of its file:

```yaml
draft: true
```

Change it to:

```yaml
draft: false
```

Save again. Leave unfinished posts and projects set to `true`. Slideshow lists do not use this setting.

If you added new R2 photographs, finish the upload steps in [R2-PHOTOS.md](R2-PHOTOS.md) first. Publishing the website does not upload the pictures in `photo-inbox` for you.

### 2. Open Terminal

Terminal is an app on your Mac where you can paste instructions for the computer.

1. Press **Command-Space** to open your Mac’s search box.
2. Type **Terminal**.
3. Press **Return**.

For every command box below:

1. Copy the text inside the box.
2. Paste it into Terminal.
3. Press **Return**.
4. Wait until it finishes before doing the next step.

Do not copy the box’s border or any surrounding explanation. When a command finishes, Terminal shows a new line where you can type again, often ending with `%` or `$`.

### 3. Tell Terminal where your website lives

Copy and run:

```sh
cd /Users/neil/Documents/CodingProjects/neiltaylerfilm.github.io
```

It is normal for this command to finish without a message. Keep using this same Terminal window for the remaining steps.

### 4. Check for mistakes

Run each of these separately, in this order:

```sh
npm run check
```

This checks the website files for problems.

```sh
npm test
```

This runs the website’s automatic tests.

```sh
npm run build
```

This prepares the pages that visitors will see. It does not publish them yet.

```sh
npm run verify
```

This checks the prepared pages, including their links.

**If any step fails, stop here.** Copy the error message and ask Codex for help. You do not need to work out what it means yourself. Notices about empty collections are normal when there are no posts or projects in a section.

### 5. Look at the version you are about to publish

Run:

```sh
npm run preview -- --background
```

Terminal will print an address beginning with `http://127.0.0.1:` or `http://localhost:`. Copy that whole address into your browser’s address bar and press Return.

Use the address it prints, because the number can change. This preview runs in the background, so Terminal remains available for the next steps.

This is a test copy on your Mac. It should show your finished changes and hide draft posts. Check the pages you changed: read the text, look at the pictures, and try the buttons.

If you make another edit, save it and repeat Steps 4 and 5 before publishing.

### 6. Choose which changes to send

First run:

```sh
git branch --show-current
```

The answer should be `main`. This is the copy of your website that GitHub uses for publishing. If it says anything else, ask Codex for help before continuing.

Next run:

```sh
git status --short
```

This lists changed files. An `M` means changed, `A` or `??` means added or new, and `D` means deleted. A deletion can be published too, so check those carefully.

Select each file you intend to publish using `git add`, followed by its name. For example, **if you changed the Post-Production slideshow**, run:

```sh
git add src/data/post-production-featured.ts
```

For a blog post, the command might look like this:

```sh
git add src/content/blog/my-new-post.md
```

Replace `my-new-post.md` with your actual filename. Do not run the example unchanged unless that really is your filename.

If you uploaded new R2 pictures, also include their updated address list:

```sh
git add src/data/r2-images.json
```

Repeat for any other files needed by your change. This step selects files; it does not publish them.

If you are unsure which files belong together, ask Codex to select them. Do not guess or select everything just to make an error disappear. Never select `.env.r2`: it contains private access details.

Now check the complete selected list:

```sh
git diff --cached --stat
```

This includes files selected earlier, too. Make sure every listed file belongs in this update. If anything is unexpected, stop and ask for help.

### 7. Save the selected changes as a bundle

Run:

```sh
git commit -m "Update website"
```

A **commit** is a saved bundle of your selected changes. You can replace `Update website` with a short description, such as `Add four slideshow films`. Keep the quotation marks.

This still has not updated the public website.

If it says “nothing to commit”, there is no new selected bundle to save. Ask Codex to check whether your changes were already saved or whether you missed a step.

### 8. Send the bundle to GitHub

**This is the publishing step.** Run:

```sh
git push origin main
```

A **push** sends saved bundles to GitHub. It sends any earlier bundles waiting on this branch too. GitHub then starts preparing your website automatically.

If it fails, asks for unfamiliar sign-in details, or says the update was rejected, copy the message and ask Codex for help. Do not use a “force push” to get past an error. Do not share passwords or access tokens.

### 9. Wait for the update to finish

1. Open [your website’s GitHub Actions page](https://github.com/NeilTaylerFilm/NeilTaylerFilm.github.io/actions) in your browser. Sign in to GitHub if needed.
2. Open the newest entry called **Deploy Astro to GitHub Pages**. Check that it matches your latest update.
3. Wait for both **build** and **deploy** to finish with green ticks. This can take a few minutes.
4. Open [your live website](https://neiltaylerfilm.github.io/).
5. Refresh the page and check your changes.

You are finished when GitHub shows success **and** you can see the changes on the live website.

If GitHub shows a red failure mark, the update did not finish successfully. Open that entry and ask Codex to investigate. Do not assume that sending the files was enough.

## If the live website still looks unchanged

- Check the address bar. The live address is `https://neiltaylerfilm.github.io/`. An address containing `127.0.0.1` or `localhost` is your test copy.
- Check that the latest GitHub update has finished successfully.
- Try the live address in a private browser window to avoid an old saved copy.
- If a post is missing, check that it was saved with `draft: false` before publishing.
- If it is still wrong, tell Codex what you expected to see and give it the page address.

## If you publish a mistake

You can correct the original file, save it, and repeat this guide. For a bigger mistake, ask Codex to restore the last working version and publish that.

You do not need to delete the website or start again.
