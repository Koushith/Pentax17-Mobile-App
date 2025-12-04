import { Skia, SkRuntimeEffect } from '@shopify/react-native-skia';

// 3D LUT shader for real-time video filtering
// This shader samples from a pre-baked 2D texture atlas representing the 3D LUT
const LUT_SHADER = `
uniform shader image;
uniform shader lut;
uniform float lutSize;

half4 main(float2 coord) {
  half4 color = image.eval(coord);

  // Clamp and prepare for LUT lookup
  float r = clamp(color.r, 0.0, 1.0);
  float g = clamp(color.g, 0.0, 1.0);
  float b = clamp(color.b, 0.0, 1.0);

  float maxIndex = lutSize - 1.0;

  // Calculate 3D LUT indices
  float rIdx = r * maxIndex;
  float gIdx = g * maxIndex;
  float bIdx = b * maxIndex;

  // Get integer and fractional parts for trilinear interpolation
  float r0 = floor(rIdx);
  float g0 = floor(gIdx);
  float b0 = floor(bIdx);
  float r1 = min(r0 + 1.0, maxIndex);
  float g1 = min(g0 + 1.0, maxIndex);
  float b1 = min(b0 + 1.0, maxIndex);

  float rFrac = rIdx - r0;
  float gFrac = gIdx - g0;
  float bFrac = bIdx - b0;

  // The LUT texture is stored as a horizontal strip:
  // lutSize slices of lutSize x lutSize, arranged horizontally
  // Each slice is for a different blue value
  // X = r + (b * lutSize), Y = g

  half4 c000 = lut.eval(float2(r0 + b0 * lutSize + 0.5, g0 + 0.5));
  half4 c100 = lut.eval(float2(r1 + b0 * lutSize + 0.5, g0 + 0.5));
  half4 c010 = lut.eval(float2(r0 + b0 * lutSize + 0.5, g1 + 0.5));
  half4 c110 = lut.eval(float2(r1 + b0 * lutSize + 0.5, g1 + 0.5));
  half4 c001 = lut.eval(float2(r0 + b1 * lutSize + 0.5, g0 + 0.5));
  half4 c101 = lut.eval(float2(r1 + b1 * lutSize + 0.5, g0 + 0.5));
  half4 c011 = lut.eval(float2(r0 + b1 * lutSize + 0.5, g1 + 0.5));
  half4 c111 = lut.eval(float2(r1 + b1 * lutSize + 0.5, g1 + 0.5));

  // Trilinear interpolation
  half4 c00 = mix(c000, c100, half(rFrac));
  half4 c10 = mix(c010, c110, half(rFrac));
  half4 c01 = mix(c001, c101, half(rFrac));
  half4 c11 = mix(c011, c111, half(rFrac));

  half4 c0 = mix(c00, c10, half(gFrac));
  half4 c1 = mix(c01, c11, half(gFrac));

  half4 result = mix(c0, c1, half(bFrac));
  result.a = color.a;

  return result;
}
`;

// Simple color matrix shader for faster preview
const MATRIX_SHADER = `
uniform shader image;
uniform half4 row0;
uniform half4 row1;
uniform half4 row2;
uniform half offset0;
uniform half offset1;
uniform half offset2;

half4 main(float2 coord) {
  half4 color = image.eval(coord);

  half r = dot(color, row0) + offset0;
  half g = dot(color, row1) + offset1;
  half b = dot(color, row2) + offset2;

  return half4(clamp(r, 0.0, 1.0), clamp(g, 0.0, 1.0), clamp(b, 0.0, 1.0), color.a);
}
`;

let lutShaderEffect: SkRuntimeEffect | null = null;
let matrixShaderEffect: SkRuntimeEffect | null = null;

export const getLUTShaderEffect = (): SkRuntimeEffect | null => {
  if (!lutShaderEffect) {
    lutShaderEffect = Skia.RuntimeEffect.Make(LUT_SHADER);
    if (!lutShaderEffect) {
      console.error('Failed to compile LUT shader');
    }
  }
  return lutShaderEffect;
};

export const getMatrixShaderEffect = (): SkRuntimeEffect | null => {
  if (!matrixShaderEffect) {
    matrixShaderEffect = Skia.RuntimeEffect.Make(MATRIX_SHADER);
    if (!matrixShaderEffect) {
      console.error('Failed to compile matrix shader');
    }
  }
  return matrixShaderEffect;
};

// Convert 3D LUT data to a 2D texture atlas for GPU use
// Layout: horizontal strip of lutSize x lutSize slices
export const createLUTTexture = (
  lutData: Float32Array,
  lutSize: number
): ReturnType<typeof Skia.Image.MakeImage> | null => {
  const width = lutSize * lutSize; // lutSize slices arranged horizontally
  const height = lutSize;

  const pixels = new Uint8Array(width * height * 4);

  for (let b = 0; b < lutSize; b++) {
    for (let g = 0; g < lutSize; g++) {
      for (let r = 0; r < lutSize; r++) {
        const lutIdx = (b * lutSize * lutSize + g * lutSize + r) * 3;
        const texX = r + b * lutSize;
        const texY = g;
        const texIdx = (texY * width + texX) * 4;

        pixels[texIdx] = Math.max(0, Math.min(255, Math.round(lutData[lutIdx] * 255)));
        pixels[texIdx + 1] = Math.max(0, Math.min(255, Math.round(lutData[lutIdx + 1] * 255)));
        pixels[texIdx + 2] = Math.max(0, Math.min(255, Math.round(lutData[lutIdx + 2] * 255)));
        pixels[texIdx + 3] = 255;
      }
    }
  }

  const data = Skia.Data.fromBytes(pixels);
  return Skia.Image.MakeImage(
    { width, height, colorType: 4, alphaType: 1 },
    data,
    width * 4
  );
};

// Pre-computed LUT textures cache
const lutTextureCache: Map<string, ReturnType<typeof Skia.Image.MakeImage>> = new Map();

export const getCachedLUTTexture = (
  filename: string,
  lutData: Float32Array,
  lutSize: number
): ReturnType<typeof Skia.Image.MakeImage> | null => {
  if (lutTextureCache.has(filename)) {
    return lutTextureCache.get(filename) || null;
  }

  const texture = createLUTTexture(lutData, lutSize);
  if (texture) {
    lutTextureCache.set(filename, texture);
  }
  return texture;
};

export const clearLUTTextureCache = () => {
  lutTextureCache.clear();
};
