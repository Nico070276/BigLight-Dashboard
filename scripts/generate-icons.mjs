import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const outDir = path.resolve("public/icons");
await mkdir(outDir, { recursive: true });

const BG = "#0f172a";
const FG = "#ffffff";
const ACCENT = "#f59e0b";

function iconSvg(size, { maskable = false } = {}) {
  const safe = maskable ? 0.72 : 1;
  const radius = maskable ? 0 : size * 0.22;
  const cx = size / 2;
  const cy = size / 2;
  const bigFont = size * 0.34 * safe;
  const smallFont = size * 0.22 * safe;
  const rOffset = -size * 0.02 * safe;
  const numOffset = size * 0.22 * safe;
  const barY = cy + size * 0.33 * safe;
  const barW = size * 0.42 * safe;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${BG}"/>
  <g font-family="Inter, 'Helvetica Neue', Arial, sans-serif" font-weight="700" text-anchor="middle">
    <text x="${cx}" y="${cy + rOffset}" font-size="${bigFont}" fill="${FG}" dominant-baseline="middle">R</text>
    <text x="${cx}" y="${cy + numOffset}" font-size="${smallFont}" fill="${FG}" dominant-baseline="middle" letter-spacing="1">352</text>
  </g>
  <rect x="${cx - barW / 2}" y="${barY}" width="${barW}" height="${size * 0.018}" rx="${size * 0.009}" fill="${ACCENT}"/>
</svg>`;
}

const sizes = [192, 512];
for (const size of sizes) {
  await sharp(Buffer.from(iconSvg(size)))
    .png()
    .toFile(path.join(outDir, `icon-${size}.png`));
  await sharp(Buffer.from(iconSvg(size, { maskable: true })))
    .png()
    .toFile(path.join(outDir, `icon-maskable-${size}.png`));
}

await sharp(Buffer.from(iconSvg(180)))
  .png()
  .toFile(path.resolve("public/apple-icon.png"));

console.log("Icons generated: /icons/icon-{192,512}.png, maskable variants, and /apple-icon.png");
