import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Switch,
  Linking,
  Platform,
  PermissionsAndroid,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, COLORS } from '../types';
import { getSettings, saveSettings, clearAllPhotos } from '../services/storage';
import { FILM_STOCKS, getFilmStockById } from '../services/filters';

// Safe import of geolocation
let Geolocation: any = null;
try {
  Geolocation = require('react-native-geolocation-service').default;
} catch (e) {
  console.log('Geolocation not available');
}

type SettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

const BackIcon = () => (
  <View style={iconStyles.iconContainer}>
    <View style={iconStyles.backArrow} />
  </View>
);

const ChevronIcon = () => (
  <View style={iconStyles.chevronContainer}>
    <View style={iconStyles.chevronArrow} />
  </View>
);

export default function SettingsScreen() {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [saveToLibrary, setSaveToLibrary] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [highQuality, setHighQuality] = useState(true);

  useEffect(() => {
    checkLocationPermission();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settings = await getSettings();
    setSoundEnabled(settings.soundEnabled);
  };

  const checkLocationPermission = async () => {
    if (!Geolocation) {
      setLocationEnabled(false);
      setCheckingPermission(false);
      return;
    }

    try {
      if (Platform.OS === 'ios') {
        Geolocation.getCurrentPosition(
          () => {
            setLocationEnabled(true);
            setCheckingPermission(false);
          },
          (error: { code: number }) => {
            setLocationEnabled(error.code !== 1);
            setCheckingPermission(false);
          },
          { timeout: 1000, maximumAge: 0 }
        );
      } else {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        setLocationEnabled(granted);
        setCheckingPermission(false);
      }
    } catch {
      setLocationEnabled(false);
      setCheckingPermission(false);
    }
  };

  const handleLocationToggle = async () => {
    if (locationEnabled) {
      Linking.openSettings();
    } else {
      if (!Geolocation) {
        Linking.openSettings();
        return;
      }

      if (Platform.OS === 'ios') {
        const status = await Geolocation.requestAuthorization('whenInUse');
        if (status === 'granted') {
          setLocationEnabled(true);
        } else {
          Linking.openSettings();
        }
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setLocationEnabled(true);
        } else {
          Linking.openSettings();
        }
      }
    }
  };

  const handleSoundToggle = async (value: boolean) => {
    setSoundEnabled(value);
    await saveSettings({ soundEnabled: value });
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear App Data',
      'This will remove all photos from the app gallery. Photos saved to Camera Roll will not be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearAllPhotos();
            Alert.alert('Done', 'App data has been cleared.');
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Camera Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CAMERA</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Shutter Sound</Text>
              <Text style={styles.settingDescription}>
                Play sound when taking photos
              </Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={handleSoundToggle}
              trackColor={{ false: COLORS.surfaceLight, true: COLORS.accentDim }}
              thumbColor={soundEnabled ? COLORS.accent : COLORS.textDim}
              ios_backgroundColor={COLORS.surfaceLight}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>High Quality</Text>
              <Text style={styles.settingDescription}>
                Maximum resolution photos (uses more storage)
              </Text>
            </View>
            <Switch
              value={highQuality}
              onValueChange={setHighQuality}
              trackColor={{ false: COLORS.surfaceLight, true: COLORS.accentDim }}
              thumbColor={highQuality ? COLORS.accent : COLORS.textDim}
              ios_backgroundColor={COLORS.surfaceLight}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Grid Overlay</Text>
              <Text style={styles.settingDescription}>
                Show composition grid lines
              </Text>
            </View>
            <Switch
              value={showGrid}
              onValueChange={setShowGrid}
              trackColor={{ false: COLORS.surfaceLight, true: COLORS.accentDim }}
              thumbColor={showGrid ? COLORS.accent : COLORS.textDim}
              ios_backgroundColor={COLORS.surfaceLight}
            />
          </View>
        </View>

        {/* Polaroid Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>POLAROID FRAME</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Location</Text>
              <Text style={styles.settingDescription}>
                Add place names to your Polaroid photos
              </Text>
            </View>
            <Switch
              value={locationEnabled}
              onValueChange={handleLocationToggle}
              disabled={checkingPermission}
              trackColor={{ false: COLORS.surfaceLight, true: COLORS.accentDim }}
              thumbColor={locationEnabled ? COLORS.accent : COLORS.textDim}
              ios_backgroundColor={COLORS.surfaceLight}
            />
          </View>

          {!locationEnabled && !checkingPermission && (
            <TouchableOpacity style={styles.enableButton} onPress={handleLocationToggle}>
              <Text style={styles.enableButtonText}>Enable Location Access</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Storage Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>STORAGE</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Save to Camera Roll</Text>
              <Text style={styles.settingDescription}>
                Also save photos to your photo library
              </Text>
            </View>
            <Switch
              value={saveToLibrary}
              onValueChange={setSaveToLibrary}
              trackColor={{ false: COLORS.surfaceLight, true: COLORS.accentDim }}
              thumbColor={saveToLibrary ? COLORS.accent : COLORS.textDim}
              ios_backgroundColor={COLORS.surfaceLight}
            />
          </View>

          <TouchableOpacity style={styles.dangerRow} onPress={handleClearCache}>
            <Text style={styles.dangerLabel}>Clear App Data</Text>
            <ChevronIcon />
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABOUT</Text>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Version</Text>
            <Text style={styles.settingValue}>1.0.0</Text>
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Film Filters</Text>
            <Text style={styles.settingValue}>{FILM_STOCKS.length} available</Text>
          </View>
        </View>

        <Text style={styles.footerNote}>
          Cam captures photos in half-frame format (2:3) with authentic film color grading and optional Polaroid frames.
        </Text>

        <TouchableOpacity
          style={styles.attribution}
          onPress={() => Linking.openURL('https://x.com/Koushithamin')}
        >
          <Text style={styles.attributionText}>Built by @KoushithAmin</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const iconStyles = StyleSheet.create({
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    width: 10,
    height: 10,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: COLORS.text,
    transform: [{ rotate: '45deg' }],
    marginLeft: 4,
  },
  chevronContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronArrow: {
    width: 8,
    height: 8,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: COLORS.textDim,
    transform: [{ rotate: '-45deg' }],
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 44,
  },
  scrollContent: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    marginHorizontal: 20,
  },
  sectionTitle: {
    color: COLORS.textDim,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  settingDescription: {
    color: COLORS.textDim,
    fontSize: 12,
    marginTop: 4,
  },
  settingValue: {
    color: COLORS.textDim,
    fontSize: 15,
  },
  enableButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  enableButtonText: {
    color: COLORS.black,
    fontSize: 14,
    fontWeight: '700',
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  dangerLabel: {
    color: COLORS.danger,
    fontSize: 15,
    fontWeight: '600',
  },
  footerNote: {
    color: COLORS.textDim,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 32,
    marginHorizontal: 40,
    lineHeight: 18,
  },
  attribution: {
    alignItems: 'center',
    marginTop: 24,
  },
  attributionText: {
    color: COLORS.textDim,
    fontSize: 12,
  },
  bottomPadding: {
    height: 60,
  },
});
