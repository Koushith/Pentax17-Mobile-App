import { Skia } from '@shopify/react-native-skia';

// Import LUT data
import kodak250dData from '../assets/luts/kodak-250D.json';
import moonriseData from '../assets/luts/moonrise-kingdom.json';
import vintageData from '../assets/luts/vintage-overlay.json';

interface LUTData {
  size: number;
  data: number[];
}

const lutDataMap: Record<string, LUTData> = {
  'kodak-250D.cube': kodak250dData,
  'moonrise-kingdom.cube': moonriseData,
  'vintage-overlay.cube': vintageData,
};

// Pre-built textures and shader (initialized on first use)
let prebuiltTextures: Record<string, { image: any; size: number }> = {};
let prebuiltShader: ReturnType<typeof Skia.RuntimeEffect.Make> | null = null;
let initialized = false;

// Create a 2D texture from 3D LUT data (flattened)
// The texture is arranged as a grid of slices
export const createLUTTexture = (lutFile: string) => {
  const lutData = lutDataMap[lutFile];
  if (!lutData) return null;

  const size = lutData.size; // e.g., 33
  const data = lutData.data;

  // Create texture: size*size width, size height (each row is one blue slice)
  const texWidth = size * size;
  const texHeight = size;
  const pixels = new Uint8Array(texWidth * texHeight * 4);

  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const lutIndex = (b * size * size + g * size + r) * 3;
        const texX = b * size + r;
        const texY = g;
        const texIndex = (texY * texWidth + texX) * 4;

        pixels[texIndex] = Math.max(0, Math.min(255, Math.round(data[lutIndex] * 255)));
        pixels[texIndex + 1] = Math.max(0, Math.min(255, Math.round(data[lutIndex + 1] * 255)));
        pixels[texIndex + 2] = Math.max(0, Math.min(255, Math.round(data[lutIndex + 2] * 255)));
        pixels[texIndex + 3] = 255;
      }
    }
  }

  const skData = Skia.Data.fromBytes(pixels);
  const image = Skia.Image.MakeImage(
    { width: texWidth, height: texHeight, colorType: 4, alphaType: 1 },
    skData,
    texWidth * 4
  );

  return { image, size };
};

// SkSL shader for 3D LUT lookup using 2D texture
const LUT_SHADER_SOURCE = `
uniform shader image;
uniform shader lut;
uniform float lutSize;

half4 main(float2 coord) {
  half4 color = image.eval(coord);

  // Scale to LUT coordinates
  float r = color.r * (lutSize - 1.0);
  float g = color.g * (lutSize - 1.0);
  float b = color.b * (lutSize - 1.0);

  // Get integer indices
  float r0 = floor(r);
  float g0 = floor(g);
  float b0 = floor(b);
  float r1 = min(r0 + 1.0, lutSize - 1.0);
  float g1 = min(g0 + 1.0, lutSize - 1.0);
  float b1 = min(b0 + 1.0, lutSize - 1.0);

  // Fractions for interpolation
  float rf = r - r0;
  float gf = g - g0;
  float bf = b - b0;

  // Sample 8 corners from 2D LUT texture
  // Texture layout: x = b_slice * lutSize + r, y = g
  float2 c000 = float2(b0 * lutSize + r0, g0);
  float2 c100 = float2(b0 * lutSize + r1, g0);
  float2 c010 = float2(b0 * lutSize + r0, g1);
  float2 c110 = float2(b0 * lutSize + r1, g1);
  float2 c001 = float2(b1 * lutSize + r0, g0);
  float2 c101 = float2(b1 * lutSize + r1, g0);
  float2 c011 = float2(b1 * lutSize + r0, g1);
  float2 c111 = float2(b1 * lutSize + r1, g1);

  // Add 0.5 to sample center of texel
  c000 += 0.5; c100 += 0.5; c010 += 0.5; c110 += 0.5;
  c001 += 0.5; c101 += 0.5; c011 += 0.5; c111 += 0.5;

  half4 s000 = lut.eval(c000);
  half4 s100 = lut.eval(c100);
  half4 s010 = lut.eval(c010);
  half4 s110 = lut.eval(c110);
  half4 s001 = lut.eval(c001);
  half4 s101 = lut.eval(c101);
  half4 s011 = lut.eval(c011);
  half4 s111 = lut.eval(c111);

  // Trilinear interpolation
  half4 c00 = mix(s000, s100, rf);
  half4 c10 = mix(s010, s110, rf);
  half4 c01 = mix(s001, s101, rf);
  half4 c11 = mix(s011, s111, rf);

  half4 c0 = mix(c00, c10, gf);
  half4 c1 = mix(c01, c11, gf);

  half4 result = mix(c0, c1, bf);
  result.a = color.a;

  return result;
}
`;

// Get prebuilt shader (returns null if not initialized)
export const getLUTShader = (lutFile: string) => {
  return prebuiltShader;
};

// Get prebuilt texture (returns null if not initialized)
export const getLUTTexture = (lutFile: string) => {
  return prebuiltTextures[lutFile] || null;
};

// Pre-load all LUT textures - must be called from JS land before using in worklets
export const preloadLUTTextures = () => {
  if (initialized) return;

  console.log('Preloading LUT textures and shader...');

  // Pre-compile shader
  prebuiltShader = Skia.RuntimeEffect.Make(LUT_SHADER_SOURCE);
  if (!prebuiltShader) {
    console.error('Failed to compile LUT shader');
  }

  // Pre-build all textures
  Object.keys(lutDataMap).forEach(lutFile => {
    const texture = createLUTTexture(lutFile);
    if (texture) {
      prebuiltTextures[lutFile] = texture;
      console.log(`Preloaded LUT texture: ${lutFile}`);
    }
  });

  initialized = true;
  console.log('LUT preloading complete');
};

// Export the prebuilt objects for direct worklet access
export const getPrebuiltLUTData = () => ({
  shader: prebuiltShader,
  textures: prebuiltTextures,
});
