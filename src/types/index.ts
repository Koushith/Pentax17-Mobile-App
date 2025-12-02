export interface Photo {
  id: string;
  uri: string;
  date: string;
  width: number;
  height: number;
}

export type RootStackParamList = {
  Camera: undefined;
  Gallery: undefined;
  PhotoViewer: { photo: Photo };
};
