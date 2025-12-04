import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraRoll } from "@react-native-camera-roll/camera-roll";
import RNFS from 'react-native-fs';
import { Photo, Video, FilmRoll, AppSettings } from '../types';

const PHOTOS_KEY = 'photos_metadata';
const VIDEOS_KEY = 'videos_metadata';
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
  const timestamp = Date.now();

  // The processed photo path (already in Documents from processor)
  const processedPath = path.startsWith('file://') ? path : `file://${path}`;
  const cleanPath = path.startsWith('file://') ? path.replace('file://', '') : path;

  // 1. Save to Camera Roll (for user's photo library)
  try {
    await CameraRoll.saveAsset(processedPath, { type: 'photo' });
    console.log('Saved to Camera Roll');
  } catch (error) {
    console.error('Failed to save to Camera Roll:', error);
  }

  // 2. Use the processed photo directly (it's already in Documents)
  // Verify the file exists
  const exists = await RNFS.exists(cleanPath);
  console.log('Photo exists at path:', cleanPath, exists);

  if (!exists) {
    console.error('Processed photo not found at:', cleanPath);
    throw new Error('Processed photo not found');
  }

  const newPhoto: Photo = {
    id: timestamp.toString(),
    uri: processedPath,
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

  console.log('Photo saved to gallery:', newPhoto.uri);

  return newPhoto;
};

export const getPhotos = async (): Promise<Photo[]> => {
  const photosJson = await AsyncStorage.getItem(PHOTOS_KEY);
  console.log('getPhotos - raw data:', photosJson ? 'found' : 'empty');
  if (!photosJson) return [];

  // Handle migration from old format
  const photos: Photo[] = JSON.parse(photosJson);
  console.log('getPhotos - total photos in storage:', photos.length);

  const mappedPhotos = photos.map((p: any) => ({
    ...p,
    filmStock: p.filmStock || 'kodak_gold_200',
    hasDateStamp: p.hasDateStamp || false,
    frameNumber: p.frameNumber || 0,
    rollId: p.rollId || '',
  }));

  // Check which photos still exist on disk
  const validPhotos: Photo[] = [];
  const invalidIds: string[] = [];

  for (const photo of mappedPhotos) {
    const cleanPath = photo.uri.replace('file://', '');
    console.log('Checking photo:', photo.id, 'path:', cleanPath);
    const exists = await RNFS.exists(cleanPath);
    console.log('Photo exists:', exists);
    if (exists) {
      validPhotos.push(photo);
    } else {
      invalidIds.push(photo.id);
    }
  }

  console.log('getPhotos - valid:', validPhotos.length, 'invalid:', invalidIds.length);

  // If any photos were removed, update storage
  if (invalidIds.length > 0) {
    console.log('Removing invalid photos:', invalidIds.length);
    await AsyncStorage.setItem(PHOTOS_KEY, JSON.stringify(validPhotos));
  }

  return validPhotos;
};

// Remove a photo from our metadata (used when image fails to load)
export const removePhotoFromMetadata = async (id: string): Promise<void> => {
  const photosJson = await AsyncStorage.getItem(PHOTOS_KEY);
  if (!photosJson) return;

  const photos: Photo[] = JSON.parse(photosJson);
  const updatedPhotos = photos.filter(p => p.id !== id);
  await AsyncStorage.setItem(PHOTOS_KEY, JSON.stringify(updatedPhotos));
};

// Clear all photo metadata (useful for resetting after storage issues)
export const clearAllPhotos = async (): Promise<void> => {
  await AsyncStorage.removeItem(PHOTOS_KEY);
  console.log('Cleared all photo metadata');
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

// Bulk delete multiple photos
export const deletePhotos = async (ids: string[]): Promise<void> => {
  const photos = await getPhotos();
  const photosToDelete = photos.filter(p => ids.includes(p.id));

  // Delete files
  for (const photo of photosToDelete) {
    try {
      const cleanPath = photo.uri.replace('file://', '');
      if (await RNFS.exists(cleanPath)) {
        await RNFS.unlink(cleanPath);
      }
    } catch (e) {
      console.warn('Failed to delete file:', e);
    }
  }

  const updatedPhotos = photos.filter(p => !ids.includes(p.id));
  await AsyncStorage.setItem(PHOTOS_KEY, JSON.stringify(updatedPhotos));
};

// Video Management
export const saveVideo = async (
  path: string,
  duration: number
): Promise<Video> => {
  const timestamp = Date.now();
  const videoPath = path.startsWith('file://') ? path : `file://${path}`;

  // Copy video to app's documents directory for persistence
  const cleanPath = path.startsWith('file://') ? path.replace('file://', '') : path;
  const newPath = `${RNFS.DocumentDirectoryPath}/video_${timestamp}.mov`;

  try {
    await RNFS.copyFile(cleanPath, newPath);
    console.log('Video copied to:', newPath);
  } catch (e) {
    console.error('Failed to copy video:', e);
    throw e;
  }

  const newVideo: Video = {
    id: timestamp.toString(),
    uri: `file://${newPath}`,
    date: new Date().toISOString(),
    duration,
  };

  const existingVideosJson = await AsyncStorage.getItem(VIDEOS_KEY);
  const existingVideos: Video[] = existingVideosJson ? JSON.parse(existingVideosJson) : [];

  const updatedVideos = [newVideo, ...existingVideos];
  await AsyncStorage.setItem(VIDEOS_KEY, JSON.stringify(updatedVideos));

  console.log('Video saved to gallery:', newVideo.uri);
  return newVideo;
};

export const getVideos = async (): Promise<Video[]> => {
  const videosJson = await AsyncStorage.getItem(VIDEOS_KEY);
  if (!videosJson) return [];

  const videos: Video[] = JSON.parse(videosJson);

  // Check which videos still exist on disk
  const validVideos: Video[] = [];

  for (const video of videos) {
    const cleanPath = video.uri.replace('file://', '');
    const exists = await RNFS.exists(cleanPath);
    if (exists) {
      validVideos.push(video);
    }
  }

  // Update storage if any were removed
  if (validVideos.length !== videos.length) {
    await AsyncStorage.setItem(VIDEOS_KEY, JSON.stringify(validVideos));
  }

  return validVideos;
};

export const deleteVideo = async (id: string): Promise<void> => {
  const videos = await getVideos();
  const videoToDelete = videos.find(v => v.id === id);

  if (videoToDelete) {
    try {
      const cleanPath = videoToDelete.uri.replace('file://', '');
      if (await RNFS.exists(cleanPath)) {
        await RNFS.unlink(cleanPath);
      }
    } catch (e) {
      console.warn('Failed to delete video file:', e);
    }
  }

  const updatedVideos = videos.filter(v => v.id !== id);
  await AsyncStorage.setItem(VIDEOS_KEY, JSON.stringify(updatedVideos));
};
