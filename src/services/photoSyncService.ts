import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { FirestoreService } from './firestoreService';

export class PhotoSyncService {
  /**
   * Convert image to base64 for storage in Firestore
   */
  static async imageToBase64(imageUri: string): Promise<string> {
    try {
      console.log('Converting image to base64:', imageUri);
      
      // For web platform, use fetch-based approach
      if (Platform.OS === 'web') {
        console.log('Using web-compatible base64 conversion...');
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
            console.log('Web base64 conversion successful, length:', base64Data.length);
            resolve(base64Data);
          };
          reader.onerror = () => reject(new Error('Failed to read file as base64'));
          reader.readAsDataURL(blob);
        });
      }
      
      // For native platforms, try multiple approaches
      try {
        // First try: Check if file exists and read with FileSystem
        const fileInfo = await FileSystem.getInfoAsync(imageUri);
        if (!fileInfo.exists) {
          throw new Error('Image file does not exist');
        }
        
        console.log('File info:', fileInfo);
        
        // Read file as base64
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        console.log('Base64 conversion successful, length:', base64.length);
        return base64;
      } catch (fileSystemError) {
        console.log('FileSystem approach failed, trying fetch approach...');
        
        // Second try: Use fetch for data URIs or accessible URLs
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
            console.log('Fetch base64 conversion successful, length:', base64Data.length);
            resolve(base64Data);
          };
          reader.onerror = () => reject(new Error('Failed to read file as base64'));
          reader.readAsDataURL(blob);
        });
      }
    } catch (error) {
      console.error('Error converting image to base64:', error);
      console.error('Image URI:', imageUri);
      throw new Error(`Failed to convert image to base64: ${error.message}`);
    }
  }

  /**
   * Convert base64 back to local file URI
   */
  static async base64ToImage(base64Data: string, fileName: string): Promise<string> {
    try {
      // For web platform, return data URI directly
      if (Platform.OS === 'web') {
        return `data:image/jpeg;base64,${base64Data}`;
      }
      
      // For native platforms, save to file system
      const localUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(localUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return localUri;
    } catch (error) {
      console.error('Error converting base64 to image:', error);
      throw new Error(`Failed to convert base64 to image: ${error.message}`);
    }
  }

  /**
   * Compress image for storage
   */
  static async compressImage(imageUri: string): Promise<string> {
    try {
      // For web platform, return original URI (compression handled by browser)
      if (Platform.OS === 'web') {
        return imageUri;
      }
      
      // For native platforms, compress the image
      const manipResult = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 400, height: 400 } }], // Resize to max 400x400
        { 
          compress: 0.7, // 70% quality
          format: ImageManipulator.SaveFormat.JPEG 
        }
      );
      
      return manipResult.uri;
    } catch (error) {
      console.error('Error compressing image:', error);
      return imageUri; // Return original if compression fails
    }
  }

  /**
   * Save photo to Firestore as base64
   */
  static async savePhotoToFirestore(
    imageUri: string,
    clientId: string,
    type: 'weight' | 'progress' | 'client',
    date: Date,
    notes?: string
  ): Promise<string> {
    try {
      console.log('Starting photo save process:', { imageUri, clientId, type });
      
      // Compress image first
      const compressedUri = await this.compressImage(imageUri);
      console.log('Image compressed, URI:', compressedUri);
      
      // Convert image to base64
      const base64Data = await this.imageToBase64(compressedUri);
      
      // Create photo document
      const photoData = {
        clientId,
        type,
        date: date.toISOString(),
        base64Data,
        notes: notes || '',
        timestamp: new Date().toISOString(),
        size: base64Data.length, // Track size for optimization
      };

      console.log('Photo data prepared, size:', base64Data.length);
      
      // Save to Firestore
      const photoId = await FirestoreService.addPhoto(photoData);
      
      console.log('Photo saved to Firestore with ID:', photoId);
      return photoId;
    } catch (error) {
      console.error('Error saving photo to Firestore:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        imageUri,
        clientId,
        type
      });
      throw new Error(`Failed to save photo to Firestore: ${error.message}`);
    }
  }

  /**
   * Get photos for a client from Firestore
   */
  static async getClientPhotos(
    clientId: string, 
    type?: 'weight' | 'progress' | 'client'
  ): Promise<any[]> {
    try {
      const photos = await FirestoreService.getClientPhotos(clientId, type);
      
      // Convert base64 to local URIs for display
      const processedPhotos = await Promise.all(
        photos.map(async (photo) => {
          try {
            const fileName = `photo_${photo.id}.jpg`;
            const localUri = await this.base64ToImage(photo.base64Data, fileName);
            
            return {
              ...photo,
              localUri,
              date: new Date(photo.date),
            };
          } catch (error) {
            console.error('Error processing photo:', error);
            return null;
          }
        })
      );

      return processedPhotos.filter(photo => photo !== null);
    } catch (error) {
      console.error('Error getting client photos:', error);
      return [];
    }
  }

  /**
   * Delete photo from Firestore
   */
  static async deletePhoto(photoId: string): Promise<void> {
    try {
      await FirestoreService.deletePhoto(photoId);
    } catch (error) {
      console.error('Error deleting photo:', error);
      throw new Error(`Failed to delete photo: ${error.message}`);
    }
  }

  /**
   * Get photo by ID and convert to local URI
   */
  static async getPhotoById(photoId: string): Promise<string | null> {
    try {
      const photo = await FirestoreService.getPhotoById(photoId);
      if (!photo) return null;

      const fileName = `photo_${photoId}.jpg`;
      const localUri = await this.base64ToImage(photo.base64Data, fileName);
      
      return localUri;
    } catch (error) {
      console.error('Error getting photo by ID:', error);
      return null;
    }
  }

  /**
   * Get base64 data for a photo by ID (for data URI display)
   */
  static async getBase64Data(photoId: string): Promise<string | null> {
    try {
      const photo = await FirestoreService.getPhotoById(photoId);
      if (photo && photo.base64Data) {
        return photo.base64Data;
      }
      return null;
    } catch (error) {
      console.error('Error getting base64 data for photo:', error);
      return null;
    }
  }

  /**
   * Check if photo exists in Firestore
   */
  static async photoExists(photoId: string): Promise<boolean> {
    try {
      const photo = await FirestoreService.getPhotoById(photoId);
      return photo !== null;
    } catch (error) {
      console.error('Error checking if photo exists:', error);
      return false;
    }
  }

  /**
   * Get photo metadata without loading the full image
   */
  static async getPhotoMetadata(photoId: string): Promise<any> {
    try {
      const photo = await FirestoreService.getPhotoById(photoId);
      if (!photo) return null;

      return {
        id: photo.id,
        clientId: photo.clientId,
        type: photo.type,
        date: new Date(photo.date),
        notes: photo.notes,
        timestamp: new Date(photo.timestamp),
        size: photo.size,
        hasImage: !!photo.base64Data,
      };
    } catch (error) {
      console.error('Error getting photo metadata:', error);
      return null;
    }
  }
}
