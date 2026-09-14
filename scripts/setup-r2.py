#!/usr/bin/env python3
"""Save R2 upload credentials locally without displaying them or using shell history."""

import getpass
import os
from pathlib import Path
import re
import subprocess
import tempfile


def main():
    root = Path(__file__).resolve().parent.parent
    destination = root / '.env.r2'
    ignored = subprocess.run(
        ['git', 'check-ignore', '-q', '--', '.env.r2'], cwd=root
    )
    tracked = subprocess.run(
        ['git', 'ls-files', '--error-unmatch', '.env.r2'], cwd=root,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    if ignored.returncode != 0 or tracked.returncode == 0:
        raise SystemExit('Stopped: the credentials file must be excluded from Git first.')
    if destination.exists():
        raise SystemExit('Credentials are already saved. Ask Codex for help changing them.')
    print('Paste each value from Cloudflare, then press Return.')
    print('Nothing will appear while you paste. This is expected. Control-C cancels.\n')
    account = getpass.getpass('Account ID (or the S3 endpoint address): ').strip()
    match = re.fullmatch(
        r'(?:https://)?([a-fA-F0-9]{32})(?:\.r2\.cloudflarestorage\.com/?)?', account
    )
    if not match:
        raise SystemExit('That is not an Account ID or standard R2 S3 endpoint. Nothing was saved.')
    access = getpass.getpass('Access Key ID: ').strip()
    secret = getpass.getpass('Secret Access Key: ').strip()
    if not re.fullmatch(r'[a-fA-F0-9]{32}', access) or not re.fullmatch(r'[a-fA-F0-9]{64}', secret):
        raise SystemExit('The key format was unexpected. Use Access Key ID and Secret Access Key, not the API token. Nothing was saved.')
    values = {
        'R2_ACCOUNT_ID': match.group(1),
        'R2_ACCESS_KEY_ID': access,
        'R2_SECRET_ACCESS_KEY': secret,
        'R2_BUCKET': 'images-neiltaylerfilm-github-io',
        'R2_PUBLIC_URL': 'https://neiltaylerfilm-images.neiltayler2003.workers.dev',
    }
    descriptor, temporary = tempfile.mkstemp(prefix='.env.r2.', dir=root)
    try:
        os.chmod(temporary, 0o600)
        with os.fdopen(descriptor, 'w') as output:
            output.write(''.join(f'{key}={value}\n' for key, value in values.items()))
        # Do not overwrite credentials if another setup completed in the meantime.
        os.link(temporary, destination)
    finally:
        os.unlink(temporary)
    print('\nCredentials saved privately in .env.r2 and excluded from Git.')
    print('No upload has happened yet. Tell Codex: credentials saved.')


if __name__ == '__main__':
    try:
        main()
    except (KeyboardInterrupt, EOFError):
        print('\nCancelled. No credentials were saved.')
