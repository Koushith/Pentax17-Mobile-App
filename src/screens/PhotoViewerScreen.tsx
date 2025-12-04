import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  Modal,
  FlatList,
  Share,
  Dimensions,
  ScrollView,
  Animated,
  ActivityIndicator,
  Platform,
  PanResponder,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, COLORS, Photo } from '../types';
import { deletePhoto, updatePhoto, getPhotos } from '../services/storage';
import { FILM_STOCKS, getFilmStockById, FilmStock } from '../services/filters';
import { reprocessPhoto } from '../services/processor';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type PhotoViewerScreenRouteProp = RouteProp<RootStackParamList, 'PhotoViewer'>;
type PhotoViewerScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PhotoViewer'>;

// Icon Components
const BackIcon = () => (
  <View style={iconStyles.iconContainer}>
    <View style={iconStyles.backArrow} />
  </View>
);

const InfoIcon = () => (
  <View style={iconStyles.iconContainer}>
    <View style={iconStyles.infoCircle}>
      <View style={iconStyles.infoDot} />
      <View style={iconStyles.infoLine} />
    </View>
  </View>
);

const DeleteIcon = () => (
  <View style={iconStyles.iconContainer}>
    <View style={iconStyles.trashBody}>
      <View style={iconStyles.trashLid} />
      <View style={iconStyles.trashLine1} />
      <View style={iconStyles.trashLine2} />
    </View>
  </View>
);

const EditIcon = () => (
  <View style={iconStyles.iconContainer}>
    <View style={iconStyles.editPencil}>
      <View style={iconStyles.editTip} />
    </View>
  </View>
);

const ShareIcon = () => (
  <View style={iconStyles.iconContainer}>
    <View style={iconStyles.shareBox}>
      <View style={iconStyles.shareArrow} />
    </View>
  </View>
);

const CloseIcon = () => (
  <View style={iconStyles.closeContainer}>
    <View style={iconStyles.closeLine1} />
    <View style={iconStyles.closeLine2} />
  </View>
);

const CheckIcon = () => (
  <View style={iconStyles.checkContainer}>
    <View style={iconStyles.checkShort} />
    <View style={iconStyles.checkLong} />
  </View>
);

