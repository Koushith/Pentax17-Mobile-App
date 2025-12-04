const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Icon sizes needed for iOS
const sizes = [
  { size: 40, name: 'Icon-40' },      // 20x20 @2x
  { size: 60, name: 'Icon-60' },      // 20x20 @3x
  { size: 58, name: 'Icon-58' },      // 29x29 @2x
  { size: 87, name: 'Icon-87' },      // 29x29 @3x
  { size: 80, name: 'Icon-80' },      // 40x40 @2x
  { size: 120, name: 'Icon-120' },    // 40x40 @3x & 60x60 @2x
  { size: 180, name: 'Icon-180' },    // 60x60 @3x
  { size: 1024, name: 'Icon-1024' },  // App Store
];

const outputDir = path.join(__dirname, '../ios/CamApp/Images.xcassets/AppIcon.appiconset');

// Create SVG icon - minimalist camera/film design
function createIconSvg(size) {
  const padding = size * 0.12;
  const center = size / 2;

  // Outer lens circle
  const outerRadius = (size - padding * 2) / 2;
  const innerRadius = outerRadius * 0.65;
  const coreRadius = outerRadius * 0.25;

  // Gold color from app theme
  const gold = '#FFD700';
  const darkGold = '#B8860B';
  const bgColor = '#1A1A1A';

  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background with slight gradient -->
      <defs>
        <radialGradient id="bg" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stop-color="#2A2A2A"/>
          <stop offset="100%" stop-color="#0D0D0D"/>
        </radialGradient>
        <radialGradient id="lens" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stop-color="${gold}"/>
          <stop offset="100%" stop-color="${darkGold}"/>
        </radialGradient>
      </defs>

      <!-- Dark background -->
      <rect width="${size}" height="${size}" fill="url(#bg)" rx="${size * 0.22}"/>

      <!-- Outer ring (camera lens) -->
      <circle cx="${center}" cy="${center}" r="${outerRadius}" fill="none" stroke="url(#lens)" stroke-width="${size * 0.04}"/>

      <!-- Inner ring -->
      <circle cx="${center}" cy="${center}" r="${innerRadius}" fill="none" stroke="${gold}" stroke-width="${size * 0.015}" opacity="0.6"/>

      <!-- Center dot (aperture) -->
      <circle cx="${center}" cy="${center}" r="${coreRadius}" fill="url(#lens)"/>

      <!-- Film frame corners (half-frame aesthetic) -->
      <rect x="${center - outerRadius * 0.5}" y="${center - outerRadius * 0.75}"
            width="${outerRadius}" height="${outerRadius * 1.5}"
            fill="none" stroke="${gold}" stroke-width="${size * 0.01}"
            opacity="0.3" rx="${size * 0.02}"/>
    </svg>
  `;
}

async function generateIcons() {
  console.log('Generating app icons...\n');

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const { size, name } of sizes) {
    const svg = createIconSvg(size);
    const outputPath = path.join(outputDir, `${name}.png`);

    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);

    console.log(`Created: ${name}.png (${size}x${size})`);
  }

  // Update Contents.json
  const contentsJson = {
    images: [
      { idiom: 'iphone', scale: '2x', size: '20x20', filename: 'Icon-40.png' },
      { idiom: 'iphone', scale: '3x', size: '20x20', filename: 'Icon-60.png' },
      { idiom: 'iphone', scale: '2x', size: '29x29', filename: 'Icon-58.png' },
      { idiom: 'iphone', scale: '3x', size: '29x29', filename: 'Icon-87.png' },
      { idiom: 'iphone', scale: '2x', size: '40x40', filename: 'Icon-80.png' },
      { idiom: 'iphone', scale: '3x', size: '40x40', filename: 'Icon-120.png' },
      { idiom: 'iphone', scale: '2x', size: '60x60', filename: 'Icon-120.png' },
      { idiom: 'iphone', scale: '3x', size: '60x60', filename: 'Icon-180.png' },
      { idiom: 'ios-marketing', scale: '1x', size: '1024x1024', filename: 'Icon-1024.png' },
    ],
    info: { author: 'xcode', version: 1 }
  };

  const contentsPath = path.join(outputDir, 'Contents.json');
  fs.writeFileSync(contentsPath, JSON.stringify(contentsJson, null, 2));
  console.log('\nUpdated: Contents.json');

  console.log('\nApp icons generated successfully!');
}

generateIcons().catch(console.error);
