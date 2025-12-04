import { ImageFormat, Skia, TileMode } from "@shopify/react-native-skia";
import RNFS from 'react-native-fs';
import { getFilmStockById } from './filters';

// Pentax 17 half-frame aspect ratio: 17x24mm = 2:3 vertical
const HALF_FRAME_ASPECT_RATIO = 2 / 3;

// Cache for loaded typeface
let cachedTypeface: ReturnType<typeof Skia.Typeface.MakeFreeTypeFaceFromData> | null = null;

// Load Departure Mono font from bundle
const loadDepartureMonoFont = async (): Promise<ReturnType<typeof Skia.Typeface.MakeFreeTypeFaceFromData> | null> => {
  if (cachedTypeface) return cachedTypeface;

  try {
    // Font is bundled with the app via react-native.config.js
    // Try to load from the main bundle
    const fontPath = `${RNFS.MainBundlePath}/DepartureMono-Regular.otf`;
    const exists = await RNFS.exists(fontPath);

    if (exists) {
      const fontData = await RNFS.readFile(fontPath, 'base64');
      const bytes = Uint8Array.from(atob(fontData), c => c.charCodeAt(0));
      const skiaData = Skia.Data.fromBytes(bytes);
      cachedTypeface = Skia.Typeface.MakeFreeTypeFaceFromData(skiaData);
      console.log('Loaded Departure Mono font successfully');
      return cachedTypeface;
    }
    console.log('Font file not found at:', fontPath);
  } catch (e) {
    console.log('Failed to load Departure Mono font:', e);
  }
  return null;
};

// Helper to create a font
const createFont = (size: number, typeface: ReturnType<typeof Skia.Typeface.MakeFreeTypeFaceFromData> | null) => {
  if (typeface) {
    return Skia.Font(typeface, size);
  }
  // Fallback to system font
  const fontMgr = Skia.FontMgr.System();
  const fallbackTypeface = fontMgr.matchFamilyStyle('Courier', { weight: 400, width: 5, slant: 0 });
  return Skia.Font(fallbackTypeface, size);
};

// Polaroid frame dimensions (relative to image)
const POLAROID_BORDER = 0.04; // 4% border on sides and top
const POLAROID_BOTTOM = 0.15; // 15% bottom for text

interface ProcessOptions {
  filmId: string;
  addDateStamp: boolean;
  addGrain: boolean;
  addPolaroidFrame: boolean;
  location?: string;
}

const formatDateStamp = (): string => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return `'${year} ${month} ${day}`;
};

