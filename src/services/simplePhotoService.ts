import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { FirestoreService } from './firestoreService';

export class SimplePhotoService {
  /**
   * Save photo locally and store metadata in Firestore
   */
  static async savePhoto(
    imageUri: string,
    clientId: string,
    type: 'weight' | 'progress' | 'client',
    notes?: string
  ): Promise<string> {
    try {
      console.log('Saving photo locally:', { imageUri, clientId, type });
      
      // Generate unique filename
      const fileName = `${clientId}_${type}_${Date.now()}.jpg`;
      let localUri: string;

      if (Platform.OS === 'web') {
        // For web, use the original URI
        localUri = imageUri;
      } else {
        // For native, copy to local storage
        const localPath = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.copyAsync({
          from: imageUri,
          to: localPath,
        });
        localUri = localPath;
      }

      // Save metadata to Firestore
      const photoMetadata = {
        id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        clientId,
        type,
        date: new Date(),
        notes: notes || '',
        localUri,
        uploadedBy: await this.getDeviceId(),
        timestamp: new Date(),
      };

      await FirestoreService.addPhotoMetadata(photoMetadata);
      
      console.log('Photo saved successfully:', photoMetadata.id);
      return photoMetadata.id;
    } catch (error) {
      console.error('Error saving photo:', error);
      throw new Error(`Failed to save photo: ${error.message}`);
    }
  }

  /**
   * Get photo URI (local only)
   */
  static async getPhoto(photoId: string): Promise<string | null> {
    try {
      const metadata = await FirestoreService.getPhotoMetadata(photoId);
      if (!metadata || !metadata.localUri) {
        return null;
      }

      // Check if local file exists
      if (Platform.OS === 'web') {
        return metadata.localUri;
      }

      const fileInfo = await FileSystem.getInfoAsync(metadata.localUri);
      if (fileInfo.exists) {
        return metadata.localUri;
      }

      console.log('Local file not found:', metadata.localUri);
      return null;
    } catch (error) {
      console.error('Error getting photo:', error);
      return null;
    }
  }

  /**
   * Get all photos for a client
   */
  static async getClientPhotos(
    clientId: string, 
    type?: 'weight' | 'progress' | 'client'
  ): Promise<any[]> {
    try {
      const photos = await FirestoreService.getClientPhotoMetadata(clientId, type);
      
      // Check which photos still exist locally
      const validPhotos = await Promise.all(
        photos.map(async (photo) => {
          const photoUri = await this.getPhoto(photo.id);
          return {
            ...photo,
            displayUri: photoUri,
            exists: !!photoUri,
          };
        })
      );

      return validPhotos;
    } catch (error) {
      console.error('Error getting client photos:', error);
      return [];
    }
  }

  /**
   * Delete photo
   */
  static async deletePhoto(photoId: string): Promise<boolean> {
    try {
      const metadata = await FirestoreService.getPhotoMetadata(photoId);
      if (!metadata) {
        return false;
      }

      // Delete local file if it exists
      if (metadata.localUri && Platform.OS !== 'web') {
        try {
          const fileInfo = await FileSystem.getInfoAsync(metadata.localUri);
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(metadata.localUri);
          }
        } catch (error) {
          console.warn('Error deleting local file:', error);
        }
      }

      // Delete metadata from Firestore
      await FirestoreService.deletePhotoMetadata(photoId);
      
      console.log('Photo deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting photo:', error);
      return false;
    }
  }

  /**
   * Get device ID for tracking
   */
  private static async getDeviceId(): Promise<string> {
    try {
      return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    } catch (error) {
      return `device_${Date.now()}`;
    }
  }
}
