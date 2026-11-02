// Zet gedownloade foto's om naar WebP voor de site: 1600x1200 (4:3, midden
// bijgesneden, zoals de tegels), zonder metadata (EXIF/GPS).
// Gebruik: node tools/data/convert-photos.mjs <map-met-jpg> <doelmap>
import { readdirSync, mkdirSync } from "node:fs";
import { join, parse } from "node:path";
import sharp from "sharp";

const [, , src, dest] = process.argv;
if (!src || !dest) throw new Error("Gebruik: convert-photos.mjs <bron> <doel>");
mkdirSync(dest, { recursive: true });
for (const f of readdirSync(src).filter((f) => /\.(jpe?g|png)$/i.test(f))) {
  const out = join(dest, `${parse(f).name}.webp`);
  const info = await sharp(join(src, f)).rotate().resize({ width: 1600, height: 1200, fit: "cover", position: "centre" }).webp({ quality: 72 }).toFile(out);
  console.log(`${parse(f).name}: ${info.width}x${info.height}, ${Math.round(info.size / 1024)} KB`);
}
