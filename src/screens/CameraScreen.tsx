import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, Alert, Linking } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { savePhoto } from '../services/storage';
import { processAndSavePhoto } from '../services/processor';
import { FILM_STOCKS } from '../services/filters';

const { width, height } = Dimensions.get('window');

type CameraScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Camera'>;

export default function CameraScreen() {
  const navigation = useNavigation<CameraScreenNavigationProp>();
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const camera = useRef<Camera>(null);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [selectedFilmId, setSelectedFilmId] = useState(FILM_STOCKS[0].id);

  const selectedFilm = FILM_STOCKS.find(f => f.id === selectedFilmId) || FILM_STOCKS[0];

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  if (!hasPermission) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.text}>Camera permission is required.</Text>
        <TouchableOpacity onPress={() => Linking.openSettings()}>
          <Text style={styles.link}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (device == null) {
    return <View style={styles.container}><Text style={styles.text}>No camera device found</Text></View>;
  }

  const onTakePhoto = async () => {
    if (camera.current && !isTakingPhoto) {
      setIsTakingPhoto(true);
      try {
        const photo = await camera.current.takePhoto({
          flash: 'off',
          enableShutterSound: true,
        });

        // Process the photo to bake in filters
        const processedPath = await processAndSavePhoto(photo.path, selectedFilmId);
        
        await savePhoto(processedPath, photo.width, photo.height);
        
      } catch (e) {
        console.error('Failed to take photo', e);
        Alert.alert('Error', 'Failed to take photo');
      } finally {
        setIsTakingPhoto(false);
      }
    }
  };

  const toggleFilm = () => {
    const currentIndex = FILM_STOCKS.findIndex(f => f.id === selectedFilmId);
    const nextIndex = (currentIndex + 1) % FILM_STOCKS.length;
    setSelectedFilmId(FILM_STOCKS[nextIndex].id);
  };

  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
      />
      
      {/* Filter Overlay - Using standard View to prevent Skia crash */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: selectedFilm.overlayColor }]} pointerEvents="none" />
      
      {/* Viewfinder Frame Lines (Retro Rangefinder Style) */}
      <View style={styles.viewfinderContainer} pointerEvents="none">
        <View style={styles.frameLineTopLeft} />
        <View style={styles.frameLineTopRight} />
        <View style={styles.frameLineBottomLeft} />
        <View style={styles.frameLineBottomRight} />
        <View style={styles.centerMarker} />
      </View>

      {/* Top Bar Info */}
      <View style={styles.topBar}>
        <View style={styles.flashIcon}>
           <Text style={styles.flashText}>⚡ OFF</Text>
        </View>
        <TouchableOpacity onPress={toggleFilm} style={styles.filmBadge}>
           <View style={styles.filmBadgeInner}>
              <Text style={styles.filmBadgeLabel}>FILM</Text>
              <Text style={styles.filmBadgeName}>{selectedFilm.label}</Text>
           </View>
        </TouchableOpacity>
      </View>

      {/* Bottom Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.controlsBackground} />
        
        <View style={styles.controlsContent}>
            <TouchableOpacity onPress={() => navigation.navigate('Gallery')} style={styles.galleryButton}>
              <View style={styles.galleryIcon}>
                 <View style={styles.galleryIconInner} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={onTakePhoto} style={styles.shutterButton} disabled={isTakingPhoto}>
              <View style={styles.shutterOuterRing}>
                <View style={styles.shutterInnerRing}>
                   <View style={styles.shutterCenter} />
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.placeholderButton} /> 
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  text: {
    color: '#E0E0E0',
    marginBottom: 10,
    fontSize: 16,
    fontFamily: 'Courier',
  },
  link: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Viewfinder
  viewfinderContainer: {
    ...StyleSheet.absoluteFillObject,
    margin: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameLineTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  frameLineTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  frameLineBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  frameLineBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  centerMarker: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },

  // Top Bar
  topBar: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  flashIcon: {
    padding: 8,
  },
  flashText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  filmBadge: {
    backgroundColor: '#1A1A1A',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#333',
    padding: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3.84,
    elevation: 5,
  },
  filmBadgeInner: {
    backgroundColor: '#222',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000',
  },
  filmBadgeLabel: {
    color: '#666',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 2,
  },
  filmBadgeName: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  // Bottom Controls
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
    justifyContent: 'center',
  },
  controlsBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)', // Semi-transparent bottom
  },
  controlsContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 20,
  },
  
  // Shutter Button
  shutterButton: {
    width: 84,
    height: 84,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterOuterRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#C0C0C0', // Silver
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  shutterInnerRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterCenter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E0E0E0', // Off-white button
    borderWidth: 1,
    borderColor: '#FFF',
  },

  // Gallery Button
  galleryButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryIcon: {
    width: 44,
    height: 44,
    backgroundColor: '#1A1A1A',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryIconInner: {
    width: 36,
    height: 36,
    backgroundColor: '#333',
    borderRadius: 4,
  },
  placeholderButton: {
    width: 50,
    height: 50,
  },
});
