/**
 * Generate legacy launcher PNGs (ic_launcher + ic_launcher_round) for all
 * densities from public/app_icon.jpg.
 *
 * One consistent approach only: legacy PNG mipmaps. No adaptive-icon XML,
 * so there can be no duplicate ic_launcher resource across mipmap folders.
 *
 * Usage: node scripts/gen-android-icons.mjs
 */
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "public", "app_icon.jpg");
const RES = path.join(ROOT, "android", "app", "src", "main", "res");

const DENSITIES = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};

// Stale XML launchers from the previous mixed setup
const STALE = [
  "mipmap-anydpi-v26/ic_launcher.xml",
  "mipmap-anydpi-v26/ic_launcher_round.xml",
  "mipmap-hdpi/ic_launcher.xml",
];

function circleMask(size) {
  const r = size / 2;
  return Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${r}" cy="${r}" r="${r}" fill="#fff"/></svg>`,
  );
}

async function main() {
  for (const rel of STALE) {
    await rm(path.join(RES, rel), { force: true });
    console.log(`removed ${rel}`);
  }

  for (const [dir, size] of Object.entries(DENSITIES)) {
    const outDir = path.join(RES, dir);
    await mkdir(outDir, { recursive: true });

    const square = await sharp(SRC)
      .resize(size, size, { fit: "cover", position: "center" })
      .png()
      .toBuffer();
    await writeFile(path.join(outDir, "ic_launcher.png"), square);

    const round = await sharp(square)
      .composite([{ input: circleMask(size), blend: "dest-in" }])
      .png()
      .toBuffer();
    await writeFile(path.join(outDir, "ic_launcher_round.png"), round);

    console.log(`${dir}: ${size}x${size} ic_launcher.png + ic_launcher_round.png`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
