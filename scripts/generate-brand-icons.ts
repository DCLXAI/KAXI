import sharp from "sharp";
import { mkdirSync } from "fs";

const CLAY = "#c96442";
const IVORY = "#f0eee6";
const INK = "#1f1e1d";
const CAT = "public/mascot/cat_running_0.png";

function roundedRect(size: number, radius: number, fill: string) {
  return Buffer.from(
    `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="${fill}"/></svg>`
  );
}

async function appIcon(out: string, size: number) {
  const cat = await sharp(CAT).resize({ height: Math.round(size * 0.5) }).toBuffer();
  await sharp(roundedRect(size, Math.round(size * 0.22), CLAY))
    .composite([{ input: cat, gravity: "center" }])
    .png()
    .toFile(out);
}

async function ogImage() {
  const cat = await sharp(CAT).resize({ height: 150 }).toBuffer();
  const svg = Buffer.from(`<svg width="1200" height="630">
    <rect width="1200" height="630" fill="${IVORY}"/>
    <rect x="0" y="602" width="1200" height="28" fill="${CLAY}"/>
    <text x="90" y="150" font-family="Apple SD Gothic Neo, sans-serif" font-size="34" font-weight="700" letter-spacing="6" fill="${CLAY}">KAXI</text>
    <text x="90" y="290" font-family="Apple SD Gothic Neo, serif" font-size="72" font-weight="700" fill="${INK}">한국 유학, 확실한 길로</text>
    <text x="90" y="390" font-family="Apple SD Gothic Neo, serif" font-size="72" font-weight="700" fill="${INK}">함께 달립니다.</text>
    <text x="90" y="480" font-family="Apple SD Gothic Neo, sans-serif" font-size="30" fill="#6e6c66">법무부 공식 출처 기반 비자 진단 · 검증된 행정사 연결</text>
  </svg>`);
  await sharp(svg).composite([{ input: cat, top: 420, left: 930 }]).png().toFile("public/og.png");
}

mkdirSync("public", { recursive: true });
await appIcon("src/app/icon.png", 512);
await appIcon("src/app/apple-icon.png", 180);
await ogImage();
console.log("brand icons generated: src/app/icon.png, src/app/apple-icon.png, public/og.png");
