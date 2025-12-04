import { FFmpegKit, ReturnCode } from 'ffmpeg-kit-react-native';
import RNFS from 'react-native-fs';
import { getFilmStockById } from './filters';

// Get the path to the LUT file in the app bundle
const getLUTPath = async (lutFile: string): Promise<string | null> => {
  // LUT files are bundled with the app
  const bundlePath = `${RNFS.MainBundlePath}/${lutFile}`;
  const exists = await RNFS.exists(bundlePath);

  if (exists) {
    return bundlePath;
  }

  // Try Documents directory as fallback
  const docsPath = `${RNFS.DocumentDirectoryPath}/${lutFile}`;
  const docsExists = await RNFS.exists(docsPath);

  if (docsExists) {
    return docsPath;
  }

  console.log('LUT file not found:', lutFile);
  return null;
};

// Copy LUT file from assets to temp for FFmpeg access
const prepareLUTFile = async (lutFile: string): Promise<string | null> => {
  try {
    // Read from bundled assets
    const assetPath = `${RNFS.MainBundlePath}/${lutFile}`;
    const tempPath = `${RNFS.TemporaryDirectoryPath}/${lutFile}`;

    // Check if already copied
    if (await RNFS.exists(tempPath)) {
      return tempPath;
    }

    // Check if source exists
    if (await RNFS.exists(assetPath)) {
      await RNFS.copyFile(assetPath, tempPath);
      return tempPath;
    }

    console.log('LUT asset not found:', assetPath);
    return null;
  } catch (error) {
    console.error('Error preparing LUT file:', error);
    return null;
  }
};

export interface VideoProcessingResult {
  success: boolean;
  outputPath?: string;
  error?: string;
}

/**
 * Process a video with the selected film filter using FFmpeg
 * @param inputPath - Path to the input video file
 * @param filmId - ID of the film stock to apply
 * @returns Promise with the processing result
 */
export const processVideoWithFilter = async (
  inputPath: string,
  filmId: string
): Promise<VideoProcessingResult> => {
  try {
    const filmStock = getFilmStockById(filmId);

    if (!filmStock.lutFile) {
      // No LUT file, return original
      console.log('No LUT file for filter, returning original video');
      return { success: true, outputPath: inputPath };
    }

    const lutPath = await prepareLUTFile(filmStock.lutFile);

    if (!lutPath) {
      console.log('Could not prepare LUT file, returning original video');
      return { success: true, outputPath: inputPath };
    }

    // Generate output path
    const timestamp = Date.now();
    const outputPath = `${RNFS.DocumentDirectoryPath}/processed_video_${timestamp}.mp4`;

    // Clean input path (remove file:// prefix if present)
    const cleanInputPath = inputPath.replace('file://', '');

    console.log('Processing video with FFmpeg...');
    console.log('Input:', cleanInputPath);
    console.log('LUT:', lutPath);
    console.log('Output:', outputPath);

    // FFmpeg command to apply 3D LUT
    // -y: overwrite output
    // -i: input file
    // lut3d: apply 3D LUT filter
    // -c:v: video codec (h264 for compatibility)
    // -c:a: audio codec (copy to preserve original audio)
    // -preset: encoding speed/quality tradeoff
    // -crf: quality (lower = better, 18-23 is good)
    const command = `-y -i "${cleanInputPath}" -vf "lut3d='${lutPath}'" -c:v h264 -c:a copy -preset fast -crf 20 "${outputPath}"`;

    console.log('FFmpeg command:', command);

    const session = await FFmpegKit.execute(command);
    const returnCode = await session.getReturnCode();

    if (ReturnCode.isSuccess(returnCode)) {
      console.log('Video processing successful:', outputPath);

      // Verify output exists
      const outputExists = await RNFS.exists(outputPath);
      if (outputExists) {
        return { success: true, outputPath };
      } else {
        return { success: false, error: 'Output file not created' };
      }
    } else {
      const logs = await session.getAllLogsAsString();
      console.error('FFmpeg failed:', logs);
      return { success: false, error: `FFmpeg error: ${logs}` };
    }
  } catch (error: any) {
    console.error('Video processing error:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
};

/**
 * Check if FFmpeg is available
 */
export const isFFmpegAvailable = async (): Promise<boolean> => {
  try {
    const session = await FFmpegKit.execute('-version');
    const returnCode = await session.getReturnCode();
    return ReturnCode.isSuccess(returnCode);
  } catch {
    return false;
  }
};
