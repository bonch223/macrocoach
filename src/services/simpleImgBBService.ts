import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { ImgBBService } from './imgbbService';

export class SimpleImgBBService {
  /**
   * Upload photo with ImgBB only (no Firestore metadata)
   */
  static async uploadPhoto(
    imageUri: string,
    clientId: string,
    type: 'weight' | 'progress' | 'client',
    notes?: string
  ): Promise<string> {
    try {
      console.log('Starting simple ImgBB photo upload:', { imageUri, clientId, type });
      
      // 1. Compress and save locally first
      const localUri = await this.compressAndSaveLocally(imageUri, clientId, type);
      console.log('Image saved locally:', localUri);
      
      // 2. Upload to ImgBB for cross-device access
      const imgbbResult = await ImgBBService.uploadImage(imageUri, clientId, type);
      
      if (imgbbResult.success && imgbbResult.url) {
        console.log('ImgBB upload successful:', imgbbResult.url);
        return imgbbResult.url; // Return ImgBB URL directly
      } else {
        console.warn('ImgBB upload failed, but local storage succeeded:', imgbbResult.error);
        return localUri; // Fallback to local URI
      }
    } catch (error) {
      console.error('Error in simple photo upload:', error);
      throw new Error(`Failed to upload photo: ${error.message}`);
    }
  }
  
  /**
   * Get photo URI (local or ImgBB)
   */
  static async getPhoto(photoUri: string): Promise<string | null> {
    try {
      console.log('Getting photo:', photoUri);
      
      // If it's already an ImgBB URL, return it
      if (photoUri.startsWith('http')) {
        return photoUri;
      }
      
      // If it's a local file, check if it exists
      if (Platform.OS !== 'web') {
        const fileInfo = await FileSystem.getInfoAsync(photoUri);
        if (fileInfo.exists) {
          return photoUri;
        }
      }
      
      console.log('Photo not found');
      return null;
    } catch (error) {
      console.error('Error getting photo:', error);
      return null;
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
}
