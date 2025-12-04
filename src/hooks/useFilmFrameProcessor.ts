import { useFrameProcessor } from 'react-native-vision-camera';
import { useSharedValue } from 'react-native-reanimated';
import { FilmStock } from '../services/filters';

// Declare the native frame processor plugin
declare const applyLUT: (frame: any, options: { filterId: string }) => void;

/**
 * Hook that creates a native frame processor for real-time LUT color grading
 * Uses Core Image's CIColorCube filter via Metal for GPU-accelerated processing
 */
export function useFilmFrameProcessor(filmStock: FilmStock) {
  const filmId = useSharedValue(filmStock.id);

  // Update the shared value when filmStock changes
  filmId.value = filmStock.id;

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    // Call the native LUT frame processor plugin
    applyLUT(frame, { filterId: filmId.value });
  }, []);

  return frameProcessor;
}
