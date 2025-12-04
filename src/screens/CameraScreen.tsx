import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  Alert,
  Linking,
  Modal,
  FlatList,
  ActivityIndicator,
  Animated,
  Vibration,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
// Safe import of geolocation - will gracefully handle if not available
let Geolocation: any = null;
try {
  Geolocation = require('react-native-geolocation-service').default;
} catch (e) {
  console.log('Geolocation not available');
}
import { RootStackParamList, FlashMode, CameraPosition, COLORS } from '../types';
import { savePhoto, getSettings, saveSettings } from '../services/storage';
import { processAndSavePhoto } from '../services/processor';
import { FILM_STOCKS, FilmStock, getFilmStockById } from '../services/filters';
// Note: Full LUT processing happens during photo capture via processor.ts
// Real-time preview uses color overlay approximation

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const HALF_FRAME_RATIO = 2 / 3;
const VIEWFINDER_WIDTH = SCREEN_WIDTH - 40;
const VIEWFINDER_HEIGHT = VIEWFINDER_WIDTH / HALF_FRAME_RATIO;

type CameraScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Camera'>;

// Icon Components
const FlashIcon = ({ mode }: { mode: FlashMode }) => (
  <View style={iconStyles.flashContainer}>
    <View style={iconStyles.flashBolt} />
    <View style={iconStyles.flashBase} />
    {mode === 'off' && <View style={iconStyles.flashSlash} />}
    {mode === 'auto' && <Text style={iconStyles.flashAuto}>A</Text>}
  </View>
);

const GalleryIcon = () => (
  <View style={iconStyles.galleryContainer}>
    <View style={iconStyles.galleryFrame} />
    <View style={iconStyles.galleryFrame2} />
  </View>
);

const FlipIcon = () => (
  <View style={iconStyles.flipContainer}>
    <View style={iconStyles.flipCamera}>
      <View style={iconStyles.flipLens} />
    </View>
    <View style={iconStyles.flipArrowTop} />
    <View style={iconStyles.flipArrowBottom} />
  </View>
);

const DateIcon = ({ active }: { active: boolean }) => (
  <View style={[iconStyles.dateContainer, active && iconStyles.dateActive]}>
    <View style={iconStyles.dateTop} />
    <View style={iconStyles.dateBody}>
      <Text style={[iconStyles.dateText, active && iconStyles.dateTextActive]}>31</Text>
    </View>
  </View>
);

const PolaroidIcon = ({ active }: { active: boolean }) => (
  <View style={[iconStyles.polaroidContainer, active && iconStyles.polaroidActive]}>
    <View style={iconStyles.polaroidTop} />
    <View style={iconStyles.polaroidImage} />
    <View style={iconStyles.polaroidBottom} />
  </View>
);

const SettingsIcon = () => (
  <View style={iconStyles.settingsContainer}>
    <View style={iconStyles.sliderRow}>
      <View style={iconStyles.sliderLine} />
      <View style={[iconStyles.sliderDot, { left: 4 }]} />
    </View>
    <View style={iconStyles.sliderRow}>
      <View style={iconStyles.sliderLine} />
      <View style={[iconStyles.sliderDot, { right: 4 }]} />
    </View>
    <View style={iconStyles.sliderRow}>
      <View style={iconStyles.sliderLine} />
      <View style={[iconStyles.sliderDot, { left: 8 }]} />
    </View>
  </View>
);

