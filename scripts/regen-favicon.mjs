import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const s = 2.2;
const cx = 149;
const cy = 136.5;
const X = (x) => +(300 + (x - cx) * s).toFixed(2);
const Y = (y) => +(300 + (y - cy) * s).toFixed(2);
const S = (v) => +(v * s).toFixed(2);

const svg = `<svg width="600" height="600" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
  <rect width="600" height="600" rx="120" fill="#1C1D1D"/>
  <path d="M${X(40)} ${Y(60)} H${X(74)} L${X(98)} ${Y(90)}" fill="none" stroke="#FFFFFF" stroke-width="${S(13)}" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M${X(98)} ${Y(90)} L${X(178)} ${Y(32)} L${X(258)} ${Y(90)} L${X(258)} ${Y(198)} L${X(98)} ${Y(198)} Z" fill="none" stroke="#FFFFFF" stroke-width="${S(13)}" stroke-linejoin="round" stroke-linecap="round"/>
  <rect x="${X(150)}" y="${Y(140)}" width="${S(56)}" height="${S(58)}" rx="${S(7)}" fill="#E88A5A"/>
  <line x1="${X(98)}" y1="${Y(146)}" x2="${X(258)}" y2="${Y(146)}" stroke="#FFFFFF" stroke-width="${S(10)}"/>
  <circle cx="${X(130)}" cy="${Y(222)}" r="${S(19)}" fill="#FFFFFF"/>
  <circle cx="${X(226)}" cy="${Y(222)}" r="${S(19)}" fill="#FFFFFF"/>
  <circle cx="${X(130)}" cy="${Y(222)}" r="${S(6)}" fill="#1C1D1D"/>
  <circle cx="${X(226)}" cy="${Y(222)}" r="${S(6)}" fill="#1C1D1D"/>
</svg>
`;

const brand = path.join(__dirname, "../public/brand");
const admin = path.join(
  __dirname,
  "../../../w-cartstore-admin/e-commerce-admin/public",
);
fs.writeFileSync(path.join(brand, "favicon.svg"), svg);
fs.writeFileSync(path.join(brand, "mark.svg"), svg);
fs.writeFileSync(path.join(admin, "logo_icon_square.svg"), svg);
fs.writeFileSync(path.join(admin, "favicon.svg"), svg);
fs.writeFileSync(path.join(admin, "brand/mark.svg"), svg);

const buf = Buffer.from(svg);
await sharp(buf).resize(512, 512).png().toFile(path.join(brand, "favicon.png"));
await sharp(buf).resize(512, 512).png().toFile(path.join(brand, "icon.png"));
await sharp(buf).resize(512, 512).png().toFile(path.join(admin, "logo_icon_square.png"));
await sharp(buf).resize(256, 256).png().toFile(path.join(admin, "favicon.ico"));
console.log("absolute-coord favicon written");
console.log("sample", { left: X(40), top: Y(32), right: X(258), bottom: Y(222) + S(19) });
