import React, { forwardRef, useImperativeHandle, useEffect } from 'react';
import {
  requireNativeComponent,
  NativeModules,
  UIManager,
  ViewStyle,
  StyleSheet,
  Platform,
  View,
  Text,
} from 'react-native';

const { FilteredCameraModule } = NativeModules;

interface FilteredCameraProps {
  style?: ViewStyle;
  filterId: string;
  position?: 'back' | 'front';
  isActive?: boolean;
}

export interface FilteredCameraRef {
  takePhoto: () => Promise<{ path: string }>;
}

const NATIVE_COMPONENT_NAME = 'FilteredCameraView';
const hasNativeComponent = Platform.OS === 'ios' &&
  UIManager.getViewManagerConfig(NATIVE_COMPONENT_NAME) != null;

const globalKey = '__FILTERED_CAMERA_NATIVE_COMPONENT__';
const globalCache = global as unknown as { [key: string]: unknown };

let NativeFilteredCamera: ReturnType<typeof requireNativeComponent<FilteredCameraProps>> | null = null;
if (hasNativeComponent) {
  if (globalCache[globalKey]) {
    NativeFilteredCamera = globalCache[globalKey] as typeof NativeFilteredCamera;
  } else {
    try {
      NativeFilteredCamera = requireNativeComponent<FilteredCameraProps>(NATIVE_COMPONENT_NAME);
      globalCache[globalKey] = NativeFilteredCamera;
    } catch (e) {
      console.error('[FilteredCamera] Failed to load native component:', e);
    }
  }
}

export const FilteredCamera = forwardRef<FilteredCameraRef, FilteredCameraProps>(
  ({ style, filterId, position = 'back', isActive = true }, ref) => {
    
    useImperativeHandle(ref, () => ({
      takePhoto: async () => {
        if (Platform.OS !== 'ios' || !FilteredCameraModule) {
          throw new Error('FilteredCamera not available on this platform');
        }
        return FilteredCameraModule.takePhoto({});
      },
    }));

    if (Platform.OS !== 'ios' || !NativeFilteredCamera) {
      return (
        <View style={[styles.fallback, style]}>
             <Text style={styles.errorText}>Native Camera Not Found</Text>
        </View>
      );
    }

    // Force strict dimensions on the container and child to fix 0-height issue
    return (
      <View style={[styles.container, style]}>
        <NativeFilteredCamera
          style={styles.nativeCamera}
          filterId={filterId}
          position={position}
          isActive={isActive}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    overflow: 'hidden',
    // Removed absoluteFill here, relying on parent 'style' for position, 
    // but enforcing flex: 1 to fill that space.
  },
  nativeCamera: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  fallback: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'white', 
    alignSelf: 'center', 
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 8
  }
});

export default FilteredCamera;
