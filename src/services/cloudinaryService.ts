export class CloudinaryService {
  private static readonly CLOUD_NAME = 'your-cloud-name';
  private static readonly UPLOAD_PRESET = 'your-upload-preset';

  /**
   * Upload image to Cloudinary
   */
  static async uploadImage(
    imageUri: string,
    clientId: string,
    type: 'weight' | 'progress' | 'client'
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      console.log('Uploading to Cloudinary:', { imageUri, clientId, type });
      
      // Convert image to base64
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', base64);
      formData.append('upload_preset', this.UPLOAD_PRESET);
      formData.append('folder', `macrocoach/${clientId}`);
      formData.append('public_id', `${type}_${Date.now()}`);

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${this.CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const result = await uploadResponse.json();

      if (result.secure_url) {
        console.log('Cloudinary upload successful:', result.secure_url);
        return {
          success: true,
          url: result.secure_url,
        };
      } else {
        throw new Error(result.error?.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Cloudinary upload failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete image from Cloudinary
   */
  static async deleteImage(imageUrl: string): Promise<boolean> {
    try {
      // Extract public_id from URL
      const publicId = imageUrl.split('/').pop()?.split('.')[0];
      if (!publicId) return false;

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.CLOUD_NAME}/image/destroy`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            public_id: publicId,
          }),
        }
      );

      const result = await response.json();
      return result.result === 'ok';
    } catch (error) {
      console.error('Cloudinary delete failed:', error);
      return false;
    }
  }
}
