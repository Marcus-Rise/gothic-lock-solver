import { isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const override = process.env['GOTHIC_DIST_DIRECTORY'];
if (override !== undefined && !isAbsolute(override)) {
  throw new Error('GOTHIC_DIST_DIRECTORY must be an absolute directory path.');
}

// Package verification points this at the installed tarball's dist directory.
export const distDirectory = override ?? fileURLToPath(new URL('../../dist/', import.meta.url));
