import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

const VARIANTS = [
  { source: 'chabad-bedford-mark-light-source.png', output: 'chabad-bedford-mark-light.png' },
  { source: 'chabad-bedford-mark-dark-source.png', output: 'chabad-bedford-mark-dark.png' },
];

function sampleCornerAverage(data, width, height, channels) {
  const points = [
    [2, 2],
    [width - 3, 2],
    [2, height - 3],
    [width - 3, height - 3],
  ];
  let r = 0;
  let g = 0;
  let b = 0;
  for (const [x, y] of points) {
    const i = (y * width + x) * channels;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  return [r / points.length, g / points.length, b / points.length];
}

function colorDistance(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function applyTransparentBackground(data, width, height, channels) {
  const [br, bg, bb] = sampleCornerAverage(data, width, height, channels);
  const fullClear = 28;
  const softClear = 52;
  for (let i = 0; i < data.length; i += channels) {
    const dist = colorDistance(data[i], data[i + 1], data[i + 2], br, bg, bb);
    if (dist <= fullClear) {
      data[i + 3] = 0;
      continue;
    }
    if (dist <= softClear) {
      data[i + 3] = Math.round(((dist - fullClear) / (softClear - fullClear)) * 255);
    }
  }
}

async function processVariant({ source, output }) {
  const sourcePath = path.join(publicDir, source);
  const { data, info } = await sharp(sourcePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rgba = Buffer.from(data);
  applyTransparentBackground(rgba, info.width, info.height, info.channels);
  const meta = await sharp(rgba, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ threshold: 12 })
    .png()
    .toFile(path.join(publicDir, output));
  console.log(`${output}: ${meta.width}x${meta.height}`);
}

for (const variant of VARIANTS) {
  await processVariant(variant);
}
