# CamApp - Vintage Film Camera

A bare React Native mobile app that emulates the look and vibe of a Pentax 17 film camera shooting Kodak Gold 200.

## Tech Stack

- **Framework:** React Native (CLI)
- **Language:** TypeScript
- **Camera:** `react-native-vision-camera`
- **Filters:** `@shopify/react-native-skia`
- **Navigation:** React Navigation
- **Storage:** `react-native-fs`, `@react-native-async-storage/async-storage`

## Setup Instructions

### Prerequisites

- Node.js
- Watchman
- Xcode (for iOS)
- Android Studio (for Android)
- CocoaPods

### Installation

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **iOS Setup:**
    ```bash
    cd ios
    pod install
    cd ..
    ```

3.  **Android Setup:**
    - Ensure you have the Android SDK and Emulator setup.

### Running the App

- **iOS:**
    ```bash
    npx react-native run-ios
    ```

- **Android:**
    ```bash
    npx react-native run-android
    ```

## Performance Tuning

- The app uses `@shopify/react-native-skia` for live filters.
- If performance is low, consider reducing the complexity of the Skia shader or adjusting the camera resolution in `CameraScreen.tsx`.

## Architecture

- `src/screens`: Application screens (Camera, Gallery, PhotoViewer).
- `src/services`: Business logic (Storage).
- `src/types`: TypeScript definitions.
# Pentax17-Mobile-App
