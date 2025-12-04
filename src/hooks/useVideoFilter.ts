import { useSkiaFrameProcessor } from 'react-native-vision-camera';
import { Skia } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { useSharedValue } from 'react-native-worklets-core';
import { FilmStock } from '../services/filters';

// Color matrix for film-like color grading
// These approximate the LUT effects for real-time video preview
const FILM_MATRICES: Record<string, number[]> = {
  // Kodak 250D - warm cinematic daylight
  kodak_250d: [
    1.1, 0.05, -0.02, 0, 0.02,
    0.02, 1.0, 0.0, 0, 0.01,
    -0.05, 0.0, 0.95, 0, 0.0,
    0, 0, 0, 1, 0,
  ],
  // Moonrise Kingdom - warm vintage Wes Anderson style
  moonrise_kingdom: [
    1.15, 0.08, -0.03, 0, 0.04,
    0.05, 1.05, 0.02, 0, 0.03,
    -0.08, -0.02, 0.88, 0, 0.02,
    0, 0, 0, 1, 0,
  ],
  // Vintage Overlay - faded vintage look
  vintage_overlay: [
    1.0, 0.1, 0.05, 0, 0.03,
    0.05, 0.95, 0.05, 0, 0.02,
    0.0, 0.05, 0.85, 0, 0.05,
    0, 0, 0, 1, 0,
  ],
  // Clean Raw - natural clean look
  clean_raw: [
    1.02, 0.0, 0.0, 0, 0.0,
    0.0, 1.02, 0.0, 0, 0.0,
    0.0, 0.0, 1.0, 0, 0.0,
    0, 0, 0, 1, 0,
  ],
};

// Identity matrix (no filter)
const IDENTITY_MATRIX = [
  1, 0, 0, 0, 0,
  0, 1, 0, 0, 0,
  0, 0, 1, 0, 0,
  0, 0, 0, 1, 0,
];

export const useVideoFilter = (selectedFilm: FilmStock | null, enabled: boolean = true) => {
  // Use shared value for the color matrix so worklets can access it
  const matrixShared = useSharedValue<number[]>(IDENTITY_MATRIX);

  // Update the shared value when film changes
  useEffect(() => {
    if (!enabled || !selectedFilm) {
      matrixShared.value = IDENTITY_MATRIX;
    } else {
      matrixShared.value = FILM_MATRICES[selectedFilm.id] || IDENTITY_MATRIX;
    }
  }, [selectedFilm, enabled, matrixShared]);

  // Create the frame processor with the color filter
  const frameProcessor = useSkiaFrameProcessor((frame) => {
    'worklet';

    // Create paint with color filter
    const paint = Skia.Paint();

    // Apply color matrix filter for film look
    // The matrix is 4x5: [R, G, B, A, offset] for each output channel
    const matrix = matrixShared.value;
    const cf = Skia.ColorFilter.MakeMatrix(matrix);
    paint.setColorFilter(cf);

    // Render the frame with the filter applied
    frame.render(paint);
  }, [matrixShared]);

  return frameProcessor;
};

// Simpler hook that just returns whether video filtering is available
export const useVideoFilterAvailable = (): boolean => {
  try {
    // Check if Skia and worklets are available
    return typeof Skia !== 'undefined' && typeof useSkiaFrameProcessor === 'function';
  } catch {
    return false;
  }
};
