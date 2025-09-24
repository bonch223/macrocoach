import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

export interface RailwayUploadResponse {
  success: boolean;
  url?: string;
  error?: string;
}

export interface RailwayDownloadResponse {
  success: boolean;
  data?: string; // base64 data
  error?: string;
}

export class RailwayStorageService {
  // Railway production URL
  private static readonly RAILWAY_BASE_URL = 'https://macrocoach-production.up.railway.app';
  
  /**
   * Upload image to Railway storage
   */
  static async uploadImage(
    imageUri: string, 
    clientId: string, 
    type: 'weight' | 'progress' | 'client',
    fileName?: string
  ): Promise<RailwayUploadResponse> {
    try {
      console.log('Uploading image to Railway:', { imageUri, clientId, type });
      
      // Convert image to base64
      const base64Data = await this.imageToBase64(imageUri);
      
      // Generate unique filename if not provided
      const finalFileName = fileName || `${clientId}_${type}_${Date.now()}.jpg`;
      
      // Prepare form data
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: finalFileName,
      } as any);
      formData.append('clientId', clientId);
      formData.append('type', type);
      formData.append('base64Data', base64Data);
      
      // Upload to Railway
      const response = await fetch(`${this.RAILWAY_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log('Image uploaded to Railway successfully:', result.url);
        return {
          success: true,
          url: result.url,
        };
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading to Railway:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
  
  /**
   * Download image from Railway storage
   */
  static async downloadImage(imageUrl: string): Promise<RailwayDownloadResponse> {
    try {
      console.log('Downloading image from Railway:', imageUrl);
      
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      
      // Convert to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1]; // Remove data:image/jpeg;base64, prefix
          resolve(base64Data);
        };
        reader.onerror = () => reject(new Error('Failed to read file as base64'));
        reader.readAsDataURL(blob);
      });
      
      console.log('Image downloaded from Railway successfully');
      return {
        success: true,
        data: base64Data,
      };
    } catch (error) {
      console.error('Error downloading from Railway:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
  
  /**
   * Delete image from Railway storage
   */
  static async deleteImage(imageUrl: string): Promise<boolean> {
    try {
      console.log('Deleting image from Railway:', imageUrl);
      
      const response = await fetch(`${this.RAILWAY_BASE_URL}/api/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl }),
      });
      
      if (!response.ok) {
        throw new Error(`Delete failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Image deleted from Railway:', result.success);
      return result.success;
    } catch (error) {
      console.error('Error deleting from Railway:', error);
      return false;
    }
  }
  
  /**
   * Convert image to base64 (platform-specific)
   */
  private static async imageToBase64(imageUri: string): Promise<string> {
    try {
      // For web platform, use fetch-based approach
      if (Platform.OS === 'web') {
        const response = await fetch(imageUri);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const blob = await response.blob();
        
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result as string;
            const base64Data = base64.split(',')[1]; // Remove data:image/jpeg;base64, prefix
            resolve(base64Data);
          };
          reader.onerror = () => reject(new Error('Failed to read file as base64'));
          reader.readAsDataURL(blob);
        });
      }
      
      // For native platforms, use FileSystem
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (!fileInfo.exists) {
        throw new Error('Image file does not exist');
      }
      
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      return base64;
    } catch (error) {
      console.error('Error converting image to base64:', error);
      throw error;
    }
  }
  
  /**
   * Save image locally for immediate access
   */
  static async saveImageLocally(
    imageUri: string, 
    clientId: string, 
    type: 'weight' | 'progress' | 'client'
  ): Promise<string> {
    try {
      if (Platform.OS === 'web') {
        // For web, return the original URI
        return imageUri;
      }
      
      // For native, save to local storage
      const fileName = `${clientId}_${type}_${Date.now()}.jpg`;
      const localUri = `${FileSystem.documentDirectory}${fileName}`;
      
      // Copy file to local storage
      await FileSystem.copyAsync({
        from: imageUri,
        to: localUri,
      });
      
      console.log('Image saved locally:', localUri);
      return localUri;
    } catch (error) {
      console.error('Error saving image locally:', error);
      return imageUri; // Return original if local save fails
    }
  }
  
  /**
   * Check if local image exists
   */
  static async localImageExists(localUri: string): Promise<boolean> {
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
}
