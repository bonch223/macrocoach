import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  UploadResult 
} from 'firebase/storage';
import { storage } from '../../firebase.config';

export class StorageService {
  /**
   * Upload an image to Firebase Storage
   * @param fileUri - Local file URI from ImagePicker or ImageManipulator
   * @param path - Storage path (e.g., 'client-photos', 'progress-photos')
   * @param fileName - Optional custom filename, defaults to timestamp
   * @returns Promise<string> - Download URL
   */
  static async uploadImage(
    fileUri: string, 
    path: string, 
    fileName?: string
  ): Promise<string> {
    try {
      console.log('Starting image upload:', { fileUri, path, fileName });
      
      // Convert file URI to blob
      const response = await fetch(fileUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      console.log('Blob created:', { size: blob.size, type: blob.type });
      
      // Generate filename if not provided
      const timestamp = Date.now();
      const finalFileName = fileName || `image_${timestamp}.jpg`;
      
      // Create storage reference
      const storageRef = ref(storage, `${path}/${finalFileName}`);
      console.log('Storage reference created:', `${path}/${finalFileName}`);
      
      // Upload the blob
      const uploadResult: UploadResult = await uploadBytes(storageRef, blob);
      console.log('Upload completed:', uploadResult);
      
      // Get download URL
      const downloadURL = await getDownloadURL(uploadResult.ref);
      console.log('Download URL obtained:', downloadURL);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  /**
   * Upload client photo
   * @param fileUri - Local file URI
   * @param clientId - Client ID for unique filename
   * @returns Promise<string> - Download URL
   */
  static async uploadClientPhoto(fileUri: string, clientId: string): Promise<string> {
    const fileName = `client_${clientId}_${Date.now()}.jpg`;
    return this.uploadImage(fileUri, 'client-photos', fileName);
  }

  /**
   * Upload progress photo
   * @param fileUri - Local file URI
   * @param clientId - Client ID
   * @param date - Optional date for filename
   * @returns Promise<string> - Download URL
   */
  static async uploadProgressPhoto(
    fileUri: string, 
    clientId: string, 
    date?: Date
  ): Promise<string> {
    const dateStr = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const fileName = `progress_${clientId}_${dateStr}_${Date.now()}.jpg`;
    return this.uploadImage(fileUri, 'progress-photos', fileName);
  }

  /**
   * Upload weight check photo
   * @param fileUri - Local file URI
   * @param clientId - Client ID
   * @param date - Optional date for filename
   * @returns Promise<string> - Download URL
   */
  static async uploadWeightPhoto(
    fileUri: string, 
    clientId: string, 
    date?: Date
  ): Promise<string> {
    const dateStr = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const fileName = `weight_${clientId}_${dateStr}_${Date.now()}.jpg`;
    return this.uploadImage(fileUri, 'weight-photos', fileName);
  }

  /**
   * Delete an image from Firebase Storage
   * @param downloadURL - The download URL of the image to delete
   */
  static async deleteImage(downloadURL: string): Promise<void> {
    try {
      // Extract the path from the download URL
      const url = new URL(downloadURL);
      const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
      
      if (!pathMatch) {
        throw new Error('Invalid download URL format');
      }
      
      // Decode the path (Firebase Storage URLs are encoded)
      const decodedPath = decodeURIComponent(pathMatch[1]);
      
      // Create storage reference
      const storageRef = ref(storage, decodedPath);
      
      // Delete the file
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting image:', error);
      throw new Error(`Failed to delete image: ${error}`);
    }
  }

  /**
   * Check if a URL is a Firebase Storage URL
   * @param url - URL to check
   * @returns boolean
   */
  static isFirebaseStorageURL(url: string): boolean {
    return url.includes('firebasestorage.googleapis.com') || url.includes('firebase.storage');
  }

  /**
   * Check if a URL is a local file URI
   * @param url - URL to check
   * @returns boolean
   */
  static isLocalFileURI(url: string): boolean {
    return url.startsWith('file://') || url.startsWith('content://');
  }

  /**
   * Test Firebase Storage connection and permissions
   * @returns Promise<boolean> - true if storage is accessible
   */
  static async testStorageConnection(): Promise<boolean> {
    try {
      console.log('Testing Firebase Storage connection...');
      
      // Create a small test blob
      const testBlob = new Blob(['test'], { type: 'text/plain' });
      const testRef = ref(storage, 'test/connection-test.txt');
      
      // Try to upload a small test file
      await uploadBytes(testRef, testBlob);
      console.log('Firebase Storage connection test successful');
      
      // Clean up the test file
      try {
        await deleteObject(testRef);
      } catch (deleteError) {
        console.warn('Could not delete test file:', deleteError);
      }
      
      return true;
    } catch (error) {
      console.error('Firebase Storage connection test failed:', error);
      return false;
    }
  }
}