export default function CameraScreen() {
  const navigation = useNavigation<CameraScreenNavigationProp>();
  const device = useCameraDevice('back');
  const frontDevice = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();
  const camera = useRef<Camera>(null);

  const [cameraPosition, setCameraPosition] = useState<CameraPosition>('back');
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [selectedFilmId, setSelectedFilmId] = useState(FILM_STOCKS[0].id);
  const [dateStampEnabled, setDateStampEnabled] = useState(false);
  const [polaroidEnabled, setPolaroidEnabled] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<string | undefined>(undefined);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);

  const [showFilmPicker, setShowFilmPicker] = useState(false);
  const shutterScale = useRef(new Animated.Value(1)).current;

  const selectedFilm = getFilmStockById(selectedFilmId);
  const currentDevice = cameraPosition === 'back' ? device : frontDevice;

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  const loadSettings = async () => {
    const settings = await getSettings();
    setDateStampEnabled(settings.dateStampEnabled);
  };

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  // Request location permission at startup
  useEffect(() => {
    const requestAllPermissions = async () => {
      if (Geolocation) {
        try {
          await requestLocationPermission();
        } catch (e) {
          console.log('Location permission request failed:', e);
        }
      }
    };
    requestAllPermissions();
  }, []);

  // Get location when Polaroid mode is enabled
  useEffect(() => {
    if (polaroidEnabled) {
      getLocation();
    }
  }, [polaroidEnabled]);

  const requestLocationPermission = async (): Promise<boolean> => {
    if (!Geolocation) return false;

    if (Platform.OS === 'ios') {
      const status = await Geolocation.requestAuthorization('whenInUse');
      return status === 'granted';
    } else {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
  };

  const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14`
      );
      const data = await response.json();

      if (data.address) {
        const { city, town, village, suburb, county, state, country } = data.address;
        const place = city || town || village || suburb || county;
        const region = state || country;

        if (place && region) {
          return `${place}, ${region}`;
        } else if (place) {
          return place;
        } else if (region) {
          return region;
        }
      }
      return 'Unknown Location';
    } catch (error) {
      console.log('Reverse geocode error:', error);
      return 'Unknown Location';
    }
  };

  const getLocation = async () => {
    if (!Geolocation) {
      setLocationPermissionDenied(true);
      setCurrentLocation(undefined);
      return;
    }

    try {
      const hasPermission = await requestLocationPermission();

      if (!hasPermission) {
        setLocationPermissionDenied(true);
        setCurrentLocation(undefined);
        return;
      }

      setLocationPermissionDenied(false);

      Geolocation.getCurrentPosition(
        async (position: { coords: { latitude: number; longitude: number } }) => {
          const { latitude, longitude } = position.coords;
          const locationName = await reverseGeocode(latitude, longitude);
          setCurrentLocation(locationName);
        },
        (error: { code: number; message: string }) => {
          console.log('Geolocation error:', error);
          setCurrentLocation(undefined);
        },
        {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 60000,
        }
      );
    } catch (error) {
      console.log('Location not available:', error);
      setCurrentLocation(undefined);
    }
  };

  const animateShutter = () => {
    Animated.sequence([
      Animated.timing(shutterScale, {
        toValue: 0.9,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shutterScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const onTakePhoto = async () => {
    if (!camera.current || isTakingPhoto || isProcessing) return;

    setIsTakingPhoto(true);
    animateShutter();
    Vibration.vibrate(10);

    try {
      const photo = await camera.current.takePhoto({
        flash: flashMode,
        enableShutterSound: true,
      });

      setIsProcessing(true);
      setIsTakingPhoto(false);

      // Get location for Polaroid frame (no fallback - just show date/time if no location)
      const getLocation = (): string | undefined => {
        if (!polaroidEnabled) return undefined;
        if (currentLocation) return currentLocation;
        // No location available - don't show location line
        return undefined;
      };

      const processedResult = await processAndSavePhoto(photo.path, {
        filmId: selectedFilmId,
        addDateStamp: dateStampEnabled,
        addGrain: true,
        addPolaroidFrame: polaroidEnabled,
        location: getLocation(),
      });

      await savePhoto(
        processedResult.path,
        processedResult.width || photo.width,
        processedResult.height || photo.height,
        selectedFilmId,
        dateStampEnabled,
        0,
        ''
      );

    } catch (e) {
      console.error('Failed to take photo', e);
      Alert.alert('Error', 'Failed to capture photo');
    } finally {
      setIsTakingPhoto(false);
      setIsProcessing(false);
    }
  };

  const toggleFlash = () => {
    const modes: FlashMode[] = ['off', 'auto', 'on'];
    const currentIndex = modes.indexOf(flashMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setFlashMode(modes[nextIndex]);
  };

  const toggleCamera = () => {
    setCameraPosition(prev => prev === 'back' ? 'front' : 'back');
  };

  const toggleDateStamp = async () => {
    const newValue = !dateStampEnabled;
    setDateStampEnabled(newValue);
    // If enabling date stamp, disable polaroid (they're mutually exclusive)
    if (newValue) {
      setPolaroidEnabled(false);
    }
    await saveSettings({ dateStampEnabled: newValue });
  };

  const togglePolaroid = () => {
    const newValue = !polaroidEnabled;
    setPolaroidEnabled(newValue);
    // If enabling polaroid, disable date stamp (they're mutually exclusive)
    if (newValue) {
      setDateStampEnabled(false);
    }
  };

  const selectFilm = (film: FilmStock) => {
    setSelectedFilmId(film.id);
    setShowFilmPicker(false);
  };

  if (!hasPermission) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionCard}>
          <View style={styles.permissionIconContainer}>
            <View style={styles.cameraIconBody}>
              <View style={styles.cameraIconLens} />
            </View>
          </View>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            CamApp needs camera access to capture photos.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={() => Linking.openSettings()}>
            <Text style={styles.permissionButtonText}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!currentDevice) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No camera device found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={currentDevice}
        isActive={true}
        photo={true}
      />

      {/* Color overlay for filter preview approximation */}
      {selectedFilm.overlayColor && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: selectedFilm.overlayColor }]} pointerEvents="none" />
      )}

      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity onPress={toggleFlash} style={styles.topButton}>
            <FlashIcon mode={flashMode} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => setShowFilmPicker(true)} style={styles.filmBadge}>
          <Text style={styles.filmBadgeLabel}>FILM</Text>
          <Text style={styles.filmBadgeName}>{selectedFilm.label}</Text>
        </TouchableOpacity>

        <View style={styles.topBarRight}>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.topButton}>
            <SettingsIcon />
          </TouchableOpacity>
        </View>
      </View>

      {/* Viewfinder Frame */}
      <View style={styles.viewfinderContainer} pointerEvents="none">
        <View style={styles.viewfinderFrame}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
          <View style={styles.focusPoint}>
            <View style={styles.focusPointInner} />
          </View>
          <View style={styles.gridLineH1} />
          <View style={styles.gridLineH2} />
          <View style={styles.gridLineV1} />
          <View style={styles.gridLineV2} />
        </View>
      </View>

      {/* Bottom Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.controlsBackground} />

        {/* Photo Options */}
        <View style={styles.photoOptions}>
          <TouchableOpacity onPress={toggleDateStamp} style={styles.optionButton}>
            <DateIcon active={dateStampEnabled} />
            <Text style={[styles.optionLabel, dateStampEnabled && styles.optionLabelActive]}>
              DATE
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={togglePolaroid} style={styles.optionButton}>
            <PolaroidIcon active={polaroidEnabled} />
            <Text style={[styles.optionLabel, polaroidEnabled && styles.optionLabelActive]}>
              FRAME
            </Text>
          </TouchableOpacity>
        </View>

        {/* Main Controls */}
        <View style={styles.controlsContent}>
          <TouchableOpacity onPress={() => navigation.navigate('Gallery')} style={styles.sideButton}>
            <View style={styles.galleryButtonOuter}>
              <GalleryIcon />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onTakePhoto}
            disabled={isTakingPhoto || isProcessing}
            activeOpacity={0.8}
          >
            <Animated.View style={[styles.shutterButton, { transform: [{ scale: shutterScale }] }]}>
              <View style={styles.shutterOuter}>
                <View style={styles.shutterMiddle}>
                  <View style={[
                    styles.shutterInner,
                    (isTakingPhoto || isProcessing) && styles.shutterInnerDisabled
                  ]}>
                    {isProcessing && (
                      <ActivityIndicator color={COLORS.surface} size="small" />
                    )}
                  </View>
                </View>
              </View>
            </Animated.View>
          </TouchableOpacity>

          <TouchableOpacity onPress={toggleCamera} style={styles.sideButton}>
            <View style={styles.flipButtonOuter}>
              <FlipIcon />
            </View>
          </TouchableOpacity>
        </View>

      </View>


      {/* Film Picker Modal */}
      <Modal visible={showFilmPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.filmPickerContainer}>
            <View style={styles.filmPickerHeader}>
              <Text style={styles.filmPickerTitle}>SELECT FILM</Text>
              <TouchableOpacity onPress={() => setShowFilmPicker(false)} style={styles.closeButton}>
                <View style={styles.closeX}>
                  <View style={styles.closeLine1} />
                  <View style={styles.closeLine2} />
                </View>
              </TouchableOpacity>
            </View>

            <FlatList
              data={FILM_STOCKS}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.filmOption,
                    item.id === selectedFilmId && styles.filmOptionSelected
                  ]}
                  onPress={() => selectFilm(item)}
                >
                  <View style={[styles.filmSwatch, { backgroundColor: item.isBlackAndWhite ? '#666' : item.overlayColor.replace('0.', '0.6') }]}>
                    {item.isBlackAndWhite && <Text style={styles.filmSwatchBW}>B/W</Text>}
                  </View>
                  <View style={styles.filmInfo}>
                    <Text style={styles.filmName}>{item.name}</Text>
                    <Text style={styles.filmDescription}>{item.description}</Text>
                  </View>
                  {item.id === selectedFilmId && (
                    <View style={styles.checkMark}>
                      <View style={styles.checkShort} />
                      <View style={styles.checkLong} />
                    </View>
                  )}
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.filmList}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const iconStyles = StyleSheet.create({
  flashContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashBolt: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: COLORS.text,
    marginBottom: -2,
  },
  flashBase: {
    width: 6,
    height: 4,
    backgroundColor: COLORS.text,
  },
  flashSlash: {
    position: 'absolute',
    width: 24,
    height: 2,
    backgroundColor: COLORS.danger,
    transform: [{ rotate: '-45deg' }],
  },
  flashAuto: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    fontSize: 8,
    fontWeight: '900',
    color: COLORS.accent,
  },
  galleryContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryFrame: {
    width: 18,
    height: 14,
    borderWidth: 2,
    borderColor: COLORS.text,
    borderRadius: 2,
    position: 'absolute',
  },
  galleryFrame2: {
    width: 14,
    height: 10,
    borderWidth: 2,
    borderColor: COLORS.textDim,
    borderRadius: 2,
    position: 'absolute',
    top: 2,
    left: 2,
  },
  flipContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipCamera: {
    width: 14,
    height: 10,
    borderWidth: 2,
    borderColor: COLORS.text,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipLens: {
    width: 4,
    height: 4,
    borderRadius: 2,
    borderWidth: 1.5,
    borderColor: COLORS.text,
  },
  flipArrowTop: {
    position: 'absolute',
    top: 0,
    right: 2,
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: COLORS.text,
  },
  flipArrowBottom: {
    position: 'absolute',
    bottom: 0,
    left: 2,
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: COLORS.text,
  },
  dateContainer: {
    width: 28,
    height: 30,
    borderRadius: 4,
    backgroundColor: COLORS.surfaceLight,
    overflow: 'hidden',
  },
  dateActive: {
    backgroundColor: COLORS.accent,
  },
  dateTop: {
    height: 8,
    backgroundColor: COLORS.textDim,
  },
  dateBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textDim,
  },
  dateTextActive: {
    color: COLORS.black,
  },
  polaroidContainer: {
    width: 28,
    height: 32,
    borderRadius: 3,
    backgroundColor: COLORS.surfaceLight,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.textDim,
  },
  polaroidActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  polaroidTop: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  polaroidImage: {
    flex: 1,
    margin: 2,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  polaroidBottom: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  settingsContainer: {
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  sliderRow: {
    width: 18,
    height: 2,
    position: 'relative',
  },
  sliderLine: {
    position: 'absolute',
    width: '100%',
    height: 2,
    backgroundColor: COLORS.text,
    borderRadius: 1,
  },
  sliderDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.text,
    top: -2,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 20,
  },
  permissionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  permissionIconContainer: {
    marginBottom: 20,
  },
  cameraIconBody: {
    width: 56,
    height: 40,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconLens: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: COLORS.textDim,
  },
  permissionTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  permissionText: {
    color: COLORS.textDim,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  permissionButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: COLORS.black,
    fontSize: 14,
    fontWeight: '700',
  },
  errorText: {
    color: COLORS.text,
    fontSize: 16,
    textAlign: 'center',
  },

  // Top Bar
  topBar: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topButton: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.overlay,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filmBadge: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  filmBadgeLabel: {
    color: COLORS.textDim,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  filmBadgeName: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },

  // Viewfinder
  viewfinderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewfinderFrame: {
    width: VIEWFINDER_WIDTH,
    height: VIEWFINDER_HEIGHT,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 },
  focusPoint: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 32,
    height: 32,
    marginTop: -16,
    marginLeft: -16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusPointInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  gridLineH1: { position: 'absolute', top: '33.33%', left: 20, right: 20, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  gridLineH2: { position: 'absolute', top: '66.66%', left: 20, right: 20, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  gridLineV1: { position: 'absolute', left: '33.33%', top: 20, bottom: 20, width: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  gridLineV2: { position: 'absolute', left: '66.66%', top: 20, bottom: 20, width: 1, backgroundColor: 'rgba(255,255,255,0.1)' },

  // Bottom Controls
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    paddingTop: 16,
  },
  controlsBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  photoOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 50,
    marginBottom: 16,
  },
  optionButton: {
    alignItems: 'center',
  },
  optionLabel: {
    color: COLORS.textDim,
    fontSize: 9,
    fontWeight: '700',
    marginTop: 6,
    letterSpacing: 0.5,
  },
  optionLabelActive: {
    color: COLORS.accent,
  },
  controlsContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  sideButton: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryButtonOuter: {
    width: 50,
    height: 50,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipButtonOuter: {
    width: 50,
    height: 50,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Shutter
  shutterButton: { width: 72, height: 72 },
  shutterOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#A0A0A0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  shutterMiddle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInnerDisabled: {
    backgroundColor: COLORS.textDim,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  filmPickerContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '65%',
  },
  filmPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  filmPickerTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeX: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeLine1: {
    position: 'absolute',
    width: 16,
    height: 2,
    backgroundColor: COLORS.textDim,
    transform: [{ rotate: '45deg' }],
  },
  closeLine2: {
    position: 'absolute',
    width: 16,
    height: 2,
    backgroundColor: COLORS.textDim,
    transform: [{ rotate: '-45deg' }],
  },
  filmList: { padding: 12 },
  filmOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: COLORS.background,
  },
  filmOptionSelected: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  filmSwatch: {
    width: 44,
    height: 44,
    borderRadius: 6,
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  filmSwatchBW: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '900',
  },
  filmInfo: { flex: 1 },
  filmName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  filmDescription: {
    color: COLORS.textDim,
    fontSize: 12,
  },
  checkMark: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkShort: {
    position: 'absolute',
    width: 6,
    height: 2,
    backgroundColor: COLORS.accent,
    transform: [{ rotate: '45deg' }],
    left: 2,
    top: 10,
  },
  checkLong: {
    position: 'absolute',
    width: 12,
    height: 2,
    backgroundColor: COLORS.accent,
    transform: [{ rotate: '-45deg' }],
    right: 2,
    top: 8,
  },
});
