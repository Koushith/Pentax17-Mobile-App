import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { Photo } from '../types';

const PHOTOS_KEY = '@cam_app_photos';

export const savePhoto = async (tempUri: string, width: number, height: number): Promise<Photo> => {
  const timestamp = Date.now();
  const fileName = `photo_${timestamp}.jpg`;
  const destPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

  // Ensure the file exists before moving? moveFile throws if source doesn't exist.
  // tempUri might be file://...
  const cleanTempUri = tempUri.startsWith('file://') ? tempUri.replace('file://', '') : tempUri;
  
  await RNFS.moveFile(cleanTempUri, destPath);

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
