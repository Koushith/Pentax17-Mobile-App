import React, { useCallback, useState } from 'react';
import {
  View,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Text,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Photo, COLORS } from '../types';
import { getPhotos } from '../services/storage';
import { getFilmStockById } from '../services/filters';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_GAP = 2;
const ITEM_SIZE = (width - (COLUMN_COUNT + 1) * ITEM_GAP) / COLUMN_COUNT;
const THUMBNAIL_HEIGHT = ITEM_SIZE * 1.5;

type GalleryScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Gallery'>;

// Icon Components
const BackIcon = () => (
  <View style={iconStyles.backContainer}>
    <View style={iconStyles.backArrow} />
  </View>
);

const FilmCanisterIcon = () => (
  <View style={iconStyles.canisterContainer}>
    <View style={iconStyles.canisterTop} />
    <View style={iconStyles.canisterBody}>
      <View style={iconStyles.canisterLabel} />
    </View>
  </View>
);

const FilmStripIcon = () => (
  <View style={iconStyles.stripContainer}>
    {[0, 1, 2, 3].map((i) => (
      <View key={i} style={iconStyles.stripFrame}>
        <View style={iconStyles.stripHole} />
        <View style={iconStyles.stripHole} />
      </View>
    ))}
  </View>
);

const CameraIcon = () => (
  <View style={iconStyles.cameraContainer}>
    <View style={iconStyles.cameraBody}>
      <View style={iconStyles.cameraLens} />
    </View>
  </View>
);

export default function GalleryScreen() {
  const navigation = useNavigation<GalleryScreenNavigationProp>();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadPhotos();
    }, [])
  );

  const loadPhotos = async () => {
    setIsLoading(true);
    const loadedPhotos = await getPhotos();
    setPhotos(loadedPhotos);
    setIsLoading(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadPhotos();
    setIsRefreshing(false);
  };

  const renderItem = ({ item, index }: { item: Photo; index: number }) => {
    const film = getFilmStockById(item.filmStock);

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('PhotoViewer', { photo: item })}
        style={styles.itemContainer}
        activeOpacity={0.8}
      >
        <Image source={{ uri: item.uri }} style={styles.thumbnail} />

        <View style={styles.filmIndicator}>
          <View style={[styles.filmDot, {
            backgroundColor: film.isBlackAndWhite ? '#888' : film.overlayColor.replace('0.', '0.8')
          }]} />
        </View>

        <View style={styles.frameNumberBadge}>
          <Text style={styles.frameNumberText}>
            {String(item.frameNumber || index + 1).padStart(2, '0')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIllustration}>
        <FilmCanisterIcon />
        <FilmStripIcon />
      </View>

      <Text style={styles.emptyTitle}>No Photos Yet</Text>
      <Text style={styles.emptySubtitle}>
        Start shooting to fill your roll
      </Text>

      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => navigation.goBack()}
      >
        <CameraIcon />
        <Text style={styles.emptyButtonText}>Open Camera</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerInfo}>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{photos.length}</Text>
          <Text style={styles.statLabel}>PHOTOS</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <BackIcon />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Gallery</Text>
        </View>

        <View style={styles.headerRight} />
      </View>

      {/* Content */}
      {!isLoading && photos.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={photos}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={COLUMN_COUNT}
          contentContainerStyle={styles.gridContent}
          ListHeaderComponent={photos.length > 0 ? renderHeader : null}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.accent}
              colors={[COLORS.accent]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const iconStyles = StyleSheet.create({
  backContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    width: 12,
    height: 12,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: COLORS.text,
    transform: [{ rotate: '45deg' }],
    marginLeft: 4,
  },
  canisterContainer: {
    alignItems: 'center',
    marginRight: 8,
  },
  canisterTop: {
    width: 28,
    height: 6,
    backgroundColor: COLORS.surfaceLight,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  canisterBody: {
    width: 36,
    height: 48,
    backgroundColor: COLORS.surface,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  canisterLabel: {
    width: 20,
    height: 12,
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  stripContainer: {
    flexDirection: 'row',
  },
  stripFrame: {
    width: 20,
    height: 30,
    backgroundColor: COLORS.surface,
    marginHorizontal: 1,
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  stripHole: {
    width: 12,
    height: 3,
    backgroundColor: COLORS.background,
    alignSelf: 'center',
    borderRadius: 1,
  },
  cameraContainer: {
    marginRight: 8,
  },
  cameraBody: {
    width: 24,
    height: 18,
    backgroundColor: COLORS.black,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.textDim,
  },
  cameraLens: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.textDim,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  headerRight: {
    width: 44,
  },

  // Stats Header
  headerInfo: {
    paddingVertical: 16,
    paddingHorizontal: ITEM_GAP,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  statValue: {
    color: COLORS.accent,
    fontSize: 24,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    color: COLORS.textDim,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 4,
  },

  // Grid
  gridContent: {
    paddingHorizontal: ITEM_GAP,
    paddingBottom: 40,
  },
  itemContainer: {
    width: ITEM_SIZE,
    height: THUMBNAIL_HEIGHT,
    margin: ITEM_GAP / 2,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  filmIndicator: {
    position: 'absolute',
    top: 6,
    left: 6,
  },
  filmDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  frameNumberBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  frameNumberText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIllustration: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: COLORS.textDim,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  emptyButtonText: {
    color: COLORS.black,
    fontSize: 15,
    fontWeight: '700',
  },
});
