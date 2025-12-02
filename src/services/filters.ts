export type FilmStock = {
  id: string;
  name: string;
  label: string;
  matrix: number[];
  overlayColor: string; // For live preview approximation
};

// Kodak Gold 200: Warm, Golden, Nostalgic
// Boosts Reds and Yellows, slightly fades blue shadows
export const KODAK_GOLD_200: FilmStock = {
  id: 'kodak_gold_200',
  name: 'Kodak Gold 200',
  label: 'GOLD 200',
  matrix: [
    1.15, 0.05, 0.0, 0.0, 0,   // Red channel boost
    0.0, 1.05, 0.0, 0.0, 0,   // Green channel slight boost
    0.0, 0.05, 0.9, 0.0, 0,   // Blue channel cut (warmer)
    0.0, 0.0, 0.0, 1.0, 0
  ],
  overlayColor: 'rgba(255, 230, 180, 0.15)', // Warm Golden Tint
};

// Fujifilm Superia 400: Punchy, Green/Magenta shifts, Cool
// Boosts Greens, slightly Cyan shadows, Magenta highlights
export const FUJI_SUPERIA_400: FilmStock = {
  id: 'fuji_superia_400',
  name: 'Fujifilm Superia 400',
  label: 'SUPERIA 400',
  matrix: [
    0.95, 0.0, 0.05, 0.0, 0,   // Red channel slight cut
    0.0, 1.1, 0.0, 0.0, 0,    // Green channel boost (Fuji greens)
    0.0, 0.0, 1.05, 0.0, 0,   // Blue channel slight boost
    0.0, 0.0, 0.0, 1.0, 0
  ],
  overlayColor: 'rgba(200, 255, 220, 0.15)', // Cool Greenish Tint
};

export const FILM_STOCKS = [KODAK_GOLD_200, FUJI_SUPERIA_400];
