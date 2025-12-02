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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, COLORS } from '../types';

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

export default function SettingsScreen() {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(true);

  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    if (!Geolocation) {
      setLocationEnabled(false);
      setCheckingPermission(false);
      return;
    }

    try {
      if (Platform.OS === 'ios') {
        // On iOS, we can check current authorization status
        Geolocation.getCurrentPosition(
          () => {
            setLocationEnabled(true);
            setCheckingPermission(false);
          },
          (error: { code: number }) => {
            // Error code 1 = permission denied
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
      // Can't revoke permission programmatically, open settings
      Linking.openSettings();
    } else {
      // Request permission
      if (!Geolocation) {
        Linking.openSettings();
        return;
      }

      if (Platform.OS === 'ios') {
        const status = await Geolocation.requestAuthorization('whenInUse');
        if (status === 'granted') {
          setLocationEnabled(true);
        } else {
          // Permission denied or restricted, open settings
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

      {/* Settings List */}
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ABOUT</Text>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Version</Text>
          <Text style={styles.settingValue}>1.0.0</Text>
        </View>
      </View>

      <Text style={styles.footerNote}>
        When location is disabled, Polaroid frames will display the date instead.
      </Text>

      <TouchableOpacity
        style={styles.attribution}
        onPress={() => Linking.openURL('https://x.com/Koushithamin')}
      >
        <Text style={styles.attributionText}>Built by @KoushithAmin</Text>
       
      </TouchableOpacity>
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
  footerNote: {
    color: COLORS.textDim,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 32,
    marginHorizontal: 40,
    lineHeight: 18,
  },
  attribution: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  attributionText: {
    color: COLORS.textDim,
    fontSize: 12,
  },
  attributionLink: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
