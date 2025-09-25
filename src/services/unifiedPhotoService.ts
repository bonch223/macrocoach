import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { ImgBBService } from './imgbbService';
import { FirestoreService } from './firestoreService';

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

export class UnifiedPhotoService {

  /**
   * Upload photo with unified storage (local + ImgBB)
   * Returns photoId for consistent API
   */
  static async uploadPhoto(
    imageUri: string,
    clientId: string,
    type: 'weight' | 'progress' | 'client',
    notes?: string
  ): Promise<string> {
    try {
      console.log('Starting unified photo upload:', { imageUri, clientId, type });
      
      // 1. Compress and save locally (if possible)
      let localUri: string | undefined = undefined;
      try {
        localUri = await this.compressAndSaveLocally(imageUri, clientId, type);
        console.log('Image saved locally:', localUri);
      } catch (localError) {
        console.warn('Local storage failed:', localError);
        // Continue without local storage
      }
      
      // 2. Upload to ImgBB for cross-device access
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
      const photoRecord: Omit<PhotoRecord, 'id'> = {
        clientId,
        type,
        localUri,
        imgbbUrl,
        date: new Date().toISOString(),
        notes: notes || '',
        timestamp: Date.now(),
      };
      
      // 4. Save to Firestore and get the document ID
      console.log('Saving photo record to Firestore:', photoRecord);
      const photoId = await this.savePhotoRecord(photoRecord);
      console.log('Photo record saved with ID:', photoId);
      
      console.log('Photo upload completed:', photoId);
      
      // Return the photoId for consistent API
      return photoId;
    } catch (error) {
      console.error('Error in unified photo upload:', error);
      throw new Error(`Failed to upload photo: ${error.message}`);
    }
  }
  
  /**
   * Get photo URI with smart fallback (local -> ImgBB)
   * This is the key method that handles cross-device compatibility
   */
  static async getPhoto(photoId: string): Promise<string | null> {
    try {
      console.log('Getting photo:', photoId);
      
      const photoRecord = await this.getPhotoRecord(photoId);
      console.log('Photo record retrieved:', photoRecord);
      if (!photoRecord) {
        console.log('Photo record not found');
        return null;
      }
      
      // 1. Try local file first (if it exists and is accessible)
      if (photoRecord.localUri && await this.localImageExists(photoRecord.localUri)) {
        console.log('Using local image:', photoRecord.localUri);
        return photoRecord.localUri;
      }
      
      // 2. Fallback to ImgBB URL (works across all devices)
      if (photoRecord.imgbbUrl) {
        console.log('Using ImgBB image:', photoRecord.imgbbUrl);
        return photoRecord.imgbbUrl;
      }
      
      console.log('No image found (local or ImgBB)');
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
   * Delete photo from all storage locations
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
      
      // Note: We don't delete from ImgBB as it's a free service
      // and the URLs will eventually expire
      
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
   * Compress and save image locally with aggressive optimization
   */
  private static async compressAndSaveLocally(
    imageUri: string,
    clientId: string,
    type: 'weight' | 'progress' | 'client'
  ): Promise<string> {
    try {
      // Aggressive compression for smallest file size
      const compressedResult = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 300, height: 300 } }], // Smaller size for better compression
        { 
          compress: 0.5, // 50% quality for smaller file size
          format: ImageManipulator.SaveFormat.JPEG 
        }
      );
      
      if (Platform.OS === 'web') {
        // For web, return the compressed URI (data URI)
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
   * Check if local image exists and is accessible
   */
  private static async localImageExists(localUri: string): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        // For web, check if it's a valid data URI or URL
        return localUri.startsWith('data:') || localUri.startsWith('http');
      }
      
      // For native, check if file exists
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      return fileInfo.exists;
    } catch (error) {
      console.error('Error checking local image:', error);
      return false;
    }
  }
  
  /**
   * Save photo record to Firestore
   */
  private static async savePhotoRecord(photoRecord: Omit<PhotoRecord, 'id'>): Promise<string> {
    try {
      return await FirestoreService.addPhotoMetadata(photoRecord);
    } catch (error) {
      console.error('Error saving photo record:', error);
      throw error;
    }
  }
  
  /**
   * Get photo record from Firestore
   */
  private static async getPhotoRecord(photoId: string): Promise<PhotoRecord | null> {
    try {
      console.log('Fetching photo metadata from Firestore for ID:', photoId);
      const result = await FirestoreService.getPhotoMetadata(photoId);
      console.log('Firestore returned:', result);
      return result;
    } catch (error) {
      console.error('Error getting photo record:', error);
      return null;
    }
  }
  
  /**
   * Get all photo records from Firestore
   */
  private static async getAllPhotoRecords(): Promise<PhotoRecord[]> {
    try {
      // This method is not used in the current implementation
      // but kept for compatibility
      return [];
    } catch (error) {
      console.error('Error getting all photo records:', error);
      return [];
    }
  }
  
  /**
   * Delete photo record from Firestore
   */
  private static async deletePhotoRecord(photoId: string): Promise<void> {
    try {
      await FirestoreService.deletePhotoMetadata(photoId);
    } catch (error) {
      console.error('Error deleting photo record:', error);
      throw error;
    }
  }
}
