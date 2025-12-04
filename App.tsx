import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CameraScreen from './src/screens/CameraScreen';
import GalleryScreen from './src/screens/GalleryScreen';
import PhotoViewerScreen from './src/screens/PhotoViewerScreen';
import VideoViewerScreen from './src/screens/VideoViewerScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { RootStackParamList, COLORS } from './src/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.black}
        translucent={false}
      />
      <NavigationContainer
        theme={{
          dark: true,
          colors: {
            primary: COLORS.accent,
            background: COLORS.background,
            card: COLORS.surface,
            text: COLORS.text,
            border: COLORS.surfaceLight,
            notification: COLORS.accent,
          },
          fonts: {
            regular: { fontFamily: 'System', fontWeight: '400' },
            medium: { fontFamily: 'System', fontWeight: '500' },
            bold: { fontFamily: 'System', fontWeight: '700' },
            heavy: { fontFamily: 'System', fontWeight: '900' },
          },
        }}
      >
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            contentStyle: { backgroundColor: COLORS.background },
          }}
        >
          <Stack.Screen name="Camera" component={CameraScreen} />
          <Stack.Screen
            name="Gallery"
            component={GalleryScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="PhotoViewer"
            component={PhotoViewerScreen}
            options={{ animation: 'fade' }}
          />
          <Stack.Screen
            name="VideoViewer"
            component={VideoViewerScreen}
            options={{ animation: 'fade' }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ animation: 'slide_from_right' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
