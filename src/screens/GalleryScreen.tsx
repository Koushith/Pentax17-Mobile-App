import React, { useCallback, useState } from 'react';
import { View, FlatList, Image, TouchableOpacity, StyleSheet, Dimensions, Text } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Photo } from '../types';
import { getPhotos } from '../services/storage';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_SIZE = width / COLUMN_COUNT;

type GalleryScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Gallery'>;

export default function GalleryScreen() {
  const navigation = useNavigation<GalleryScreenNavigationProp>();
  const [photos, setPhotos] = useState<Photo[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadPhotos();
    }, [])
  );

  const loadPhotos = async () => {
    const loadedPhotos = await getPhotos();
    setPhotos(loadedPhotos);
  };

  const renderItem = ({ item }: { item: Photo }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('PhotoViewer', { photo: item })}
      style={styles.itemContainer}
    >
      <Image source={{ uri: item.uri }} style={styles.thumbnail} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>FILM ROLL</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <FlatList
        data={photos}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={COLUMN_COUNT}
        contentContainerStyle={styles.gridContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    height: 100,
    paddingTop: 50,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerTitle: {
    color: '#E0E0E0',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 3,
    fontFamily: 'Courier', 
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '300',
  },
  gridContent: {
    paddingTop: 2,
  },
  itemContainer: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    padding: 1, // Gap
  },
  thumbnail: {
    flex: 1,
    backgroundColor: '#222',
  },
});