export default function PhotoViewerScreen() {
  const navigation = useNavigation<PhotoViewerScreenNavigationProp>();
  const route = useRoute<PhotoViewerScreenRouteProp>();
  const { photo: initialPhoto } = route.params;

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [photo, setPhoto] = useState(initialPhoto);
  const [showInfo, setShowInfo] = useState(false);
  const [showEditFilm, setShowEditFilm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showActions, setShowActions] = useState(true);

  const flatListRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const film = getFilmStockById(photo.filmStock);

  // Swipe down to close gesture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture vertical swipes (down)
        return gestureState.dy > 10 && Math.abs(gestureState.dx) < Math.abs(gestureState.dy);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
          const newScale = Math.max(0.85, 1 - gestureState.dy / 800);
          scale.setValue(newScale);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150) {
          // Close the viewer
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: SCREEN_HEIGHT,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 0.8,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => navigation.goBack());
        } else {
          // Snap back
          Animated.parallel([
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              tension: 100,
              friction: 10,
            }),
            Animated.spring(scale, {
              toValue: 1,
              useNativeDriver: true,
              tension: 100,
              friction: 10,
            }),
          ]).start();
        }
      },
    })
  ).current;

  // Load all photos for swiping
  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    const allPhotos = await getPhotos();
    setPhotos(allPhotos);
    const index = allPhotos.findIndex(p => p.id === initialPhoto.id);
    if (index >= 0) {
      setCurrentIndex(index);
      // Scroll to the correct position after a short delay
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index, animated: false });
      }, 100);
    }
  };

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const newPhoto = viewableItems[0].item as Photo;
      setPhoto(newPhoto);
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50
  }).current;

  const toggleActions = () => {
    const toValue = showActions ? 0 : 1;
    Animated.timing(fadeAnim, {
      toValue,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setShowActions(!showActions);
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Photo",
      "This photo will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deletePhoto(photo.id);
            navigation.goBack();
          }
        }
      ]
    );
  };

  const handleShare = async () => {
    try {
      const shareOptions = Platform.select({
        ios: { url: photo.uri },
        android: { message: `Shot on ${film.name}`, url: photo.uri },
      });
      await Share.share(shareOptions as any);
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleReprocessWithFilm = async (newFilm: FilmStock) => {
    if (newFilm.id === photo.filmStock) {
      setShowEditFilm(false);
      return;
    }

    setIsProcessing(true);
    setShowEditFilm(false);

    try {
      const newUri = await reprocessPhoto(photo.uri, newFilm.id);
      const updatedPhoto = await updatePhoto(photo.id, {
        uri: newUri,
        filmStock: newFilm.id,
      });
      if (updatedPhoto) {
        setPhoto(updatedPhoto);
      }
    } catch (error) {
      console.error('Reprocess error:', error);
      Alert.alert('Error', 'Failed to apply filter');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderPhotoItem = ({ item }: { item: Photo }) => (
    <View style={styles.photoItem}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={toggleActions}
        style={styles.photoTouchable}
      >
        <Image
          source={{ uri: item.uri }}
          style={styles.photo}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.animatedContainer,
          {
            transform: [
              { translateY },
              { scale },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <FlatList
          ref={flatListRef}
          data={photos}
          renderItem={renderPhotoItem}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          windowSize={5}
        />
      </Animated.View>

      {/* Photo Counter */}
      {photos.length > 1 && (
        <View style={styles.photoCounter}>
          <Text style={styles.photoCounterText}>
            {currentIndex + 1} / {photos.length}
          </Text>
        </View>
      )}


      {/* Swipe Down Hint - shows briefly */}
      <View style={styles.swipeHint}>
        <View style={styles.swipeHintBar} />
      </View>

      {/* Top Bar */}
      <Animated.View style={[styles.topBar, { opacity: fadeAnim }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topButton}>
          <BackIcon />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowInfo(true)} style={styles.topButton}>
          <InfoIcon />
        </TouchableOpacity>
      </Animated.View>

      {/* Bottom Action Bar */}
      <Animated.View style={[styles.bottomBar, { opacity: fadeAnim }]}>
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={handleDelete} style={styles.actionButton}>
            <DeleteIcon />
            <Text style={styles.actionLabel}>Delete</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowEditFilm(true)} style={styles.actionButton}>
            <EditIcon />
            <Text style={styles.actionLabel}>Filter</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
            <ShareIcon />
            <Text style={styles.actionLabel}>Share</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filmBadge}>
          <View style={[styles.filmDot, {
            backgroundColor: film.isBlackAndWhite ? '#888' : film.overlayColor.replace('0.', '0.8')
          }]} />
          <View style={styles.filmBadgeTextContainer}>
            <Text style={styles.filmBadgeLabel}>FILM</Text>
            <Text style={styles.filmBadgeText}>{film.label}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Processing Overlay */}
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingCard}>
            <ActivityIndicator color={COLORS.accent} size="large" />
            <Text style={styles.processingText}>Applying filter...</Text>
          </View>
        </View>
      )}

      {/* Info Modal */}
      <Modal visible={showInfo} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.infoContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Details</Text>
              <TouchableOpacity onPress={() => setShowInfo(false)} style={styles.closeButton}>
                <CloseIcon />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.infoContent}>
              <View style={styles.infoPreview}>
                <Image source={{ uri: photo.uri }} style={styles.infoThumbnail} />
              </View>

              <View style={styles.infoSection}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Date</Text>
                  <Text style={styles.infoValue}>{formatDate(photo.date)}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Time</Text>
                  <Text style={styles.infoValue}>{formatTime(photo.date)}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Frame</Text>
                  <Text style={styles.infoValue}>#{photo.frameNumber || 'N/A'}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Film</Text>
                  <Text style={styles.infoValue}>{film.name}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Size</Text>
                  <Text style={styles.infoValue}>{photo.width} x {photo.height}</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Film Modal */}
      <Modal visible={showEditFilm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.editContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Filter</Text>
              <TouchableOpacity onPress={() => setShowEditFilm(false)} style={styles.closeButton}>
                <CloseIcon />
              </TouchableOpacity>
            </View>

            <FlatList
              data={FILM_STOCKS}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.filmOption,
                    item.id === photo.filmStock && styles.filmOptionSelected
                  ]}
                  onPress={() => handleReprocessWithFilm(item)}
                >
                  <View style={[styles.filmSwatch, {
                    backgroundColor: item.isBlackAndWhite ? '#666' : item.overlayColor.replace('0.', '0.6')
                  }]}>
                    {item.isBlackAndWhite && <Text style={styles.filmSwatchBW}>B/W</Text>}
                  </View>
                  <View style={styles.filmInfo}>
                    <Text style={styles.filmName}>{item.name}</Text>
                    <Text style={styles.filmDescription}>{item.description}</Text>
                  </View>
                  {item.id === photo.filmStock && <CheckIcon />}
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
    borderColor: COLORS.white,
    transform: [{ rotate: '45deg' }],
    marginLeft: 4,
  },
  infoCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.white,
    marginBottom: 2,
  },
  infoLine: {
    width: 2,
    height: 6,
    backgroundColor: COLORS.white,
  },
  trashBody: {
    width: 16,
    height: 18,
    borderWidth: 2,
    borderColor: COLORS.text,
    borderTopWidth: 0,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trashLid: {
    position: 'absolute',
    top: -4,
    width: 20,
    height: 2,
    backgroundColor: COLORS.text,
  },
  trashLine1: {
    width: 2,
    height: 8,
    backgroundColor: COLORS.text,
    position: 'absolute',
    left: 4,
  },
  trashLine2: {
    width: 2,
    height: 8,
    backgroundColor: COLORS.text,
    position: 'absolute',
    right: 4,
  },
  editPencil: {
    width: 16,
    height: 16,
    borderWidth: 2,
    borderColor: COLORS.text,
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  editTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: COLORS.text,
    marginBottom: -2,
  },
  shareBox: {
    width: 16,
    height: 14,
    borderWidth: 2,
    borderColor: COLORS.text,
    borderTopWidth: 0,
    justifyContent: 'flex-start',
    alignItems: 'center',
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
    marginTop: -6,
  },
  closeContainer: {
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
  checkContainer: {
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  animatedContainer: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  photoItem: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoTouchable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photo: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  // Swipe Hint
  swipeHint: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
  },
  swipeHintBar: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 2,
  },
  photoCounter: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  photoCounterText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  // Top Bar
  topBar: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    paddingTop: 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  actionButton: {
    alignItems: 'center',
    padding: 12,
  },
  actionLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  filmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'center',
  },
  filmDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  filmBadgeTextContainer: {
    flexDirection: 'column',
  },
  filmBadgeLabel: {
    color: COLORS.textDim,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 1,
  },
  filmBadgeText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },

  // Processing
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  processingText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 16,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Info Modal
  infoContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  infoContent: {
    padding: 20,
  },
  infoPreview: {
    alignItems: 'center',
    marginBottom: 20,
  },
  infoThumbnail: {
    width: 100,
    height: 150,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceLight,
  },
  infoSection: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  infoLabel: {
    color: COLORS.textDim,
    fontSize: 14,
  },
  infoValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },

  // Edit Modal
  editContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '65%',
  },
  filmList: {
    padding: 12,
  },
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
  filmInfo: {
    flex: 1,
  },
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
});
