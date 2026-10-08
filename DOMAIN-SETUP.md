# Changing your website address (Domain Setup)

If you have bought a new domain name (like `www.yourname.com`) from Cloudflare and want to use it for your website, follow these steps. 

This guide assumes you are a beginner. You only need a web browser and the ability to copy and paste.

### Next Action: Decide on your new domain name
Before you start, make sure you have already purchased your domain name in your Cloudflare account.

---

### Step 1: Connect your domain to your website (GitHub Pages)
Your website files live on GitHub, so you need to tell GitHub about your new name.

1. Open your browser and go to your website's **GitHub repository**.
2. Click the **Settings** tab at the top.
3. Click **Pages** in the left-hand menu.
4. Under **Custom domain**, type your new domain name (e.g., `www.neiltaylerfilm.com`).
5. Click **Save**.
6. GitHub will give you a list of "DNS records" to add to Cloudflare. Keep this tab open.

**Time estimate:** 5 minutes.

---

### Step 2: Update your Cloudflare settings (DNS)
Now you need to tell Cloudflare where to find your website.

1. Sign in to your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Select your new domain name.
3. Click **DNS** in the left-hand menu.
4. Click **Add record**.
5. Use the information GitHub gave you in Step 1 to fill this in. You will likely need to add a "CNAME" record pointing to `neiltaylerfilm.github.io`.
6. Make sure the "Proxy status" (the little orange cloud) is turned **On**.
7. Click **Save**.

**Time estimate:** 10 minutes.

---

### Step 3: Update your website's address in the code
Your website needs to know its own name so it can build correctly.

1. Open the file `astro.config.ts` in your website folder.
2. Find the line that looks like this:
   ```ts
   site: 'https://neiltaylerfilm.github.io',
   ```
3. Change it to your new address:
   ```ts
   site: 'https://www.neiltaylerfilm.com',
   ```
4. Save the file.

**Time estimate:** 2 minutes.

---

### Step 4: Update your images (Cloudflare Worker)
Your images are served by a special "Worker" program. This also needs to know about the new name if you want to use a professional address for images (like `images.neiltaylerfilm.com`).

1. In your Cloudflare Dashboard, go to **Workers & Pages**.
2. Select your image worker (likely named `neiltaylerfilm-images`).
3. Click **Triggers**.
4. Under **Custom Domains**, click **Add Custom Domain**.
5. Type an address like `images.neiltaylerfilm.com`.
6. Click **Add Custom Domain**.

**Time estimate:** 5 minutes.

---

### Step 5: Update your image links (Technical)
*This is the most important step to keep your photos working.*

1. Open the file `R2-PHOTOS.md`.
2. Find the line:
   ```markdown
   The delivery address is **https://neiltaylerfilm-images.neiltayler2003.workers.dev**.
   ```
3. Update it to your new image address (e.g., `https://images.neiltaylerfilm.com`).
4. You will also need to update the file `src/data/r2-images.json`. This file contains the addresses for all your existing photos. 
   - **Action:** Ask Codex to help you "search and replace the old image address with the new one" in this file. Do not try to do this by hand if you have many photos.

**Time estimate:** 15 minutes with help from Codex.

---

### Step 6: Publish your changes
1. Follow your usual steps in `PUBLISH-TO-PRODUCTION.md` to send these changes to GitHub.
2. Once the "Deploy" task in GitHub is finished, visit your new domain name in your browser!

**Time estimate:** 5 minutes.

### Completed Work:
Your website is now professional! Visitors can find you at your new domain, and your high-quality photos will still load perfectly.

**Next Action:** Open `astro.config.ts` and change the site address as described in Step 3.
