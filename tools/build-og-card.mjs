/**
 * Composes the link-preview card that Telegram, WhatsApp and Twitter show.
 *
 * Those previews are laid out around 1.91:1. The couple illustration is a
 * 1360x2228 portrait, so handing it over untouched gets it letterboxed
 * between blurred bars, which is what the live card was doing. This stands
 * the cut-out on the invitation's own parchment at 1200x630 instead, so the
 * card arrives in a chat looking like the invitation.
 *
 * Usage: node tools/build-og-card.mjs [output.jpg]
 */
import sharp from 'sharp';

import { cutOutFigure } from './cut-out-cover-figure.mjs';

const SOURCE = 'assets/couple/Animated-andrika.webp';
const OUTPUT = process.argv[2] ?? 'assets/social/og-card.jpg';

const WIDTH = 1200;
const HEIGHT = 630;
const GROUND = '#F5EFE4'; // --secondary, the same ground the cover uses

/**
 * How much of the illustration's height to keep, measured from the top.
 * 0.78 keeps both faces large enough to read in a chat list while still
 * including the batik and the bouquet; the full figure shrinks to about
 * 130px wide in a real Telegram card, which is too small to make out.
 */
const CROP_FRACTION = 0.78;

const { buffer } = await cutOutFigure(SOURCE, CROP_FRACTION);

const figure = await sharp(buffer).resize({ height: HEIGHT, fit: 'inside' }).toBuffer();
const { width: figureWidth, height: figureHeight } = await sharp(figure).metadata();

await sharp({ create: { width: WIDTH, height: HEIGHT, channels: 3, background: GROUND } })
  .composite([
    {
      input: figure,
      left: Math.round((WIDTH - figureWidth) / 2),
      // Flush with the bottom edge, so the couple stands on the card rather
      // than floating in the middle of it.
      top: HEIGHT - figureHeight,
    },
  ])
  .jpeg({ quality: 86, chromaSubsampling: '4:2:0', mozjpeg: true })
  .toFile(OUTPUT);

const meta = await sharp(OUTPUT).metadata();
const { size } = await sharp(OUTPUT).stats().then(() => import('node:fs')).then((fs) => fs.statSync(OUTPUT));
console.log(`${OUTPUT}  ${meta.width}x${meta.height}  figure ${figureWidth}x${figureHeight}  ${(size / 1024).toFixed(0)}kB`);
