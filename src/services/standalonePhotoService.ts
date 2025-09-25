import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { ImgBBService } from './imgbbService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PhotoRecord {
  id: string;
  clientId: string;
  type: 'weight' | 'progress' | 'client';
  localUri?: string;
  imgbbUrl?: string;
  date: string;
  notes?: string;
  timestamp: number;
}

export class StandalonePhotoService {
  private static readonly STORAGE_KEY = 'macrocoach_photos';

  /**
   * Upload photo with local storage + ImgBB (no Firestore)
   */
  static async uploadPhoto(
    imageUri: string,
    clientId: string,
    type: 'weight' | 'progress' | 'client',
    notes?: string
  ): Promise<string> {
    try {
      console.log('Starting standalone photo upload:', { imageUri, clientId, type });
      
      // 1. Compress and save locally
      const localUri = await this.compressAndSaveLocally(imageUri, clientId, type);
      console.log('Image saved locally:', localUri);
      
      // 2. Upload to ImgBB
      let imgbbUrl: string | undefined = undefined;
      try {
        const imgbbResult = await ImgBBService.uploadImage(imageUri, clientId, type);
        if (imgbbResult.success && imgbbResult.url) {
          imgbbUrl = imgbbResult.url;
          console.log('ImgBB upload successful:', imgbbUrl);
        } else {
          console.warn('ImgBB upload failed:', imgbbResult.error);
        }
      } catch (imgbbError) {
        console.warn('ImgBB upload error:', imgbbError);
      }
      
      // 3. Create photo record
      const photoRecord: PhotoRecord = {
        id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        clientId,
        type,
        localUri,
        imgbbUrl,
        date: new Date().toISOString(),
        notes: notes || '',
        timestamp: Date.now(),
      };
      
      // 4. Save to local storage
      await this.savePhotoRecord(photoRecord);
      
      console.log('Photo upload completed:', photoRecord.id);
      
      // Return the photoId so we can retrieve the photo later
      return photoRecord.id;
    } catch (error) {
      console.error('Error in standalone photo upload:', error);
      throw new Error(`Failed to upload photo: ${error.message}`);
    }
  }
  
  /**
   * Get photo URI (local or ImgBB)
   */
  static async getPhoto(photoId: string): Promise<string | null> {
    try {
      console.log('Getting photo:', photoId);
      
      const photoRecord = await this.getPhotoRecord(photoId);
      if (!photoRecord) {
        console.log('Photo record not found');
        return null;
      }
      
      // Try local first
      if (photoRecord.localUri && await this.localImageExists(photoRecord.localUri)) {
        console.log('Using local image');
        return photoRecord.localUri;
      }
      
      // Fallback to ImgBB
      if (photoRecord.imgbbUrl) {
        console.log('Using ImgBB image');
        return photoRecord.imgbbUrl;
      }
      
      console.log('No image found');
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
  ): Promise<PhotoRecord[]> {
    try {
      const allPhotos = await this.getAllPhotoRecords();
      let filteredPhotos = allPhotos.filter(photo => photo.clientId === clientId);
      
      if (type) {
        filteredPhotos = filteredPhotos.filter(photo => photo.type === type);
      }
      
      // Sort by timestamp (newest first)
      return filteredPhotos.sort((a, b) => b.timestamp - a.timestamp);
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
      console.log('Deleting photo:', photoId);
      
      const photoRecord = await this.getPhotoRecord(photoId);
      if (!photoRecord) {
        console.log('Photo record not found');
        return false;
      }
      
      // Delete local file if it exists
      if (photoRecord.localUri && Platform.OS !== 'web') {
        try {
          const fileInfo = await FileSystem.getInfoAsync(photoRecord.localUri);
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(photoRecord.localUri);
          }
        } catch (error) {
          console.warn('Error deleting local file:', error);
        }
      }
      
      // Remove from local storage
      await this.deletePhotoRecord(photoId);
      
      console.log('Photo deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting photo:', error);
      return false;
    }
  }
  
  /**
   * Compress and save image locally
   */
  private static async compressAndSaveLocally(
    imageUri: string,
    clientId: string,
    type: 'weight' | 'progress' | 'client'
  ): Promise<string> {
    try {
      // Compress the image
      const compressedResult = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 400, height: 400 } }], // Resize to max 400x400
        { 
          compress: 0.7, // 70% quality
          format: ImageManipulator.SaveFormat.JPEG 
        }
      );
      
      if (Platform.OS === 'web') {
        // For web, return the compressed URI
        return compressedResult.uri;
      }
      
      // For native, save to a hidden folder
      const fileName = `${clientId}_${type}_${Date.now()}.jpg`;
      const hiddenFolder = `${FileSystem.documentDirectory}hidden_photos/`;
      
      // Ensure hidden folder exists
      await FileSystem.makeDirectoryAsync(hiddenFolder, { intermediates: true });
      
      const localUri = `${hiddenFolder}${fileName}`;
      
      // Copy compressed image to hidden folder
      await FileSystem.copyAsync({
        from: compressedResult.uri,
        to: localUri,
      });
      
      console.log('Image compressed and saved to hidden folder:', localUri);
      return localUri;
    } catch (error) {
      console.error('Error compressing and saving locally:', error);
      throw error;
    }
  }
  
  /**
   * Check if local image exists
   */
  private static async localImageExists(localUri: string): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        // For web, assume it exists if it's a data URI or valid URL
        return localUri.startsWith('data:') || localUri.startsWith('http');
      }
      
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      return fileInfo.exists;
    } catch (error) {
      console.error('Error checking local image:', error);
      return false;
    }
  }
  
  /**
   * Save photo record to local storage
   */
  private static async savePhotoRecord(photoRecord: PhotoRecord): Promise<void> {
    try {
      const allPhotos = await this.getAllPhotoRecords();
      const existingIndex = allPhotos.findIndex(photo => photo.id === photoRecord.id);
      
      if (existingIndex >= 0) {
        allPhotos[existingIndex] = photoRecord;
      } else {
        allPhotos.push(photoRecord);
      }
      
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(allPhotos));
    } catch (error) {
      console.error('Error saving photo record:', error);
      throw error;
    }
  }
  
  /**
   * Get photo record from local storage
   */
  private static async getPhotoRecord(photoId: string): Promise<PhotoRecord | null> {
    try {
      const allPhotos = await this.getAllPhotoRecords();
      return allPhotos.find(photo => photo.id === photoId) || null;
    } catch (error) {
      console.error('Error getting photo record:', error);
      return null;
    }
  }
  
  /**
   * Get all photo records from local storage
   */
  private static async getAllPhotoRecords(): Promise<PhotoRecord[]> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting all photo records:', error);
      return [];
    }
  }
  
  /**
   * Delete photo record from local storage
   */
  private static async deletePhotoRecord(photoId: string): Promise<void> {
    try {
      const allPhotos = await this.getAllPhotoRecords();
      const filteredPhotos = allPhotos.filter(photo => photo.id !== photoId);
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredPhotos));
    } catch (error) {
      console.error('Error deleting photo record:', error);
      throw error;
    }
  }
}
