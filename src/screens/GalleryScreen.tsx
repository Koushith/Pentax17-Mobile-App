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
  Alert,
  Share,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Photo, COLORS } from '../types';
import { getPhotos, deletePhotos, removePhotoFromMetadata } from '../services/storage';
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

const CheckIcon = ({ checked }: { checked: boolean }) => (
  <View style={[iconStyles.checkCircle, checked && iconStyles.checkCircleActive]}>
    {checked && (
      <>
        <View style={iconStyles.checkShort} />
        <View style={iconStyles.checkLong} />
      </>
    )}
  </View>
);

const TrashIcon = () => (
  <View style={iconStyles.trashContainer}>
    <View style={iconStyles.trashLid} />
    <View style={iconStyles.trashBody} />
  </View>
);

const ShareIcon = () => (
  <View style={iconStyles.shareContainer}>
    <View style={iconStyles.shareBox} />
    <View style={iconStyles.shareArrow} />
  </View>
);

const CloseIcon = () => (
  <View style={iconStyles.closeContainer}>
    <View style={iconStyles.closeLine1} />
    <View style={iconStyles.closeLine2} />
  </View>
);

const SelectAllIcon = () => (
  <View style={iconStyles.selectAllContainer}>
    <View style={iconStyles.selectAllBox} />
    <View style={iconStyles.selectAllCheck} />
  </View>
);

