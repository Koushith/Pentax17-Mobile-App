import React, { useCallback, useState } from 'react';
import { View, FlatList, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
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
      <FlatList
        data={photos}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={COLUMN_COUNT}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  itemContainer: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    padding: 1,
  },
  thumbnail: {
    flex: 1,
    backgroundColor: '#333',
  },
});
