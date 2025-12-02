import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraRoll } from "@react-native-camera-roll/camera-roll";
import RNFS from 'react-native-fs';
import { Photo, FilmRoll, AppSettings } from '../types';

const PHOTOS_KEY = 'photos_metadata';
const ROLLS_KEY = 'film_rolls';
const SETTINGS_KEY = 'app_settings';

const DEFAULT_SETTINGS: AppSettings = {
  dateStampEnabled: false,
  soundEnabled: true,
  currentRollId: '',
  currentFrameNumber: 0,
};

// Settings Management
export const getSettings = async (): Promise<AppSettings> => {
  try {
    const json = await AsyncStorage.getItem(SETTINGS_KEY);
    if (json) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(json) };
    }
    return DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = async (settings: Partial<AppSettings>): Promise<AppSettings> => {
  const current = await getSettings();
  const updated = { ...current, ...settings };
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  return updated;
};

// Film Roll Management
export const getCurrentRoll = async (): Promise<FilmRoll | null> => {
  const settings = await getSettings();
  if (!settings.currentRollId) return null;

  const rolls = await getRolls();
  return rolls.find(r => r.id === settings.currentRollId) || null;
};

export const getRolls = async (): Promise<FilmRoll[]> => {
  try {
    const json = await AsyncStorage.getItem(ROLLS_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
};

export const createNewRoll = async (filmStock: string): Promise<FilmRoll> => {
  const newRoll: FilmRoll = {
    id: Date.now().toString(),
    startDate: new Date().toISOString(),
    frameCount: 0,
    maxFrames: 36,
    filmStock,
  };

  const rolls = await getRolls();
  rolls.unshift(newRoll);
  await AsyncStorage.setItem(ROLLS_KEY, JSON.stringify(rolls));

  await saveSettings({
    currentRollId: newRoll.id,
    currentFrameNumber: 0,
  });

  return newRoll;
};

export const incrementFrameCount = async (): Promise<number> => {
  const settings = await getSettings();
  const newFrameNumber = settings.currentFrameNumber + 1;

  // Update roll
  const rolls = await getRolls();
  const rollIndex = rolls.findIndex(r => r.id === settings.currentRollId);
  if (rollIndex >= 0) {
    rolls[rollIndex].frameCount = newFrameNumber;
    await AsyncStorage.setItem(ROLLS_KEY, JSON.stringify(rolls));
  }

  await saveSettings({ currentFrameNumber: newFrameNumber });
  return newFrameNumber;
};

// Photo Management
export const savePhoto = async (
  path: string,
  width: number,
  height: number,
  filmStock: string,
  hasDateStamp: boolean,
  frameNumber: number,
  rollId: string
): Promise<Photo> => {
  // 1. Save to System Gallery (Camera Roll)
  try {
    const cleanPath = path.startsWith('file://') ? path : `file://${path}`;
    await CameraRoll.saveAsset(cleanPath, { type: 'photo' });
    console.log('Saved to Camera Roll');
  } catch (error) {
    console.error('Failed to save to Camera Roll:', error);
  }

  // 2. Save to internal app storage
  const timestamp = Date.now();
  const fileName = `photo_${timestamp}.jpg`;
  const destPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

  const cleanSourcePath = path.startsWith('file://') ? path.replace('file://', '') : path;
  await RNFS.copyFile(cleanSourcePath, destPath);

  const newPhoto: Photo = {
    id: timestamp.toString(),
    uri: `file://${destPath}`,
    date: new Date().toISOString(),
    width,
    height,
    filmStock,
    hasDateStamp,
    frameNumber,
    rollId,
  };

  const existingPhotosJson = await AsyncStorage.getItem(PHOTOS_KEY);
  const existingPhotos: Photo[] = existingPhotosJson ? JSON.parse(existingPhotosJson) : [];

  const updatedPhotos = [newPhoto, ...existingPhotos];
  await AsyncStorage.setItem(PHOTOS_KEY, JSON.stringify(updatedPhotos));

  return newPhoto;
};

export const getPhotos = async (): Promise<Photo[]> => {
  const photosJson = await AsyncStorage.getItem(PHOTOS_KEY);
  if (!photosJson) return [];

  // Handle migration from old format
  const photos = JSON.parse(photosJson);
  return photos.map((p: any) => ({
    ...p,
    filmStock: p.filmStock || 'kodak_gold_200',
    hasDateStamp: p.hasDateStamp || false,
    frameNumber: p.frameNumber || 0,
    rollId: p.rollId || '',
  }));
};

export const getPhotosByRoll = async (rollId: string): Promise<Photo[]> => {
  const photos = await getPhotos();
  return photos.filter(p => p.rollId === rollId);
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
      console.warn('Failed to delete file:', e);
    }
  }

  const updatedPhotos = photos.filter(p => p.id !== id);
  await AsyncStorage.setItem(PHOTOS_KEY, JSON.stringify(updatedPhotos));
};

export const updatePhoto = async (id: string, updates: Partial<Photo>): Promise<Photo | null> => {
  const photos = await getPhotos();
  const index = photos.findIndex(p => p.id === id);

  if (index === -1) return null;

  photos[index] = { ...photos[index], ...updates };
  await AsyncStorage.setItem(PHOTOS_KEY, JSON.stringify(photos));

  return photos[index];
};
