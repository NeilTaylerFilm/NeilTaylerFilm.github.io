// ==========================================
// 🔐 CLOUDFLARE R2 VAULT KEY (scripts/lib/r2.mjs)
// ==========================================
// This file is the secure key that unlocks your Cloudflare R2 photo storage vault!
// It does three important jobs:
// 1. connection(): Safely reads your secret passwords from .env.r2 and connects to Cloudflare.
// 2. inventory(): Counts every photo currently stored in your online vault.
// 3. uploadBudget(): A spending guardrail! Prevents uploads if total files would exceed 8 GB,
//    ensuring you stay completely inside Cloudflare's free storage tier!

// R2 connection helper for Cloudflare storage operations.
// --- BORROWED TOOLS (Imports) ---
// readFile, stat: Node.js filesystem tools to inspect permissions and read secrets.
import { readFile, stat } from 'node:fs/promises';
// parseEnv: Node.js standard tool that parses .env key-value pairs safely.
import { parseEnv } from 'node:util';
// S3Client, ListObjectsV2Command: Standard AWS SDK client that connects to Cloudflare R2's S3-compatible API.
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

// 🔑 CONNECT TO THE VAULT: Reads your secrets and opens the door
export async function connection() {
  const file = new URL('../../.env.r2', import.meta.url);
  const mode = (await stat(file)).mode;

  // 🛡️ Security Check: Make sure only you can read the secret password file (chmod 600)
  if (mode & 0o077)
    throw new Error('Credentials file permissions are too open; run chmod 600 .env.r2.');

  const config = parseEnv(await readFile(file, 'utf8'));

  // 🔍 Verify all required Cloudflare credentials and bucket names exist
  if (
    !/^[a-f0-9]{32}$/i.test(config.R2_ACCOUNT_ID || '') ||
    !config.R2_ACCESS_KEY_ID ||
    !config.R2_SECRET_ACCESS_KEY ||
    config.R2_BUCKET !== 'images-neiltaylerfilm-github-io' ||
    config.R2_PUBLIC_URL !== 'https://neiltaylerfilm-images.neiltayler2003.workers.dev'
  ) {
    throw new Error(
      'R2 configuration is incomplete or does not match this site. Run the setup helper.',
    );
  }

  // 🚀 Open the official S3-compatible communication channel to Cloudflare
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.R2_ACCESS_KEY_ID,
      secretAccessKey: config.R2_SECRET_ACCESS_KEY,
    },
    maxAttempts: 3,
  });
  return { client, bucket: config.R2_BUCKET, origin: config.R2_PUBLIC_URL };
}

// 📦 INVENTORY AUDIT: Lists all files currently stored in your Cloudflare bucket
export async function inventory(client, bucket) {
  const objects = new Map();
  let token;
  // Page through files 1,000 at a time until we have counted every single one
  do {
    const page = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }),
    );
    for (const object of page.Contents || []) objects.set(object.Key, object.Size || 0);
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
    if (page.IsTruncated && !token) throw new Error('Incomplete bucket listing; upload stopped.');
  } while (token);
  return objects;
}

// 💰 SPENDING GUARDRAIL: Guarantees you never accidentally exceed 8 Gigabytes of free storage
export function uploadBudget(objects, files, limit = 8_000_000_000) {
  const used = [...objects.values()].reduce((a, b) => a + b, 0);
  const pending = files.filter((file) => !objects.has(file.key));
  const added = pending.reduce((sum, file) => sum + file.bytes.length, 0);
  if (used + added > limit)
    throw new Error('Upload stopped: this bucket would exceed the 8 GB safety threshold.');
  return { used, added, pending };
}
