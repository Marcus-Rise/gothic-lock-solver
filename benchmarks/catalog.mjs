import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const catalogUrl = new URL('./fixtures/catalog.json', import.meta.url);

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function loadManifest() {
  return JSON.parse(readFileSync(new URL('./fixtures/manifest.json', import.meta.url), 'utf8'));
}

export function loadCatalog() {
  const bytes = readFileSync(catalogUrl);
  const manifest = loadManifest();
  if (sha256(bytes) !== manifest.catalogSha256) {
    throw new Error('Catalog data hash differs from its pinned manifest.');
  }
  const catalog = JSON.parse(bytes.toString('utf8'));
  if (!Array.isArray(catalog) || catalog.length !== manifest.count
    || new Set(catalog.map((lock) => lock.id)).size !== manifest.count) {
    throw new Error('Catalog must contain the 45 distinct pinned inputs.');
  }
  return catalog;
}
