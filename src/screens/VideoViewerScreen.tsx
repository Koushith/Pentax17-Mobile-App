import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  Dimensions,
  Animated,
  Share,
  Platform,
  PanResponder,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Video, { VideoRef, OnProgressData, OnLoadData } from 'react-native-video';
import { RootStackParamList, COLORS, Video as VideoType } from '../types';
import { deleteVideo } from '../services/storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type VideoViewerScreenRouteProp = RouteProp<RootStackParamList, 'VideoViewer'>;
type VideoViewerScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'VideoViewer'>;

// Icon Components
const BackIcon = () => (
  <View style={iconStyles.iconContainer}>
    <View style={iconStyles.backArrow} />
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

const ShareIcon = () => (
  <View style={iconStyles.iconContainer}>
    <View style={iconStyles.shareBox}>
      <View style={iconStyles.shareArrow} />
    </View>
  </View>
);

const PlayIcon = () => (
  <View style={iconStyles.playContainer}>
    <View style={iconStyles.playTriangle} />
  </View>
);

const PauseIcon = () => (
  <View style={iconStyles.pauseContainer}>
    <View style={iconStyles.pauseBar} />
    <View style={iconStyles.pauseBar} />
  </View>
);

export default function VideoViewerScreen() {
  const navigation = useNavigation<VideoViewerScreenNavigationProp>();
  const route = useRoute<VideoViewerScreenRouteProp>();
  const { video } = route.params;

  const [paused, setPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration || 0);
  const [showControls, setShowControls] = useState(true);
  const videoRef = useRef<VideoRef>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  // Swipe down to close gesture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
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

  const toggleControls = () => {
    const toValue = showControls ? 0 : 1;
    Animated.timing(fadeAnim, {
      toValue,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setShowControls(!showControls);
  };

  const togglePlayPause = () => {
    setPaused(!paused);
  };

  const handleProgress = (data: OnProgressData) => {
    setCurrentTime(data.currentTime);
  };

  const handleLoad = (data: OnLoadData) => {
    setDuration(data.duration);
  };

  const handleEnd = () => {
    setPaused(true);
    videoRef.current?.seek(0);
    setCurrentTime(0);
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Video",
      "This video will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteVideo(video.id);
            navigation.goBack();
          }
        }
      ]
    );
  };

  const handleShare = async () => {
    try {
      const shareOptions = Platform.select({
        ios: { url: video.uri },
        android: { message: 'Check out this video!', url: video.uri },
      });
      await Share.share(shareOptions as any);
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

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
        <TouchableOpacity
          activeOpacity={1}
          onPress={toggleControls}
          style={styles.videoContainer}
        >
          <Video
            ref={videoRef}
            source={{ uri: video.uri }}
            style={styles.video}
            resizeMode="contain"
            paused={paused}
            onProgress={handleProgress}
            onLoad={handleLoad}
            onEnd={handleEnd}
            repeat={false}
          />

          {/* Center Play/Pause Button */}
          {paused && (
            <TouchableOpacity
              style={styles.centerPlayButton}
              onPress={togglePlayPause}
            >
              <View style={styles.centerPlayCircle}>
                <PlayIcon />
              </View>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Swipe Down Hint */}
      <View style={styles.swipeHint}>
        <View style={styles.swipeHintBar} />
      </View>

      {/* Top Bar */}
      <Animated.View style={[styles.topBar, { opacity: fadeAnim }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topButton}>
          <BackIcon />
        </TouchableOpacity>

        <View style={styles.videoBadge}>
          <View style={styles.videoDot} />
          <Text style={styles.videoBadgeText}>VIDEO</Text>
        </View>
      </Animated.View>

      {/* Bottom Bar */}
      <Animated.View style={[styles.bottomBar, { opacity: fadeAnim }]}>
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>

        {/* Play/Pause */}
        <TouchableOpacity style={styles.playPauseButton} onPress={togglePlayPause}>
          {paused ? <PlayIcon /> : <PauseIcon />}
        </TouchableOpacity>

        {/* Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={handleDelete} style={styles.actionButton}>
            <DeleteIcon />
            <Text style={styles.actionLabel}>Delete</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
            <ShareIcon />
            <Text style={styles.actionLabel}>Share</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
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
  playContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderLeftColor: COLORS.white,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 4,
  },
  pauseContainer: {
    width: 24,
    height: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  pauseBar: {
    width: 5,
    height: 18,
    backgroundColor: COLORS.white,
    borderRadius: 2,
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
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  centerPlayButton: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerPlayCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  videoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  videoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
    marginRight: 6,
  },
  videoBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
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
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeText: {
    color: COLORS.text,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    width: 40,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 2,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  playPauseButton: {
    alignSelf: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
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
});
