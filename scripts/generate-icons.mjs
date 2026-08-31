// BIG LIGHT — Génère les icônes PWA (favicon, écran d'accueil mobile)
// à partir d'un anneau doré stylisé, dans l'esprit du logo (fond sombre du
// thème + anneau doré ouvert, plutôt qu'un texte illisible à petite taille).
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const outDir = path.resolve("public/icons");
await mkdir(outDir, { recursive: true });

const BG = "#111110";
const GOLD = "#ceb889";

function iconSvg(size, { maskable = false } = {}) {
  // Zone de sécurité réduite pour les icônes "maskable" (Android peut rogner
  // les bords en cercle/carré arrondi selon le launcher).
  const safe = maskable ? 0.66 : 0.86;
  const radius = maskable ? 0 : size * 0.22;
  const cx = size / 2;
  const cy = size / 2;
  const ringR = (size * safe) / 2;
  const strokeW = size * 0.09 * (safe / 0.86);
  // Anneau ouvert : un arc de ~290° (gap de 70° en haut à droite), comme le
  // motif du logo réel.
  const startAngle = -200; // degrés
  const endAngle = 90;
  const toRad = (d) => (d * Math.PI) / 180;
  const x1 = cx + ringR * Math.cos(toRad(startAngle));
  const y1 = cy + ringR * Math.sin(toRad(startAngle));
  const x2 = cx + ringR * Math.cos(toRad(endAngle));
  const y2 = cy + ringR * Math.sin(toRad(endAngle));
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${BG}"/>
  <path
    d="M ${x1} ${y1} A ${ringR} ${ringR} 0 ${largeArc} 1 ${x2} ${y2}"
    fill="none"
    stroke="${GOLD}"
    stroke-width="${strokeW}"
    stroke-linecap="round"
  />
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
