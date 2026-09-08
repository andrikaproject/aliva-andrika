import { readdir, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TEXT_EXTENSIONS = new Set(['.html', '.css', '.js', '.mjs', '.json', '.xml', '.txt', '.svg', '.webmanifest']);

/**
 * Only raster photographs are ever pruned. Scripts, styles and fonts stay
 * whatever the scan concludes, so a reference this file fails to recognise
 * can cost bytes but can never break the page.
 */
const PRUNABLE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);

async function collectFiles(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await collectFiles(full)));
    else found.push(full);
  }
  return found;
}

/**
 * Astro emits every imported image, including originals no page ends up
 * referencing once `<Image>` has produced its sized variants. For this
 * invitation that is roughly nine megabytes of 4000px photographs shipped to
 * a server that will never serve them.
 *
 * This removes files under the build's asset directory whose name appears
 * nowhere in the emitted HTML, CSS or JS. Nothing here builds an asset URL at
 * runtime, so "unreferenced" and "unreachable" are the same thing.
 */
export function pruneUnusedAssets({ assetsDir = '_astro' } = {}) {
  return {
    name: 'prune-unused-assets',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const outDir = fileURLToPath(dir);
        const assetRoot = path.join(outDir, assetsDir);

        let assets;
        try {
          assets = await collectFiles(assetRoot);
        } catch {
          return;
        }

        const referenced = new Set();
        for (const file of await collectFiles(outDir)) {
          if (!TEXT_EXTENSIONS.has(path.extname(file))) continue;
          const contents = await readFile(file, 'utf8');
          // Rollup writes dynamic imports with backticks, so the closing
          // delimiter set has to include one.
          for (const match of contents.matchAll(/[\w.-]+\.[a-z0-9]{2,5}(?=["'`\s),?]|$)/gi)) {
            referenced.add(match[0]);
          }
        }

        let removed = 0;
        let bytes = 0;
        for (const asset of assets) {
          const name = path.basename(asset);
          if (!PRUNABLE_EXTENSIONS.has(path.extname(asset).toLowerCase())) continue;
          if (referenced.has(name)) continue;
          bytes += (await stat(asset)).size;
          await rm(asset);
          removed += 1;
        }

        if (removed > 0) {
          logger.info(`pruned ${removed} unreferenced asset(s), ${(bytes / 1_000_000).toFixed(2)} MB`);
        }
      },
    },
  };
}
