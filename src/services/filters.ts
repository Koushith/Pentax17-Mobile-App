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

// Kodak Vision3 250D: Cinema daylight film
export const KODAK_250D: FilmStock = {
  id: 'kodak_250d',
  name: 'Kodak Vision3 250D',
  label: '250D',
  matrix: [
    1.08, 0.04, -0.02, 0.0, 0.02,
    -0.02, 1.04, 0.02, 0.0, 0.01,
    -0.04, 0.0, 0.92, 0.0, 0.03,
    0.0, 0.0, 0.0, 1.0, 0
  ], // Warm daylight cinema look with slight orange shift, muted blues
  overlayColor: 'rgba(255, 210, 170, 0.05)',
  grain: 0.06,
  isBlackAndWhite: false,
  description: 'Cinema daylight film, warm natural tones',
};

export const FILM_STOCKS: FilmStock[] = [
  KODAK_GOLD_200,
  KODAK_250D,
];

export const getFilmStockById = (id: string): FilmStock => {
  return FILM_STOCKS.find(f => f.id === id) || KODAK_GOLD_200;
};
