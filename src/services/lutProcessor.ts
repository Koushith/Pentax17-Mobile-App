import { Skia } from '@shopify/react-native-skia';

// Import embedded LUT data
import kodak250dData from '../assets/luts/kodak-250D.json';
import moonriseData from '../assets/luts/moonrise-kingdom.json';
import vintageData from '../assets/luts/vintage-overlay.json';
import cleanRawData from '../assets/luts/clean-raw.json';

export interface LUT3D {
  size: number;
  data: Float32Array;
  title: string;
}

// Cache for loaded LUTs
const lutCache: Map<string, LUT3D> = new Map();

// Pre-parsed embedded LUTs
const embeddedLUTs: Record<string, { size: number; title: string; data: number[] }> = {
  'kodak-250D.cube': kodak250dData,
  'moonrise-kingdom.cube': moonriseData,
  'vintage-overlay.cube': vintageData,
  'clean-raw.cube': cleanRawData,
};

/**
 * Load a LUT from embedded data
 */
export const loadLUT = async (filename: string): Promise<LUT3D | null> => {
  if (lutCache.has(filename)) {
    return lutCache.get(filename)!;
  }

  const embedded = embeddedLUTs[filename];
  if (!embedded) {
    console.error('LUT not found:', filename);
    return null;
  }

  const lut: LUT3D = {
    size: embedded.size,
    title: embedded.title,
    data: new Float32Array(embedded.data),
  };

  lutCache.set(filename, lut);
  console.log(`Loaded LUT: ${lut.title}, size: ${lut.size}x${lut.size}x${lut.size}`);
  return lut;
};

/**
 * Trilinear interpolation for 3D LUT lookup
 */
const trilinearInterpolate = (
  lut: LUT3D,
  r: number,
  g: number,
  b: number
): [number, number, number] => {
  const size = lut.size;
  const maxIdx = size - 1;

  // Clamp and scale to LUT indices
  const rScaled = Math.max(0, Math.min(1, r)) * maxIdx;
  const gScaled = Math.max(0, Math.min(1, g)) * maxIdx;
  const bScaled = Math.max(0, Math.min(1, b)) * maxIdx;

  const r0 = Math.floor(rScaled);
  const g0 = Math.floor(gScaled);
  const b0 = Math.floor(bScaled);

  const r1 = Math.min(r0 + 1, maxIdx);
  const g1 = Math.min(g0 + 1, maxIdx);
  const b1 = Math.min(b0 + 1, maxIdx);

  const rFrac = rScaled - r0;
  const gFrac = gScaled - g0;
  const bFrac = bScaled - b0;

  const getLUT = (ri: number, gi: number, bi: number): [number, number, number] => {
    const idx = (bi * size * size + gi * size + ri) * 3;
    return [lut.data[idx], lut.data[idx + 1], lut.data[idx + 2]];
  };

  const c000 = getLUT(r0, g0, b0);
  const c100 = getLUT(r1, g0, b0);
  const c010 = getLUT(r0, g1, b0);
  const c110 = getLUT(r1, g1, b0);
  const c001 = getLUT(r0, g0, b1);
  const c101 = getLUT(r1, g0, b1);
  const c011 = getLUT(r0, g1, b1);
  const c111 = getLUT(r1, g1, b1);

  const lerp = (a: number, b: number, t: number) => a + t * (b - a);

  const result: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const c00 = lerp(c000[i], c100[i], rFrac);
    const c10 = lerp(c010[i], c110[i], rFrac);
    const c01 = lerp(c001[i], c101[i], rFrac);
    const c11 = lerp(c011[i], c111[i], rFrac);

    const c0 = lerp(c00, c10, gFrac);
    const c1 = lerp(c01, c11, gFrac);

    result[i] = lerp(c0, c1, bFrac);
  }

  return result;
};

/**
 * Apply LUT to pixel buffer - optimized version
 */
