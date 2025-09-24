import { RailwayStorageService } from './railwayStorageService';
import { FirestoreService } from './firestoreService';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

export interface PhotoMetadata {
  id: string;
  clientId: string;
  type: 'weight' | 'progress' | 'client';
  date: Date;
  notes?: string;
  localUri?: string;
  railwayUrl?: string;
  uploadedBy: string; // Device ID or user ID
  timestamp: Date;
}

export class HybridPhotoService {
  /**
   * Upload photo with hybrid storage (local + Railway)
   */
  static async uploadPhoto(
    imageUri: string,
    clientId: string,
    type: 'weight' | 'progress' | 'client',
    notes?: string
  ): Promise<string> {
    try {
      console.log('Starting hybrid photo upload:', { imageUri, clientId, type });
      
      // 1. Save locally first for immediate access
      const localUri = await RailwayStorageService.saveImageLocally(imageUri, clientId, type);
      console.log('Image saved locally:', localUri);
      
      // 2. Upload to Railway for cross-device access
      const railwayResult = await RailwayStorageService.uploadImage(imageUri, clientId, type);
      
      if (!railwayResult.success) {
        console.warn('Railway upload failed, but local storage succeeded:', railwayResult.error);
      }
      
      // 3. Save metadata to Firestore
      const photoMetadata: PhotoMetadata = {
        id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        clientId,
        type,
        date: new Date(),
        notes: notes || '',
        localUri,
        railwayUrl: railwayResult.url,
        uploadedBy: await this.getDeviceId(),
        timestamp: new Date(),
      };
      
      // Save to Firestore
      await FirestoreService.addPhotoMetadata(photoMetadata);
      
      console.log('Photo upload completed:', photoMetadata.id);
      return photoMetadata.id;
    } catch (error) {
      console.error('Error in hybrid photo upload:', error);
      throw new Error(`Failed to upload photo: ${error.message}`);
    }
  }
  
  /**
   * Get photo with fallback logic (local -> Railway -> error)
   */
  static async getPhoto(photoId: string): Promise<string | null> {
    try {
      console.log('Getting photo:', photoId);
      
      // 1. Get photo metadata from Firestore
      const metadata = await FirestoreService.getPhotoMetadata(photoId);
      if (!metadata) {
        console.log('Photo metadata not found');
        return null;
      }
      
      // 2. Try local storage first (if this device uploaded it)
      if (metadata.localUri && await this.isCurrentDevice(metadata.uploadedBy)) {
        const localExists = await RailwayStorageService.localImageExists(metadata.localUri);
        if (localExists) {
          console.log('Using local image');
          return metadata.localUri;
        }
      }
      
      // 3. Fallback to Railway storage
      if (metadata.railwayUrl) {
        console.log('Fetching from Railway storage');
        const railwayResult = await RailwayStorageService.downloadImage(metadata.railwayUrl);
        
        if (railwayResult.success && railwayResult.data) {
          // Convert base64 to local URI for display
          const localUri = await this.base64ToLocalUri(railwayResult.data, photoId);
          console.log('Image retrieved from Railway and saved locally');
          return localUri;
        }
      }
      
      console.log('No image found in local or Railway storage');
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
  ): Promise<PhotoMetadata[]> {
    try {
      const photos = await FirestoreService.getClientPhotoMetadata(clientId, type);
      
      // Process each photo to get display URIs
      const processedPhotos = await Promise.all(
        photos.map(async (photo) => {
          try {
            const displayUri = await this.getPhoto(photo.id);
            return {
              ...photo,
              displayUri,
            };
          } catch (error) {
            console.error('Error processing photo:', photo.id, error);
            return photo;
          }
        })
      );
      
      return processedPhotos;
    } catch (error) {
      console.error('Error getting client photos:', error);
      return [];
    }
  }
  
  /**
   * Delete photo from all storage locations
   */
  static async deletePhoto(photoId: string): Promise<boolean> {
    try {
      console.log('Deleting photo:', photoId);
      
      // 1. Get metadata
      const metadata = await FirestoreService.getPhotoMetadata(photoId);
      if (!metadata) {
        console.log('Photo metadata not found');
        return false;
      }
      
      // 2. Delete from Railway if URL exists
      if (metadata.railwayUrl) {
        await RailwayStorageService.deleteImage(metadata.railwayUrl);
      }
      
      // 3. Delete local file if it exists
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
      
      // 4. Delete metadata from Firestore
      await FirestoreService.deletePhotoMetadata(photoId);
      
      console.log('Photo deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting photo:', error);
      return false;
    }
  }
  
  /**
   * Convert base64 to local URI for display
   */
  private static async base64ToLocalUri(base64Data: string, photoId: string): Promise<string> {
    try {
      if (Platform.OS === 'web') {
        return `data:image/jpeg;base64,${base64Data}`;
      }
      
      const fileName = `photo_${photoId}.jpg`;
      const localUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(localUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      return localUri;
    } catch (error) {
      console.error('Error converting base64 to local URI:', error);
      throw error;
    }
  }
  
  /**
   * Get device ID for tracking uploads
   */
  private static async getDeviceId(): Promise<string> {
    try {
      // For now, use a simple device ID
      // In production, you might want to use a more sophisticated approach
      const deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return deviceId;
    } catch (error) {
      console.error('Error getting device ID:', error);
      return `device_${Date.now()}`;
    }
  }
  
  /**
   * Check if current device uploaded the photo
   */
  private static async isCurrentDevice(uploadedBy: string): Promise<boolean> {
    try {
      const currentDeviceId = await this.getDeviceId();
      return uploadedBy === currentDeviceId;
    } catch (error) {
      console.error('Error checking device ID:', error);
      return false;
    }
  }
}
