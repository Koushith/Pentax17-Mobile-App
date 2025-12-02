# CamApp - Pentax 17 Film Camera Emulator

A premium React Native mobile app that faithfully emulates the shooting experience of a **Pentax 17 half-frame film camera**. Capture the nostalgic aesthetic of analog photography with authentic film stock simulations and a beautifully crafted retro UI.

## Features

### Camera
- **Half-Frame Format** - Authentic 2:3 vertical aspect ratio (17×24mm)
- **6 Film Stock Simulations** - Kodak Gold 200, Portra 400, Ektar 100, Fuji Superia 400, CineStill 800T, Ilford HP5
- **Flash Control** - Off / Auto / On modes
- **Front/Back Camera** - Switch between cameras
- **Frame Counter** - 36-exposure roll simulation with progress bar
- **Date Stamp** - Optional retro date stamp on photos
- **Live Preview Filter** - See film effect before shooting
- **Viewfinder Grid** - Rule of thirds composition aid

### Gallery
- **Grid View** - 3-column layout with half-frame thumbnails
- **Photo Stats** - Total photos and rolls counter
- **Pull to Refresh** - Refresh photo list
- **Empty State** - Beautiful film roll illustration
- **Film Indicator** - Color dot shows film stock used

### Photo Viewer
- **Full Screen View** - Tap to toggle controls
- **Share** - Native sharing with film stock credit
- **Edit** - Reprocess with different film stock
- **Delete** - With confirmation
- **Photo Info** - Date, frame number, film details, dimensions

### Film Stocks

| Film | Description |
|------|-------------|
| Kodak Gold 200 | Warm golden tones, nostalgic feel |
| Kodak Portra 400 | Natural skin tones, creamy pastels |
| Kodak Ektar 100 | Ultra-vivid colors, fine grain |
| Fujifilm Superia 400 | Punchy greens, cool shadows |
| CineStill 800T | Cinematic tungsten, teal/orange |
| Ilford HP5 Plus | Classic black & white, rich contrast |

## Tech Stack

- **Framework:** React Native CLI
- **Language:** TypeScript
- **Camera:** `react-native-vision-camera`
- **Image Processing:** `@shopify/react-native-skia`
- **Navigation:** React Navigation 7
- **Storage:** `react-native-fs`, `@react-native-async-storage/async-storage`
- **Gallery:** `@react-native-camera-roll/camera-roll`

## Setup

### Prerequisites

- Node.js 18+
- Watchman
- Xcode 15+ (iOS)
- Android Studio (Android)
- CocoaPods

### Installation

```bash
# Install dependencies
npm install

# iOS setup
cd ios && pod install && cd ..
```

### Running

```bash
# iOS
npx react-native run-ios

# Android
npx react-native run-android
```

## Architecture

```
src/
├── screens/
│   ├── CameraScreen.tsx    # Main camera with controls
│   ├── GalleryScreen.tsx   # Photo grid view
│   └── PhotoViewerScreen.tsx # Full photo view + edit
├── services/
│   ├── filters.ts          # Film stock definitions
│   ├── processor.ts        # Skia image processing
│   └── storage.ts          # Photo & settings storage
└── types/
    └── index.ts            # TypeScript interfaces
```

## Image Processing Pipeline

1. Capture photo via Vision Camera
2. Crop to half-frame aspect ratio (2:3 vertical)
3. Apply film stock color matrix
4. Add vignette effect
5. Add film grain (optional)
6. Add date stamp (optional)
7. Encode to JPEG (92% quality)
8. Save to Camera Roll + internal storage

## Design

- **Theme:** Dark mode with gold accent (#FFD700)
- **Typography:** System fonts with mechanical styling
- **UI:** Retro camera-inspired controls

## License

MIT
