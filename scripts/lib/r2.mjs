import { readFile, stat } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
export async function connection() {
  const file = new URL('../../.env.r2', import.meta.url);
  const mode = (await stat(file)).mode;
  if (mode & 0o077)
    throw new Error('Credentials file permissions are too open; run chmod 600 .env.r2.');
  const config = parseEnv(await readFile(file, 'utf8'));
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
export async function inventory(client, bucket) {
  const objects = new Map();
  let token;
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
export function uploadBudget(objects, files, limit = 8_000_000_000) {
  const used = [...objects.values()].reduce((a, b) => a + b, 0);
  const pending = files.filter((file) => !objects.has(file.key));
  const added = pending.reduce((sum, file) => sum + file.bytes.length, 0);
  if (used + added > limit)
    throw new Error('Upload stopped: this bucket would exceed the 8 GB safety threshold.');
  return { used, added, pending };
}
