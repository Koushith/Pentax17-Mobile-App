import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraRoll } from "@react-native-camera-roll/camera-roll";
import RNFS from 'react-native-fs';
import { Photo } from '../types';

const PHOTOS_KEY = 'photos_metadata';

export const savePhoto = async (path: string, width: number, height: number): Promise<Photo> => {
  // 1. Save to System Gallery (Camera Roll)
  try {
    // Explicitly check/request permission first
    // Note: CameraRoll.saveAsset usually handles this, but explicit request is safer
    // We'll rely on the library's internal permission handling which should trigger the prompt
    // Ensure path is clean
    const cleanPath = path.startsWith('file://') ? path : `file://${path}`;
    await CameraRoll.saveAsset(cleanPath, { type: 'photo' });
    console.log('Saved to Camera Roll');
  } catch (error) {
    console.error('Failed to save to Camera Roll:', error);
  }

  // 2. Continue with internal app storage logic...
  const timestamp = Date.now();
  const fileName = `photo_${timestamp}.jpg`; // Use a new unique filename for internal storage
  const destPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

  // Copy the photo from its temporary location (or original path) to the app's document directory
  // The 'path' parameter here is the source URI, which might be a temporary file.
  const cleanSourcePath = path.startsWith('file://') ? path.replace('file://', '') : path;
  
  await RNFS.copyFile(cleanSourcePath, destPath);

  const newPhoto: Photo = {
    id: timestamp.toString(),
    uri: `file://${destPath}`,
    date: new Date().toISOString(),
    width,
    height,
  };

  const existingPhotosJson = await AsyncStorage.getItem(PHOTOS_KEY);
  const existingPhotos: Photo[] = existingPhotosJson ? JSON.parse(existingPhotosJson) : [];
  
  const updatedPhotos = [newPhoto, ...existingPhotos];
  await AsyncStorage.setItem(PHOTOS_KEY, JSON.stringify(updatedPhotos));

  return newPhoto;
};

export const getPhotos = async (): Promise<Photo[]> => {
  const photosJson = await AsyncStorage.getItem(PHOTOS_KEY);
  return photosJson ? JSON.parse(photosJson) : [];
};

export const deletePhoto = async (id: string): Promise<void> => {
  const photos = await getPhotos();
  const photoToDelete = photos.find(p => p.id === id);
  
  if (photoToDelete) {
    try {
      const cleanPath = photoToDelete.uri.replace('file://', '');
      if (await RNFS.exists(cleanPath)) {
        await RNFS.unlink(cleanPath);
      }
    } catch (e) {
      console.warn('Failed to delete file......', e);
    }
  }

  const updatedPhotos = photos.filter(p => p.id !== id);
  await AsyncStorage.setItem(PHOTOS_KEY, JSON.stringify(updatedPhotos));
};