export default function GalleryScreen() {
  const navigation = useNavigation<GalleryScreenNavigationProp>();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === photos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(photos.map(p => p.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;

    Alert.alert(
      'Delete Photos',
      `Delete ${selectedIds.size} photo${selectedIds.size > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const photoIds = Array.from(selectedIds);
            await deletePhotos(photoIds);
            setSelectedIds(new Set());
            setIsSelectMode(false);
            loadPhotos();
          },
        },
      ]
    );
  };

  const handleShareSelected = async () => {
    if (selectedIds.size === 0) return;

    const selectedPhotos = photos.filter(p => selectedIds.has(p.id));
    const urls = selectedPhotos.map(p => p.uri);

    try {
      await Share.share({
        message: `${selectedIds.size} photo${selectedIds.size > 1 ? 's' : ''} from Cam`,
        url: urls[0],
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleItemPress = (photo: Photo) => {
    if (isSelectMode) {
      toggleSelect(photo.id);
    } else {
      navigation.navigate('PhotoViewer', { photo });
    }
  };

  const handleItemLongPress = (photo: Photo) => {
    if (!isSelectMode) {
      setIsSelectMode(true);
      setSelectedIds(new Set([photo.id]));
    }
  };

  const handleImageError = async (photoId: string) => {
    // Photo failed to load (likely deleted from Camera Roll)
    // Remove it from our metadata and refresh
    await removePhotoFromMetadata(photoId);
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const renderItem = ({ item, index }: { item: Photo; index: number }) => {
    const isSelected = selectedIds.has(item.id);
    const film = getFilmStockById(item.filmStock);

    return (
      <TouchableOpacity
        onPress={() => handleItemPress(item)}
        onLongPress={() => handleItemLongPress(item)}
        delayLongPress={300}
        style={[styles.itemContainer, isSelected && styles.itemSelected]}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: item.uri }}
          style={styles.thumbnail}
          onError={() => handleImageError(item.id)}
        />

        {/* Selection overlay */}
        {isSelectMode && (
          <View style={styles.selectionOverlay}>
            <CheckIcon checked={isSelected} />
          </View>
        )}

        {/* Film indicator - hide in select mode */}
        {!isSelectMode && (
          <View style={styles.filmIndicator}>
            <View style={[styles.filmDot, {
              backgroundColor: film.isBlackAndWhite
                ? '#888'
                : film.overlayColor.replace('0.', '0.8')
            }]} />
          </View>
        )}

        {/* Frame number - hide in select mode */}
        {!isSelectMode && (
          <View style={styles.frameNumberBadge}>
            <Text style={styles.frameNumberText}>
              {String(item.frameNumber || index + 1).padStart(2, '0')}
            </Text>
          </View>
        )}
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
      {/* Header - Normal or Selection Mode */}
      {isSelectMode ? (
        <View style={styles.selectionHeader}>
          <TouchableOpacity onPress={toggleSelectMode} style={styles.backButton}>
            <CloseIcon />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              {selectedIds.size} selected
            </Text>
          </View>

          <TouchableOpacity onPress={selectAll} style={styles.selectAllButton}>
            <Text style={styles.selectAllText}>
              {selectedIds.size === photos.length ? 'None' : 'All'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <BackIcon />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Gallery</Text>
          </View>

          {photos.length > 0 ? (
            <TouchableOpacity onPress={toggleSelectMode} style={styles.selectButton}>
              <Text style={styles.selectButtonText}>Select</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerRight} />
          )}
        </View>
      )}

      {/* Content */}
      {!isLoading && photos.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={photos}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={COLUMN_COUNT}
          contentContainerStyle={[
            styles.gridContent,
            isSelectMode && styles.gridContentWithActionBar
          ]}
          ListHeaderComponent={photos.length > 0 && !isSelectMode ? renderHeader : null}
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

      {/* Bottom Action Bar - Select Mode */}
      {isSelectMode && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            onPress={handleShareSelected}
            style={[styles.actionButton, selectedIds.size === 0 && styles.actionButtonDisabled]}
            disabled={selectedIds.size === 0}
          >
            <ShareIcon />
            <Text style={[styles.actionButtonText, selectedIds.size === 0 && styles.actionButtonTextDisabled]}>
              Share
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDeleteSelected}
            style={[styles.actionButton, styles.deleteButton, selectedIds.size === 0 && styles.actionButtonDisabled]}
            disabled={selectedIds.size === 0}
          >
            <TrashIcon />
            <Text style={[styles.actionButtonText, styles.deleteButtonText, selectedIds.size === 0 && styles.actionButtonTextDisabled]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const iconStyles = StyleSheet.create({
  // Check circle for selection
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.white,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircleActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  checkShort: {
    position: 'absolute',
    width: 6,
    height: 2,
    backgroundColor: COLORS.black,
    transform: [{ rotate: '45deg' }],
    left: 4,
    top: 11,
  },
  checkLong: {
    position: 'absolute',
    width: 12,
    height: 2,
    backgroundColor: COLORS.black,
    transform: [{ rotate: '-45deg' }],
    right: 3,
    top: 9,
  },
  // Trash icon
  trashContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trashLid: {
    width: 18,
    height: 3,
    backgroundColor: COLORS.text,
    borderRadius: 1,
    marginBottom: 1,
  },
  trashBody: {
    width: 14,
    height: 14,
    borderWidth: 2,
    borderTopWidth: 0,
    borderColor: COLORS.text,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  // Share icon
  shareContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareBox: {
    width: 14,
    height: 12,
    borderWidth: 2,
    borderTopWidth: 0,
    borderColor: COLORS.text,
    position: 'absolute',
    bottom: 2,
  },
  shareArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: COLORS.text,
    position: 'absolute',
    top: 2,
  },
  // Close icon
  closeContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeLine1: {
    position: 'absolute',
    width: 16,
    height: 2,
    backgroundColor: COLORS.text,
    transform: [{ rotate: '45deg' }],
  },
  closeLine2: {
    position: 'absolute',
    width: 16,
    height: 2,
    backgroundColor: COLORS.text,
    transform: [{ rotate: '-45deg' }],
  },
  // Select all icon
  selectAllContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectAllBox: {
    width: 16,
    height: 16,
    borderWidth: 2,
    borderColor: COLORS.text,
    borderRadius: 3,
  },
  selectAllCheck: {
    width: 8,
    height: 4,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: COLORS.text,
    transform: [{ rotate: '-45deg' }],
    position: 'absolute',
    top: 8,
  },
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
  // Play icon for videos
  playContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderTopWidth: 9,
    borderBottomWidth: 9,
    borderLeftColor: COLORS.white,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 4,
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
  selectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectButtonText: {
    color: COLORS.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  // Selection header
  selectionHeader: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  selectAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectAllText: {
    color: COLORS.accent,
    fontSize: 15,
    fontWeight: '600',
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
  // Video styles
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  videoDurationBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoDurationText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  // Selection styles
  gridContentWithActionBar: {
    paddingBottom: 100,
  },
  itemSelected: {
    borderWidth: 3,
    borderColor: COLORS.accent,
    borderRadius: 6,
  },
  selectionOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  // Action Bar
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    paddingBottom: 40,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceLight,
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
  deleteButton: {
    backgroundColor: 'rgba(255,59,48,0.15)',
  },
  actionButtonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  deleteButtonText: {
    color: '#FF3B30',
  },
  actionButtonTextDisabled: {
    color: COLORS.textDim,
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
