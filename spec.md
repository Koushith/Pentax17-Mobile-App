# CamApp - Pentax 17 Film Camera Emulator

## Status Legend
- **✅ Done / Spec Locked** – Finalized for v1 implementation  
- **🟡 Planned / Advanced** – Next versions, not required for first build  
- **⚪ Idea / Optional Future** – Nice-to-have, not required

---

# Overview ✅ (Spec Locked)

A premium **bare React Native** mobile app that faithfully emulates the shooting experience of a **Pentax 17 half-frame film camera**. Offline-first, purely local. No backend, no social, no authentication required.

The app mimics:
- Pentax 17 **half-frame format**
- **Film stock simulation**
- **Vintage UI**
- **Mechanical tactile experience**

Platform: **iOS & Android**  
Stack: **React Native (bare), TypeScript**

---

# Core Features

## 1. Camera System ✅ (Spec Locked)

### Half-Frame Format
- **Aspect Ratio: 2:3 vertical**
- Center-cropped live preview & final captures
- Matte-style frame mask to visually enforce composition

### Camera Controls
- **Shutter Button:** Large, center, tactile (press animation + haptics)
- **Flash Toggle:** Off / Auto / On
- **Camera Flip:** Rear ↔ Front camera
- **Film Stock Selector:** Tap to cycle film looks (realtime filter swap)

### Frame Counter
- Virtual **36-frame roll**
- UI showing e.g. `"15/36"`
- On roll completion: “Reload” prompt
- Reset counter when new roll begins

---

## 2. Film Stock Simulation Pipeline ✅ (Spec Locked)

Each stock uses a **Skia color matrix / LUT** + effects:

| Film Stock | Notes |
|------------|-------|
| **Kodak Gold 200** | Warm, nostalgic, golden highlights |
| **Kodak Portra 400** | Soft pastels, natural skin |
| **Kodak Ektar 100** | Sharp color, high saturation |
| **Fujifilm Superia 400** | Cool greens, crunchy texture |
| **CineStill 800T** | Tungsten color, teal/orange, halation |
| **Ilford HP5 Plus** | Classic B&W, grainy, high contrast |

### Realtime Filter Effects
- **Crop to 2:3**
- **Color Matrix / LUT**
- **Vignette:** Subtle radial edge darkening
- **Grain:** Animated per-frame noise texture
- **Halation:** CineStill highlight bloom
- **Softness:** Gentle bloom/blur mix to reduce digital sharpness

> All effects implemented via **Skia**, GPU-accelerated. No JS pixel loops.

---

## 3. Date Stamp System ✅ (Spec Locked)

- Retro amber LCD timestamp
- Format: `'YY MM DD` → `'24 12 02`
- Position: bottom-right (in-frame)
- Toggle via UI: `📅 ON/OFF`
- Rendered via Skia at final image pipeline, not overlay UI layer

---

## 4. Gallery System (Local Only) ✅ (Spec Locked)

### Grid View
- 3-column grid of thumbnails
- Uses saved half-frame ratio for consistency
- Sorted newest → oldest
- Lazy load thumbnails

### Grouping (Optional)
- Group photos by “virtual film roll”
- Headers like: `Roll #3 – Portra 400`

---

## 5. Photo Viewer Screen ✅ (Spec Locked)

### Display
- Full-screen photo
- Dark background
- Pinch zoom
- Drag / pan

### Actions
- **Share** → native share sheet
- **Delete** → confirmation modal
- **Edit**:
  - brightness
  - contrast
  - exposure
  - crop/rotate
  - reapply film stock
- **Info sheet**:
  - Date captured
  - Film stock
  - Resolution
  - Roll ID
  - Frame #

Edit mode uses Skia reprocessing.

---

## 6. Audio Feedback System ✅ (Spec Locked)

- Shutter sound (mechanical)
- Film advance sound after capture
- UI button clicks (optional)
- Toggleable in Settings

Library: `react-native-sound`

---

# UI / UX Design (Locked)

## Visual Theme
- Dark minimal aesthetic
- Warm gold accents
- Monospace film-era fonts

### Colors
- Background: `#0A0A0A`
- Surface: `#1A1A1A`
- Accent: `#FFD700`
- Text: `#E0E0E0`
- Danger: `#FF4444`

---

# Screen Layouts

## Camera Screen