const formatPolaroidDate = (): string => {
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[now.getMonth()];
  const day = now.getDate();
  const year = now.getFullYear();
  const hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${month} ${day}, ${year}  ${hour12}:${minutes} ${ampm}`;
};

export const processAndSavePhoto = async (
  imagePath: string,
  options: ProcessOptions
): Promise<{ path: string; width: number; height: number }> => {
  try {
    console.log('Processing photo:', imagePath);

    // Load custom font for text rendering
    const customTypeface = await loadDepartureMonoFont();

    // 1. Read file
    const cleanPath = imagePath.startsWith('file://') ? imagePath.replace('file://', '') : imagePath;
    const fileContent = await RNFS.readFile(cleanPath, 'base64');
    const inputBytes = Uint8Array.from(atob(fileContent), c => c.charCodeAt(0));
    const data = Skia.Data.fromBytes(inputBytes);
    const image = Skia.Image.MakeImageFromEncoded(data);

    if (!image) throw new Error("Could not decode image");

    const originalWidth = image.width();
    const originalHeight = image.height();

    console.log('Original dimensions:', originalWidth, 'x', originalHeight);

    // 2. Calculate half-frame crop (vertical format)
    let cropX = 0;
    let cropY = 0;
    let cropWidth = originalWidth;
    let cropHeight = originalHeight;

    const currentAspect = originalWidth / originalHeight;

    if (currentAspect > HALF_FRAME_ASPECT_RATIO) {
      // Image is wider than half-frame, crop width
      cropWidth = Math.floor(originalHeight * HALF_FRAME_ASPECT_RATIO);
      cropX = Math.floor((originalWidth - cropWidth) / 2);
    } else {
      // Image is taller than half-frame, crop height
      cropHeight = Math.floor(originalWidth / HALF_FRAME_ASPECT_RATIO);
      cropY = Math.floor((originalHeight - cropHeight) / 2);
    }

    // Calculate final output dimensions
    let outputWidth = cropWidth;
    let outputHeight = cropHeight;
    let imageOffsetX = 0;
    let imageOffsetY = 0;

    if (options.addPolaroidFrame) {
      // Add Polaroid frame padding
      const borderSize = Math.floor(cropWidth * POLAROID_BORDER);
      const bottomSize = Math.floor(cropHeight * POLAROID_BOTTOM);
      outputWidth = cropWidth + (borderSize * 2);
      outputHeight = cropHeight + borderSize + bottomSize;
      imageOffsetX = borderSize;
      imageOffsetY = borderSize;
    }

    console.log('Output dimensions:', outputWidth, 'x', outputHeight);

    // 3. Create offscreen surface using MakeOffscreen for GPU rendering
    const surface = Skia.Surface.MakeOffscreen(outputWidth, outputHeight);
    if (!surface) {
      console.error('Failed to create offscreen surface, trying Make');
      // Fallback - just return original
      throw new Error("Could not create surface");
    }

    const canvas = surface.getCanvas();

    // 4. Fill background (white for Polaroid, black otherwise)
    const bgPaint = Skia.Paint();
    if (options.addPolaroidFrame) {
      bgPaint.setColor(Skia.Color('#F5F5F0')); // Slightly warm white like real Polaroid
    } else {
      bgPaint.setColor(Skia.Color('#000000'));
    }
    canvas.drawRect({ x: 0, y: 0, width: outputWidth, height: outputHeight }, bgPaint);

    // 5. Get film stock and create paint with color matrix filter
    const selectedFilm = getFilmStockById(options.filmId);
    const paint = Skia.Paint();
    paint.setColorFilter(Skia.ColorFilter.MakeMatrix(selectedFilm.matrix));

    // 6. Draw cropped image with filter
    // Create source and destination rectangles for drawing
    const srcRect = { x: cropX, y: cropY, width: cropWidth, height: cropHeight };
    const dstRect = { x: imageOffsetX, y: imageOffsetY, width: cropWidth, height: cropHeight };

    canvas.drawImageRect(image, srcRect, dstRect, paint);

    // 8. Add vignette effect
    const centerX = imageOffsetX + cropWidth / 2;
    const centerY = imageOffsetY + cropHeight / 2;
    const radius = Math.max(cropWidth, cropHeight) * 0.7;

    const vignetteShader = Skia.Shader.MakeRadialGradient(
      { x: centerX, y: centerY },
      radius,
      [Skia.Color('transparent'), Skia.Color('rgba(0,0,0,0.35)')],
      [0.5, 1],
      TileMode.Clamp
    );

    const vignettePaint = Skia.Paint();
    vignettePaint.setShader(vignetteShader);
    canvas.drawRect({ x: imageOffsetX, y: imageOffsetY, width: cropWidth, height: cropHeight }, vignettePaint);

    // 9. Add film grain if enabled
    if (options.addGrain && selectedFilm.grain > 0) {
      const grainPaint = Skia.Paint();
      const numDots = Math.floor(cropWidth * cropHeight * 0.0003);

      for (let i = 0; i < numDots; i++) {
        const x = imageOffsetX + Math.random() * cropWidth;
        const y = imageOffsetY + Math.random() * cropHeight;
        const brightness = Math.random() > 0.5 ? 255 : 0;
        const alpha = selectedFilm.grain * 0.1;
        grainPaint.setColor(Skia.Color(`rgba(${brightness},${brightness},${brightness},${alpha})`));
        canvas.drawCircle(x, y, 0.8, grainPaint);
      }
    }

    // 10. Add date stamp if enabled (on image, not Polaroid)
    if (options.addDateStamp && !options.addPolaroidFrame) {
      const dateText = formatDateStamp();
      const fontSize = Math.floor(cropHeight * 0.035);

      const dateFont = createFont(fontSize, customTypeface);
      const datePaint = Skia.Paint();
      datePaint.setColor(Skia.Color('#FF6B35')); // Orange/amber date stamp color

      const textBounds = dateFont.measureText(dateText);
      const padding = cropWidth * 0.04;
      const x = imageOffsetX + cropWidth - textBounds.width - padding;
      const y = imageOffsetY + cropHeight - padding;

      // Draw shadow
      const shadowPaint = Skia.Paint();
      shadowPaint.setColor(Skia.Color('rgba(0,0,0,0.7)'));
      canvas.drawText(dateText, x + 1, y + 1, shadowPaint, dateFont);
      canvas.drawText(dateText, x, y, datePaint, dateFont);
    }

    // 11. Add Polaroid text if enabled
    if (options.addPolaroidFrame) {
      console.log('Adding Polaroid text, location:', options.location);
      const borderSize = Math.floor(cropWidth * POLAROID_BORDER);
      const bottomAreaStart = imageOffsetY + cropHeight;
      const bottomAreaHeight = outputHeight - bottomAreaStart;
      console.log('Bottom area:', bottomAreaStart, 'to', outputHeight, 'height:', bottomAreaHeight);

      // Date and time - positioned nicely in bottom area
      const dateText = formatPolaroidDate();
      console.log('Date text:', dateText);
      const dateFontSize = Math.floor(outputWidth * 0.035);
      const dateFont = createFont(dateFontSize, customTypeface);
      console.log('Date font created, size:', dateFontSize);
      const datePaint = Skia.Paint();
      datePaint.setColor(Skia.Color('#2C2C2C'));

      const dateX = borderSize * 1.5;
      const dateY = bottomAreaStart + bottomAreaHeight * 0.45;
      canvas.drawText(dateText, dateX, dateY, datePaint, dateFont);

      // Location if provided - below the date
      if (options.location) {
        const locationFontSize = Math.floor(outputWidth * 0.028);
        const locationFont = createFont(locationFontSize, customTypeface);
        const locationPaint = Skia.Paint();
        locationPaint.setColor(Skia.Color('#666666'));

        const locationY = dateY + locationFontSize * 1.8;
        canvas.drawText(options.location, dateX, locationY, locationPaint, locationFont);
      }

      // Film stock watermark (small, bottom right corner)
      const filmFontSize = Math.floor(outputWidth * 0.022);
      const filmFont = createFont(filmFontSize, customTypeface);
      const filmPaint = Skia.Paint();
      filmPaint.setColor(Skia.Color('#AAAAAA'));

      const filmText = selectedFilm.label;
      const filmBounds = filmFont.measureText(filmText);
      const filmX = outputWidth - borderSize * 1.5 - filmBounds.width;
      const filmY = bottomAreaStart + bottomAreaHeight * 0.75;
      canvas.drawText(filmText, filmX, filmY, filmPaint, filmFont);
    }

    // 12. Snapshot and Save
    const snapshot = surface.makeImageSnapshot();
    const outputBytes = snapshot.encodeToBytes(ImageFormat.JPEG, 95);

    if (!outputBytes) throw new Error("Could not encode image");

    // Convert to base64
    let binary = '';
    const len = outputBytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(outputBytes[i]);
    }
    const base64Output = btoa(binary);

    const timestamp = Date.now();
    const newPath = `${RNFS.DocumentDirectoryPath}/processed_${timestamp}.jpg`;
    await RNFS.writeFile(newPath, base64Output, 'base64');

    console.log('Processed photo saved:', newPath, outputWidth, 'x', outputHeight);

    return {
      path: `file://${newPath}`,
      width: outputWidth,
      height: outputHeight,
    };
  } catch (e) {
    console.error("Failed to process photo:", e);
    // Return original on failure
    return {
      path: imagePath,
      width: 0,
      height: 0,
    };
  }
};

