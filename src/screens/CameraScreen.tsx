import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, Alert, Linking } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { savePhoto } from '../services/storage';
import { Canvas, Rect, RadialGradient, vec, BackdropFilter, ColorMatrix } from "@shopify/react-native-skia";
import { processAndSavePhoto } from '../services/processor';

const { width, height } = Dimensions.get('window');

type CameraScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Camera'>;

export default function CameraScreen() {
  const navigation = useNavigation<CameraScreenNavigationProp>();
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const camera = useRef<Camera>(null);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);

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



// ... inside CameraScreen component ...

  const onTakePhoto = async () => {
    if (camera.current && !isTakingPhoto) {
      setIsTakingPhoto(true);
      try {
        const photo = await camera.current.takePhoto({
          flash: 'off',
          enableShutterSound: true,
        });

        // Process the photo to bake in filters
        const processedPath = await processAndSavePhoto(photo.path);
        
        await savePhoto(processedPath, photo.width, photo.height);
        
      } catch (e) {
        console.error('Failed to take photo', e);
        Alert.alert('Error', 'Failed to take photo');
      } finally {
        setIsTakingPhoto(false);
      }
    }
  };

  // Kodak Gold 200-ish Color Matrix
  // Boosting reds and yellows, slightly lowering blues
  const colorMatrix = [
    1.1, 0.1, 0.0, 0.0, 0,
    0.0, 1.0, 0.0, 0.0, 0,
    0.0, 0.1, 0.8, 0.0, 0,
    0.0, 0.0, 0.0, 1.0, 0
  ];

  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
      />
      
      {/* Filter Overlay */}
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Color Grading */}
        {/* Color Grading - Temporarily disabled due to SkiaSGRoot error */}
        {/* <BackdropFilter
          filter={<ColorMatrix matrix={colorMatrix} />}
        >
           <Rect x={0} y={0} width={width} height={height} color="transparent" />
        </BackdropFilter> */}

        {/* Vignette */}
        <Rect x={0} y={0} width={width} height={height}>
          <RadialGradient
            c={vec(width / 2, height / 2)}
            r={width * 0.8}
            colors={['transparent', 'rgba(0,0,0,0.4)']}
          />
        </Rect>
      </Canvas>

      {/* UI Controls */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={() => navigation.navigate('Gallery')} style={styles.galleryButton}>
          <View style={styles.galleryIcon} />
        </TouchableOpacity>

        <TouchableOpacity onPress={onTakePhoto} style={styles.shutterButton} disabled={isTakingPhoto}>
          <View style={styles.shutterInner} />
        </TouchableOpacity>

        <View style={{ width: 40 }} /> 
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
    backgroundColor: 'black',
  },
  text: {
    color: 'white',
    marginBottom: 10,
  },
  link: {
    color: '#007AFF',
    fontSize: 16,
  },
  controls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  shutterButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: 'black',
    backgroundColor: 'white',
  },
  galleryButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryIcon: {
    width: 30,
    height: 30,
    backgroundColor: '#333',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'white',
  },
});
