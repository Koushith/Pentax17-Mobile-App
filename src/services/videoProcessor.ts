/**
 * Video processing service
 * Note: FFmpeg video filters are temporarily disabled due to library retirement.
 * Videos are saved without color grading until a stable FFmpeg solution is available.
 */

export interface VideoProcessingResult {
  success: boolean;
  outputPath?: string;
  error?: string;
}

/**
 * Process a video with the selected film filter
 * Currently returns the original video due to FFmpeg library unavailability
 * @param inputPath - Path to the input video file
 * @param _filmId - ID of the film stock (unused until FFmpeg is restored)
 * @returns Promise with the processing result
 */
export const processVideoWithFilter = async (
  inputPath: string,
  _filmId: string
): Promise<VideoProcessingResult> => {
  // FFmpeg-kit has been retired and binaries removed from public repos
  // Until a stable solution is available, return the original video
  console.log('Video filter processing disabled - returning original video');
  return { success: true, outputPath: inputPath };
};

/**
 * Check if video processing is available
 * Currently always returns false as FFmpeg is unavailable
 */
export const isFFmpegAvailable = async (): Promise<boolean> => {
  return false;
};
