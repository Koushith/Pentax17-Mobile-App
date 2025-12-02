import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { deletePhoto } from '../services/storage';

type PhotoViewerScreenRouteProp = RouteProp<RootStackParamList, 'PhotoViewer'>;
type PhotoViewerScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PhotoViewer'>;

export default function PhotoViewerScreen() {
  const navigation = useNavigation<PhotoViewerScreenNavigationProp>();
  const route = useRoute<PhotoViewerScreenRouteProp>();
  const { photo } = route.params;

  const handleDelete = () => {
    Alert.alert(
      "Delete Photo",
      "Are you sure you want to delete this photo?",
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

  return (
    <View style={styles.container}>
      <Image source={{ uri: photo.uri }} style={styles.image} resizeMode="contain" />
      
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.button}>
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete} style={styles.button}>
          <Text style={[styles.buttonText, { color: 'red' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  image: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  button: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
