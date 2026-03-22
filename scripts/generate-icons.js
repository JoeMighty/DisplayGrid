/**
 * Generates icon PNG files for electron-builder.
 * Run from the repo root: node scripts/generate-icons.js
 * Requires sharp: uses the one installed in apps/dashboard/node_modules
 */

const path = require('path');
const fs = require('fs');

// Use sharp from the dashboard node_modules
let sharp;
try {
  sharp = require(path.join(__dirname, '../apps/dashboard/node_modules/sharp'));
} catch (e) {
  sharp = require('sharp');
}

const ROOT = path.join(__dirname, '..');

function makeSvg(strokeColor, bgColor, size = 512) {
  const padding = Math.round(size * 0.12);
  const gap = Math.round(size * 0.08);
  const sq = Math.round((size - 2 * padding - gap) / 2);
  const sw = Math.round(size * 0.04);
  const rx = Math.round(size * 0.03);

  const x1 = padding;
  const x2 = padding + sq + gap;
  const y1 = padding;
  const y2 = padding + sq + gap;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${bgColor}"/>
  <rect x="${x1}" y="${y1}" width="${sq}" height="${sq}" fill="none" stroke="${strokeColor}" stroke-width="${sw}" rx="${rx}"/>
  <rect x="${x2}" y="${y1}" width="${sq}" height="${sq}" fill="none" stroke="${strokeColor}" stroke-width="${sw}" rx="${rx}"/>
  <rect x="${x1}" y="${y2}" width="${sq}" height="${sq}" fill="none" stroke="${strokeColor}" stroke-width="${sw}" rx="${rx}"/>
  <rect x="${x2}" y="${y2}" width="${sq}" height="${sq}" fill="none" stroke="${strokeColor}" stroke-width="${sw}" rx="${rx}"/>
</svg>`;
}

async function generateIcon(svgStr, outPath) {
  const buf = Buffer.from(svgStr);
  await sharp(buf).png().resize(512, 512).toFile(outPath);
  console.log('✓ Written:', outPath);
}

async function main() {
  const targets = [
    {
      dir: path.join(ROOT, 'apps/electron-server/build-resources'),
      // Blue — matches dashboard/login page logo
      stroke: '#3b82f6',
      bg: '#0f172a',
    },
    {
      dir: path.join(ROOT, 'apps/electron-kiosk/build-resources'),
      // Teal/cyan — differentiates the kiosk app
      stroke: '#06b6d4',
      bg: '#0c1a1f',
    },
  ];

  for (const { dir, stroke, bg } of targets) {
    fs.mkdirSync(dir, { recursive: true });
    const svg = makeSvg(stroke, bg);
    await generateIcon(svg, path.join(dir, 'icon.png'));
  }

  console.log('\nDone! Commit apps/*/build-resources/icon.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
