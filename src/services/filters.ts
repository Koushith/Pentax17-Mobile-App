export type FilmStock = {
  id: string;
  name: string;
  label: string;
  matrix: number[];
  overlayColor: string;
  grain: number; // 0-1 grain intensity
  isBlackAndWhite: boolean;
  description: string;
  lutFile?: string; // Optional LUT file for color grading
};

// // Kodak Gold 200: Warm, Golden, Nostalgic
// export const KODAK_GOLD_200: FilmStock = {
//   id: 'kodak_gold_200',
//   name: 'Kodak Gold 200',
//   label: 'GOLD 200',
//   matrix: [
//     1.15, 0.05, 0.0, 0.0, 0.04,
//     0.0, 1.05, 0.0, 0.0, 0.02,
//     0.0, 0.05, 0.85, 0.0, 0,
//     0.0, 0.0, 0.0, 1.0, 0
//   ],
//   overlayColor: 'rgba(255, 200, 120, 0.12)',
//   grain: 0.15,
//   isBlackAndWhite: false,
//   description: 'Warm golden tones, perfect for sunny days',
// };

// Kodak Vision3 250D: Cinema daylight film with LUT
export const KODAK_250D: FilmStock = {
  id: 'kodak_250d',
  name: 'Kodak Vision3 250D',
  label: '250D',
  matrix: [
    1.0, 0.0, 0.0, 0.0, 0,
    0.0, 1.0, 0.0, 0.0, 0,
    0.0, 0.0, 1.0, 0.0, 0,
    0.0, 0.0, 0.0, 1.0, 0
  ],
  overlayColor: 'rgba(255, 180, 100, 0.12)', // Warm golden cinema tint
  grain: 0.04,
  isBlackAndWhite: false,
  description: 'Cinema daylight film',
  lutFile: 'kodak-250D.cube',
};

// Moonrise Kingdom: Wes Anderson style warm vintage look
export const MOONRISE_KINGDOM: FilmStock = {
  id: 'moonrise_kingdom',
  name: 'Moonrise Kingdom',
  label: 'MOONRISE',
  matrix: [
    1.0, 0.0, 0.0, 0.0, 0,
    0.0, 1.0, 0.0, 0.0, 0,
    0.0, 0.0, 1.0, 0.0, 0,
    0.0, 0.0, 0.0, 1.0, 0
  ],
  overlayColor: 'rgba(255, 200, 120, 0.15)', // Warm yellow Wes Anderson tint
  grain: 0.03,
  isBlackAndWhite: false,
  description: 'Wes Anderson warm vintage',
  lutFile: 'moonrise-kingdom.cube',
};

// Vintage Overlay: Classic faded vintage look
export const VINTAGE_OVERLAY: FilmStock = {
  id: 'vintage_overlay',
  name: 'Vintage Overlay',
  label: 'VINTAGE',
  matrix: [
    1.0, 0.0, 0.0, 0.0, 0,
    0.0, 1.0, 0.0, 0.0, 0,
    0.0, 0.0, 1.0, 0.0, 0,
    0.0, 0.0, 0.0, 1.0, 0
  ],
  overlayColor: 'rgba(200, 180, 140, 0.18)', // Faded sepia vintage tint
  grain: 0.05,
  isBlackAndWhite: false,
  description: 'Classic faded vintage',
  lutFile: 'vintage-overlay.cube',
};

// Clean Raw: Natural clean look with enhanced detail
export const CLEAN_RAW: FilmStock = {
  id: 'clean_raw',
  name: 'Clean Raw',
  label: 'CLEAN',
  matrix: [
    1.0, 0.0, 0.0, 0.0, 0,
    0.0, 1.0, 0.0, 0.0, 0,
    0.0, 0.0, 1.0, 0.0, 0,
    0.0, 0.0, 0.0, 1.0, 0
  ],
  overlayColor: 'rgba(220, 240, 255, 0.08)', // Very subtle cool/clean tint
  grain: 0.02,
  isBlackAndWhite: false,
  description: 'Natural clean look',
  lutFile: 'clean-raw.cube',
};

export const FILM_STOCKS: FilmStock[] = [
  KODAK_250D,
  MOONRISE_KINGDOM,
  VINTAGE_OVERLAY,
  CLEAN_RAW,
];

export const getFilmStockById = (id: string): FilmStock => {
  return FILM_STOCKS.find(f => f.id === id) || KODAK_250D;
};
