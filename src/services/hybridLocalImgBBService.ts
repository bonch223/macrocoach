import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { FirestoreService } from './firestoreService';
import { ImgBBService } from './imgbbService';

export interface PhotoMetadata {
  id: string;
  clientId: string;
  type: 'weight' | 'progress' | 'client';
  date: Date;
  notes?: string;
  localUri?: string;
  imgbbUrl?: string;
  uploadedBy: string; // Device ID
  timestamp: Date;
}

export class HybridLocalImgBBService {
  /**
   * Upload photo with hybrid storage (local + ImgBB)
   */
  static async uploadPhoto(
    imageUri: string,
    clientId: string,
    type: 'weight' | 'progress' | 'client',
    notes?: string
  ): Promise<string> {
    try {
      console.log('Starting hybrid photo upload:', { imageUri, clientId, type });
      
      // 1. Compress and save locally first
      const localUri = await this.compressAndSaveLocally(imageUri, clientId, type);
      console.log('Image saved locally:', localUri);
      
      // 2. Upload to ImgBB for backup and cross-device access
      const imgbbResult = await ImgBBService.uploadImage(imageUri, clientId, type);
      
      let imgbbUrl: string | undefined = undefined;
      if (imgbbResult.success && imgbbResult.url) {
        imgbbUrl = imgbbResult.url;
        console.log('ImgBB upload successful:', imgbbUrl);
      } else {
        console.warn('ImgBB upload failed, but local storage succeeded:', imgbbResult.error);
      }
      
      // 3. Save metadata to Firestore
      const photoMetadata: PhotoMetadata = {
        id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        clientId,
        type,
        date: new Date(),
        notes: notes || '',
        localUri,
        imgbbUrl,
        uploadedBy: await this.getDeviceId(),
        timestamp: new Date(),
      };
      
      await FirestoreService.addPhotoMetadata(photoMetadata);
      
      console.log('Photo upload completed:', photoMetadata.id);
      return photoMetadata.id;
    } catch (error) {
      console.error('Error in hybrid photo upload:', error);
      throw new Error(`Failed to upload photo: ${error.message}`);
    }
  }
  
  /**
   * Get photo with smart fallback (local -> ImgBB -> error)
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
        const localExists = await this.localImageExists(metadata.localUri);
        if (localExists) {
          console.log('Using local image');
          return metadata.localUri;
        }
      }
      
      // 3. Fallback to ImgBB
      if (metadata.imgbbUrl) {
        console.log('Fetching from ImgBB');
        return metadata.imgbbUrl;
      }
      
      console.log('No image found in local or ImgBB storage');
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
      
      // 2. Delete from ImgBB if URL exists
      if (metadata.imgbbUrl) {
        await ImgBBService.deleteImage(metadata.imgbbUrl);
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
