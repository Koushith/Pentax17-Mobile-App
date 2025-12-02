import { ImageFormat, Skia, TileMode } from "@shopify/react-native-skia";
import RNFS from 'react-native-fs';

// Kodak Gold 200-ish Matrix
const COLOR_MATRIX = [
    1.1, 0.1, 0.0, 0.0, 0,
    0.0, 1.0, 0.0, 0.0, 0,
    0.0, 0.1, 0.8, 0.0, 0,
    0.0, 0.0, 0.0, 1.0, 0
];

export const processAndSavePhoto = async (originalPath: string): Promise<string> => {
  try {
    // 1. Read file
    // Ensure path format is correct for RNFS
    const cleanPath = originalPath.startsWith('file://') ? originalPath.replace('file://', '') : originalPath;
    const base64 = await RNFS.readFile(cleanPath, 'base64');
    const data = Skia.Data.fromBase64(base64);
    const image = Skia.Image.MakeImageFromEncoded(data);
    
    if (!image) throw new Error("Could not decode image");

    const width = image.width();
    const height = image.height();
    
    // 2. Create Surface
    const surface = Skia.Surface.MakeOffscreen(width, height);
    if (!surface) throw new Error("Could not create surface");
    
    const canvas = surface.getCanvas();
    
    // 3. Draw Image with Color Matrix
    const paint = Skia.Paint();
    paint.setColorFilter(Skia.ColorFilter.MakeMatrix(COLOR_MATRIX));
    canvas.drawImage(image, 0, 0, paint);
    
    // 4. Draw Vignette
    const center = Skia.Point(width / 2, height / 2);
    const radius = width * 0.8;
    // Transparent to Black(0.4)
    const colors = [Skia.Color('transparent'), Skia.Color('rgba(0,0,0,0.4)')];
    const positions = [0, 1];
    
    const shader = Skia.Shader.MakeRadialGradient(
      center, 
      radius, 
      colors, 
      positions, 
      TileMode.Clamp
    );
    
    const vignettePaint = Skia.Paint();
    vignettePaint.setShader(shader);
    canvas.drawRect({ x: 0, y: 0, width, height }, vignettePaint);
    
    // 5. Snapshot and Save
    const snapshot = surface.makeImageSnapshot();
    const bytes = snapshot.encodeToBytes(ImageFormat.JPEG, 90);
    
    if (!bytes) throw new Error("Could not encode image");

    const encodedData = Skia.Data.fromBytes(bytes);
    const base64Output = (encodedData as any).toBase64String();
    
    const newPath = cleanPath.replace('.jpg', '_processed.jpg');
    await RNFS.writeFile(newPath, base64Output, 'base64');
    
    // Optionally delete original?
    // await RNFS.unlink(cleanPath);
    
    return `file://${newPath}`;
  } catch (e) {
    console.error("Failed to process photo", e);
    return originalPath; // Fallback to original
  }
};
