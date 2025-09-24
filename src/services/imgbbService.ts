export class ImgBBService {
  // Your ImgBB API key
  private static readonly API_KEY = '8c8a997fe6402247c2b50d1619c38047';

  /**
   * Upload image to ImgBB (completely free)
   */
  static async uploadImage(
    imageUri: string,
    clientId: string,
    type: 'weight' | 'progress' | 'client'
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      console.log('Uploading to ImgBB:', { imageUri, clientId, type });
      
      // Convert image to base64
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1]; // Remove data:image/jpeg;base64, prefix
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Upload to ImgBB
      const formData = new FormData();
      formData.append('key', this.API_KEY);
      formData.append('image', base64);
      formData.append('name', `${clientId}_${type}_${Date.now()}`);

      const uploadResponse = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await uploadResponse.json();

      if (result.success && result.data?.url) {
        console.log('ImgBB upload successful:', result.data.url);
        return {
          success: true,
          url: result.data.url,
        };
      } else {
        throw new Error(result.error?.message || 'Upload failed');
      }
    } catch (error) {
      console.error('ImgBB upload failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Note: ImgBB doesn't provide delete API for free tier
   * Images expire after 1 year automatically
   */
  static async deleteImage(imageUrl: string): Promise<boolean> {
    console.log('ImgBB free tier: Cannot delete images programmatically');
    console.log('Image will expire automatically after 1 year:', imageUrl);
    return true; // Return true since we can't delete, but it's not an error
  }
}
