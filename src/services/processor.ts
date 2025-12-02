import { ImageFormat, Skia, TileMode } from "@shopify/react-native-skia";
import RNFS from 'react-native-fs';
import { FILM_STOCKS } from './filters';

export const processAndSavePhoto = async (imagePath: string, filmId: string = 'kodak_gold_200'): Promise<string> => {
  try {
    // 1. Read file
    // Ensure path format is correct for RNFS
    const cleanPath = imagePath.startsWith('file://') ? imagePath.replace('file://', '') : imagePath;
    const fileContent = await RNFS.readFile(cleanPath, 'base64');
    const inputBytes = Uint8Array.from(atob(fileContent), c => c.charCodeAt(0));
    const data = Skia.Data.fromBytes(inputBytes);
    const image = Skia.Image.MakeImageFromEncoded(data);
    
    if (!image) throw new Error("Could not decode image");

    const width = image.width();
    const height = image.height();
    
    // 2. Create Surface
    const surface = Skia.Surface.Make(width, height);
    if (!surface) throw new Error("Could not create surface");
    
    const canvas = surface.getCanvas();
    
    // 3. Draw Image with Color Matrix
    // Apply Film Filter
    const selectedFilm = FILM_STOCKS.find(f => f.id === filmId) || FILM_STOCKS[0];
    const paint = Skia.Paint();
    paint.setColorFilter(Skia.ColorFilter.MakeMatrix(selectedFilm.matrix));
    
    // Draw the image with the filter applied
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
    const outputBytes = snapshot.encodeToBytes(ImageFormat.JPEG, 90);
    
    if (!outputBytes) throw new Error("Could not encode image");

    // Custom Base64 conversion since toBase64String might be missing
    let binary = '';
    const len = outputBytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(outputBytes[i]);
    }
    const base64Output = btoa(binary);
    
    const newPath = cleanPath.replace('.jpg', '_processed.jpg');
    await RNFS.writeFile(newPath, base64Output, 'base64');
    
    return `file://${newPath}`;
  } catch (e) {
    console.error("Failed to process photo", e);
    return imagePath; // Fallback to original
  }
};
