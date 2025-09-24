import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

export class LocalStorageService {
  private static readonly PHOTOS_KEY = 'macrocoach_photos';
  private static readonly PHOTOS_DIR = `${FileSystem.documentDirectory}macrocoach_photos/`;

  /**
   * Initialize the photos directory
   */
  static async initialize(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.PHOTOS_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.PHOTOS_DIR, { intermediates: true });
      }
    } catch (error) {
      console.error('Error initializing photos directory:', error);
    }
  }

  /**
   * Save a photo locally and return a local URI
   */
  static async savePhoto(
    sourceUri: string, 
    clientId: string, 
    type: 'weight' | 'progress' | 'client',
    date?: Date
  ): Promise<string> {
    try {
      await this.initialize();
      
      const timestamp = Date.now();
      const dateStr = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const fileName = `${type}_${clientId}_${dateStr}_${timestamp}.jpg`;
      const localPath = `${this.PHOTOS_DIR}${fileName}`;
      
      // Copy the file to our local directory
      await FileSystem.copyAsync({
        from: sourceUri,
        to: localPath
      });
      
      // Store metadata in AsyncStorage
      const photoMetadata = {
        id: `${clientId}_${timestamp}`,
        clientId,
        type,
        date: date ? date.toISOString() : new Date().toISOString(),
        localPath,
        fileName,
        timestamp
      };
      
      await this.savePhotoMetadata(photoMetadata);
      
      return localPath;
    } catch (error) {
      console.error('Error saving photo locally:', error);
      throw new Error(`Failed to save photo locally: ${error.message}`);
    }
  }

  /**
   * Save photo metadata to AsyncStorage
   */
  private static async savePhotoMetadata(metadata: any): Promise<void> {
    try {
      const existingPhotos = await this.getAllPhotoMetadata();
      existingPhotos.push(metadata);
      await AsyncStorage.setItem(this.PHOTOS_KEY, JSON.stringify(existingPhotos));
    } catch (error) {
      console.error('Error saving photo metadata:', error);
    }
  }

  /**
   * Get all photo metadata
   */
  static async getAllPhotoMetadata(): Promise<any[]> {
    try {
      const photosJson = await AsyncStorage.getItem(this.PHOTOS_KEY);
      return photosJson ? JSON.parse(photosJson) : [];
    } catch (error) {
      console.error('Error getting photo metadata:', error);
      return [];
    }
  }

  /**
   * Get photos for a specific client
   */
  static async getClientPhotos(clientId: string, type?: 'weight' | 'progress' | 'client'): Promise<any[]> {
    try {
      const allPhotos = await this.getAllPhotoMetadata();
      return allPhotos.filter(photo => 
        photo.clientId === clientId && 
        (!type || photo.type === type)
      );
    } catch (error) {
      console.error('Error getting client photos:', error);
      return [];
    }
  }

  /**
   * Delete a photo
   */
  static async deletePhoto(photoId: string): Promise<void> {
    try {
      const allPhotos = await this.getAllPhotoMetadata();
      const photoIndex = allPhotos.findIndex(photo => photo.id === photoId);
      
      if (photoIndex !== -1) {
        const photo = allPhotos[photoIndex];
        
        // Delete the file
        try {
          await FileSystem.deleteAsync(photo.localPath);
        } catch (fileError) {
          console.warn('Could not delete photo file:', fileError);
        }
        
        // Remove from metadata
        allPhotos.splice(photoIndex, 1);
        await AsyncStorage.setItem(this.PHOTOS_KEY, JSON.stringify(allPhotos));
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
    }
  }

  /**
   * Check if a URI is a local file
   */
  static isLocalFile(uri: string): boolean {
    return uri.startsWith('file://') || uri.includes('macrocoach_photos');
  }

  /**
   * Get photo info
   */
  static async getPhotoInfo(uri: string): Promise<any> {
    try {
      const allPhotos = await this.getAllPhotoMetadata();
      return allPhotos.find(photo => photo.localPath === uri);
    } catch (error) {
      console.error('Error getting photo info:', error);
      return null;
    }
  }

  /**
   * Clean up old photos (optional maintenance)
   */
  static async cleanupOldPhotos(daysOld: number = 30): Promise<void> {
    try {
      const allPhotos = await this.getAllPhotoMetadata();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const oldPhotos = allPhotos.filter(photo => 
        new Date(photo.timestamp) < cutoffDate
      );
      
      for (const photo of oldPhotos) {
        await this.deletePhoto(photo.id);
      }
      
      console.log(`Cleaned up ${oldPhotos.length} old photos`);
    } catch (error) {
      console.error('Error cleaning up old photos:', error);
    }
  }
}
