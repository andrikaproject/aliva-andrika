/**
 * Turns the couple illustration into a transparent cut-out for the cover.
 *
 * The source sits on flat white. A global "white becomes transparent" pass
 * would also punch holes in the bride's kebaya, the orchids and the eyes, so
 * this floods inward from the border instead and only clears white that is
 * connected to the outside edge.
 *
 * Usage: node tools/cut-out-cover-figure.mjs <source> <output> [cropFraction]
 */
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const WHITE_MIN = 244; // a pixel this bright on every channel counts as ground

/**
 * Returns a PNG buffer of the figure with the background cleared, trimmed to
 * its content and cut to `cropFraction` of its height from the top.
 */
export async function cutOutFigure(source, cropFraction = 1) {
  const image = sharp(source).ensureAlpha();
  const { width, height } = await image.metadata();
  const { data } = await image.raw().toBuffer({ resolveWithObject: true });

  const outside = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const isGround = (index) => {
    const p = index * 4;
    return data[p] >= WHITE_MIN && data[p + 1] >= WHITE_MIN && data[p + 2] >= WHITE_MIN;
  };

  const push = (index) => {
    if (outside[index] || !isGround(index)) return;
    outside[index] = 1;
    queue[tail++] = index;
  };

  for (let x = 0; x < width; x += 1) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    push(y * width);
    push(y * width + width - 1);
  }

  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = (index - x) / width;
    if (x > 0) push(index - 1);
    if (x < width - 1) push(index + 1);
    if (y > 0) push(index - width);
    if (y < height - 1) push(index + width);
  }

  // Feather the boundary so the ink edge does not read as a hard cut.
  let cleared = 0;
  for (let index = 0; index < outside.length; index += 1) {
    if (!outside[index]) continue;
    data[index * 4 + 3] = 0;
    cleared += 1;
  }

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      if (outside[index]) continue;
      const neighbours =
        outside[index - 1] + outside[index + 1] + outside[index - width] + outside[index + width];
      if (neighbours > 0) data[index * 4 + 3] = 150;
    }
  }

  const cut = sharp(data, { raw: { width, height, channels: 4 } });
  const trimmed = await cut.trim({ threshold: 0 }).png().toBuffer();
  const bounds = await sharp(trimmed).metadata();

  return {
    buffer: await sharp(trimmed)
      .extract({ left: 0, top: 0, width: bounds.width, height: Math.round(bounds.height * cropFraction) })
      .png()
      .toBuffer(),
    source: { width, height },
    trimmed: { width: bounds.width, height: bounds.height },
    clearedRatio: cleared / (width * height),
  };
}

// CLI: node tools/cut-out-cover-figure.mjs <source> <output.webp> [cropFraction]
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [source, output, cropFractionArg] = process.argv.slice(2);
  const result = await cutOutFigure(source, Number(cropFractionArg ?? 1));
  await sharp(result.buffer).webp({ quality: 88, alphaQuality: 100, effort: 6 }).toFile(output);
  const final = await sharp(output).metadata();
  console.log(`source   ${result.source.width}x${result.source.height}`);
  console.log(`cleared  ${(result.clearedRatio * 100).toFixed(1)}% of pixels as background`);
  console.log(`trimmed  ${result.trimmed.width}x${result.trimmed.height}`);
  console.log(`output   ${final.width}x${final.height}  ratio ${(final.width / final.height).toFixed(3)}  alpha=${final.hasAlpha}`);
}
