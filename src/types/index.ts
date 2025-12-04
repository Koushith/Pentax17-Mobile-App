export interface Photo {
  id: string;
  uri: string;
  date: string;
  width: number;
  height: number;
  filmStock: string;
  hasDateStamp: boolean;
  frameNumber: number;
  rollId: string;
}

export interface Video {
  id: string;
  uri: string;
  date: string;
  duration: number;
}

export interface FilmRoll {
  id: string;
  startDate: string;
  frameCount: number;
  maxFrames: number;
  filmStock: string;
}

export interface AppSettings {
  dateStampEnabled: boolean;
  soundEnabled: boolean;
  currentRollId: string;
  currentFrameNumber: number;
  highQuality: boolean;
  showGrid: boolean;
  saveToLibrary: boolean;
}

export type FlashMode = 'off' | 'on' | 'auto';

export type CameraPosition = 'back' | 'front';

export type RootStackParamList = {
  Camera: undefined;
  Gallery: undefined;
  PhotoViewer: { photo: Photo };
  VideoViewer: { video: Video };
  FilmPicker: undefined;
  Settings: undefined;
};

// Theme colors
export const COLORS = {
  background: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceLight: '#2A2A2A',
  accent: '#FFD700',
  accentDim: '#B8960F',
  text: '#E0E0E0',
  textDim: '#888888',
  danger: '#FF4444',
  success: '#44FF88',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.6)',
  dateStamp: '#FF6B35',
};