export const applyLUTToPixels = (
  pixels: Uint8Array,
  width: number,
  height: number,
  lut: LUT3D
): Uint8Array => {
  const output = new Uint8Array(pixels.length);
  const totalPixels = width * height;

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;

    const r = pixels[idx] / 255;
    const g = pixels[idx + 1] / 255;
    const b = pixels[idx + 2] / 255;
    const a = pixels[idx + 3];

    const [newR, newG, newB] = trilinearInterpolate(lut, r, g, b);

    output[idx] = Math.max(0, Math.min(255, Math.round(newR * 255)));
    output[idx + 1] = Math.max(0, Math.min(255, Math.round(newG * 255)));
    output[idx + 2] = Math.max(0, Math.min(255, Math.round(newB * 255)));
    output[idx + 3] = a;
  }

  return output;
};

/**
 * Apply LUT to a Skia surface and return processed image
 * Uses downsampling for performance
 */
export const applyLUTToSurface = (
  surface: ReturnType<typeof Skia.Surface.MakeOffscreen>,
  lut: LUT3D
): ReturnType<typeof Skia.Image.MakeImage> | null => {
  if (!surface) {
    console.error('LUT: surface is null');
    return null;
  }

  const fullWidth = surface.width();
  const fullHeight = surface.height();

  // Downsample to max 1600px on longest side for LUT processing
  // Higher = better quality but slower
  const maxSize = 1600;
  const scale = Math.min(1, maxSize / Math.max(fullWidth, fullHeight));
  const smallWidth = Math.round(fullWidth * scale);
  const smallHeight = Math.round(fullHeight * scale);

  console.log(`Applying LUT: ${fullWidth}x${fullHeight} -> ${smallWidth}x${smallHeight}`);
  const startTime = Date.now();

  // Get full image snapshot
  const fullSnapshot = surface.makeImageSnapshot();
  if (!fullSnapshot) {
    console.error('LUT: failed to get snapshot');
    return null;
  }

  // Create small surface and draw scaled down
  const smallSurface = Skia.Surface.MakeOffscreen(smallWidth, smallHeight);
  if (!smallSurface) {
    console.error('LUT: failed to create small surface');
    return null;
  }

  const smallCanvas = smallSurface.getCanvas();
  const srcRect = { x: 0, y: 0, width: fullWidth, height: fullHeight };
  const dstRect = { x: 0, y: 0, width: smallWidth, height: smallHeight };

  // Use a paint object instead of null
  const scalePaint = Skia.Paint();
  smallCanvas.drawImageRect(fullSnapshot, srcRect, dstRect, scalePaint);

  // Read small pixels
  const smallSnapshot = smallSurface.makeImageSnapshot();
  if (!smallSnapshot) {
    console.error('LUT: failed to get small snapshot');
    return null;
  }

  const pixelData = smallSnapshot.readPixels(0, 0, {
    width: smallWidth,
    height: smallHeight,
    colorType: 4,
    alphaType: 1,
  });

  if (!pixelData) {
    console.error('LUT: failed to read pixels');
    return null;
  }

  console.log(`LUT: read ${pixelData.byteLength} bytes, processing...`);

  // Apply LUT to small image
  const processedPixels = applyLUTToPixels(
    new Uint8Array(pixelData),
    smallWidth,
    smallHeight,
    lut
  );

  console.log(`LUT: pixel processing done, creating image...`);

  // Create small LUT image
  const smallData = Skia.Data.fromBytes(processedPixels);
  const smallLutImage = Skia.Image.MakeImage(
    { width: smallWidth, height: smallHeight, colorType: 4, alphaType: 1 },
    smallData,
    smallWidth * 4
  );

  if (!smallLutImage) {
    console.error('LUT: failed to create small LUT image');
    return null;
  }

  console.log(`LUT: scaling back to full size...`);

  // Scale back up to full size
  const finalSurface = Skia.Surface.MakeOffscreen(fullWidth, fullHeight);
  if (!finalSurface) {
    console.log('LUT: using small image as final (no upscale surface)');
    return smallLutImage;
  }

  const finalCanvas = finalSurface.getCanvas();
  const smallSrc = { x: 0, y: 0, width: smallWidth, height: smallHeight };
  const fullDst = { x: 0, y: 0, width: fullWidth, height: fullHeight };
  finalCanvas.drawImageRect(smallLutImage, smallSrc, fullDst, scalePaint);

  const result = finalSurface.makeImageSnapshot();
  console.log(`LUT applied in ${Date.now() - startTime}ms`);
  return result;
};
