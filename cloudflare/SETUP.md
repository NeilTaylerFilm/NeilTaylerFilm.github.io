# Set up your photo delivery service

Status: Worker deployed, bucket binding connected and public test photograph verified. Credentials are stored locally. For routine uploads and website publishing, use [R2-PHOTOS.md](../R2-PHOTOS.md).

We will do this together. You do not need to understand the code.

## 1. Make a home for the photos

1. Sign in at https://dash.cloudflare.com/.
2. Open **R2 Object Storage**.
3. If you already made a bucket just for website pictures, use it. Otherwise choose **Create bucket**, name it **images-neiltaylerfilm-github-io**, and choose **Standard** storage.
4. Leave public access disabled. The Worker will provide the public image addresses.
5. Tell Codex the bucket's exact name. This name is not a password.

Do not put personal or unpublished images into the bucket's photos folder. Pictures there will be public once the Worker is connected.

## 2. Create the Worker

1. Open **Workers & Pages** and choose **Create application**.
2. Choose the option to create a basic Worker (a starter or Hello World Worker). Do not connect the Astro website repository here.
3. Name it **neiltaylerfilm-images** and deploy the starter.
4. Open its code editor.
5. Open **cloudflare/image-worker.mjs** in this website folder. Copy all of its contents.
6. Replace the starter code with that text, then save and deploy.
7. Open the Worker's **Bindings** section. Add an **R2 bucket** binding.
8. Set the binding name to **IMAGES**, in capitals. Select your image bucket. Save/deploy if prompted.
9. Copy the Worker's public address ending in **workers.dev** and give it to Codex.

A binding connects the Worker to the bucket without putting a password into the code. The Worker does not require an API key.

Dashboard labels can change. If your screen differs, tell Codex which options you see.

## 3. Test one photograph together

1. Export a photograph you are happy to make public as a small JPEG. Use the filename **test.jpg**.
2. In the R2 bucket, create/open the folder **photos**, then upload the JPEG into it.
3. Its object name should be **photos/test.jpg**.
4. Open your Worker address with **/photos/test.jpg** added at the end.
5. You should see your photograph. The Worker's address without a photograph path intentionally shows **Not found**.
6. Tell Codex when it works, or give the exact error message.

The code accepts simple folder/file names containing letters, numbers, hyphens and underscores. Use lowercase file extensions: jpg, jpeg, png, webp or avif. Spaces are not supported.

## 4. Finish the website workflow

The website now supports registered R2 images. Follow [R2-PHOTOS.md](../R2-PHOTOS.md) for the resizing/upload workflow.

Future uploads should use new filenames for changed pictures because browsers can keep a downloaded picture for one day.

## Staying within free allowances

Keep the Workers plan on **Free**. It has 100,000 requests per day across the account, resetting at midnight UTC. If exhausted, the service returns an error until reset. One page can request several photographs.

Keep the R2 bucket on **Standard**. Its free allowance includes 10 GB-month of storage, one million write/list operations and ten million read operations monthly. Other buckets and tools also consume these allowances. R2 can bill for excess usage; staying on Workers Free is not an overall R2 spending cap.

This Worker makes one R2 read per valid image request that reaches it. It sets browser caching headers but does not implement a shared CDN cache. Image resizing will happen locally, not through a paid image transformation service.

Sources checked 14 September 2026:

- https://developers.cloudflare.com/workers/get-started/dashboard/
- https://developers.cloudflare.com/r2/get-started/workers-api/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/r2/pricing/
