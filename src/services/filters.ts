export type FilmStock = {
  id: string;
  name: string;
  label: string;
  matrix: number[];
  overlayColor: string;
  grain: number; // 0-1 grain intensity
  isBlackAndWhite: boolean;
  description: string;
};

// Kodak Gold 200: Warm, Golden, Nostalgic
export const KODAK_GOLD_200: FilmStock = {
  id: 'kodak_gold_200',
  name: 'Kodak Gold 200',
  label: 'GOLD 200',
  matrix: [
    1.15, 0.05, 0.0, 0.0, 0.04,
    0.0, 1.05, 0.0, 0.0, 0.02,
    0.0, 0.05, 0.85, 0.0, 0,
    0.0, 0.0, 0.0, 1.0, 0
  ],
  overlayColor: 'rgba(255, 200, 120, 0.12)',
  grain: 0.15,
  isBlackAndWhite: false,
  description: 'Warm golden tones, perfect for sunny days',
};

// Kodak Portra 400: Natural skin tones, soft pastels
export const KODAK_PORTRA_400: FilmStock = {
  id: 'kodak_portra_400',
  name: 'Kodak Portra 400',
  label: 'PORTRA 400',
  matrix: [
    1.05, 0.02, 0.0, 0.0, 0.02,
    0.0, 1.02, 0.02, 0.0, 0.02,
    0.0, 0.0, 1.0, 0.0, 0.04,
    0.0, 0.0, 0.0, 1.0, 0
  ],
  overlayColor: 'rgba(255, 220, 200, 0.08)',
  grain: 0.1,
  isBlackAndWhite: false,
  description: 'Natural skin tones, creamy pastels',
};

// Kodak Ektar 100: Vivid colors, high saturation
export const KODAK_EKTAR_100: FilmStock = {
  id: 'kodak_ektar_100',
  name: 'Kodak Ektar 100',
  label: 'EKTAR 100',
  matrix: [
    1.2, 0.0, 0.0, 0.0, 0,
    0.0, 1.15, 0.0, 0.0, 0,
    0.0, 0.0, 1.2, 0.0, 0,
    0.0, 0.0, 0.0, 1.0, 0
  ],
  overlayColor: 'rgba(255, 100, 100, 0.06)',
  grain: 0.05,
  isBlackAndWhite: false,
  description: 'Ultra-vivid colors, fine grain',
};

// Fujifilm Superia 400: Punchy greens, cool shadows
export const FUJI_SUPERIA_400: FilmStock = {
  id: 'fuji_superia_400',
  name: 'Fujifilm Superia 400',
  label: 'SUPERIA 400',
  matrix: [
    0.95, 0.0, 0.05, 0.0, 0,
    0.0, 1.12, 0.0, 0.0, 0.02,
    0.0, 0.0, 1.08, 0.0, 0.02,
    0.0, 0.0, 0.0, 1.0, 0
  ],
  overlayColor: 'rgba(180, 255, 200, 0.1)',
  grain: 0.12,
  isBlackAndWhite: false,
  description: 'Punchy greens, cool shadows',
};

// CineStill 800T: Cinematic tungsten, teal/orange
export const CINESTILL_800T: FilmStock = {
  id: 'cinestill_800t',
  name: 'CineStill 800T',
  label: '800T',
  matrix: [
    1.1, 0.0, 0.1, 0.0, 0,
    0.05, 0.95, 0.1, 0.0, 0,
    0.0, 0.1, 1.15, 0.0, 0.06,
    0.0, 0.0, 0.0, 1.0, 0
  ],
  overlayColor: 'rgba(100, 180, 255, 0.12)',
  grain: 0.2,
  isBlackAndWhite: false,
  description: 'Cinematic tungsten look, halation glow',
};

// Ilford HP5 Plus: Classic B&W
export const ILFORD_HP5: FilmStock = {
  id: 'ilford_hp5',
  name: 'Ilford HP5 Plus',
  label: 'HP5 PLUS',
  matrix: [
    0.299, 0.587, 0.114, 0.0, 0,
    0.299, 0.587, 0.114, 0.0, 0,
    0.299, 0.587, 0.114, 0.0, 0,
    0.0, 0.0, 0.0, 1.0, 0
  ],
  overlayColor: 'rgba(255, 255, 255, 0.05)',
  grain: 0.25,
  isBlackAndWhite: true,
  description: 'Classic black & white, rich contrast',
};

export const FILM_STOCKS: FilmStock[] = [
  KODAK_GOLD_200,
  KODAK_PORTRA_400,
  KODAK_EKTAR_100,
  FUJI_SUPERIA_400,
  CINESTILL_800T,
  ILFORD_HP5,
];

export const getFilmStockById = (id: string): FilmStock => {
  return FILM_STOCKS.find(f => f.id === id) || KODAK_GOLD_200;
};