// Re-process an existing photo with different settings
export const reprocessPhoto = async (
  photoUri: string,
  newFilmId: string
): Promise<string> => {
  try {
    const cleanPath = photoUri.startsWith('file://') ? photoUri.replace('file://', '') : photoUri;
    const fileContent = await RNFS.readFile(cleanPath, 'base64');
    const inputBytes = Uint8Array.from(atob(fileContent), c => c.charCodeAt(0));
    const data = Skia.Data.fromBytes(inputBytes);
    const image = Skia.Image.MakeImageFromEncoded(data);

    if (!image) throw new Error("Could not decode image");

    const selectedFilm = getFilmStockById(newFilmId);
    const width = image.width();
    const height = image.height();

    const surface = Skia.Surface.MakeOffscreen(width, height);
    if (!surface) throw new Error("Could not create surface");

    const canvas = surface.getCanvas();

    const paint = Skia.Paint();
    paint.setColorFilter(Skia.ColorFilter.MakeMatrix(selectedFilm.matrix));

    canvas.drawImage(image, 0, 0, paint);

    // Re-add vignette
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.max(width, height) * 0.7;

    const vignetteShader = Skia.Shader.MakeRadialGradient(
      { x: centerX, y: centerY },
      radius,
      [Skia.Color('transparent'), Skia.Color('rgba(0,0,0,0.35)')],
      [0.5, 1],
      TileMode.Clamp
    );

    const vignettePaint = Skia.Paint();
    vignettePaint.setShader(vignetteShader);
    canvas.drawRect({ x: 0, y: 0, width, height }, vignettePaint);

    const snapshot = surface.makeImageSnapshot();
    const outputBytes = snapshot.encodeToBytes(ImageFormat.JPEG, 95);

    if (!outputBytes) throw new Error("Could not encode image");

    let binary = '';
    const len = outputBytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(outputBytes[i]);
    }
    const base64Output = btoa(binary);

    const timestamp = Date.now();
    const newPath = `${RNFS.DocumentDirectoryPath}/reprocessed_${timestamp}.jpg`;
    await RNFS.writeFile(newPath, base64Output, 'base64');

    return `file://${newPath}`;
  } catch (e) {
    console.error("Failed to reprocess photo:", e);
    return photoUri;
  }
};
