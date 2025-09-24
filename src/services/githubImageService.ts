export class GitHubImageService {
  private static readonly GITHUB_TOKEN = 'YOUR_GITHUB_TOKEN';
  private static readonly REPO_OWNER = 'bonch223';
  private static readonly REPO_NAME = 'macrocoach-images';

  /**
   * Upload image to GitHub repository
   */
  static async uploadImage(
    imageUri: string,
    clientId: string,
    type: 'weight' | 'progress' | 'client'
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      console.log('Uploading to GitHub:', { imageUri, clientId, type });
      
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

      // Create file path
      const fileName = `${clientId}_${type}_${Date.now()}.jpg`;
      const filePath = `images/${fileName}`;

      // Upload to GitHub
      const uploadResponse = await fetch(
        `https://api.github.com/repos/${this.REPO_OWNER}/${this.REPO_NAME}/contents/${filePath}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `token ${this.GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Upload image for client ${clientId}`,
            content: base64,
          }),
        }
      );

      const result = await uploadResponse.json();

      if (result.content?.download_url) {
        console.log('GitHub upload successful:', result.content.download_url);
        return {
          success: true,
          url: result.content.download_url,
        };
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error) {
      console.error('GitHub upload failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete image from GitHub
   */
  static async deleteImage(imageUrl: string): Promise<boolean> {
    try {
      // Extract file path from URL
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `images/${fileName}`;

      // Get file SHA first
      const getResponse = await fetch(
        `https://api.github.com/repos/${this.REPO_OWNER}/${this.REPO_NAME}/contents/${filePath}`,
        {
          headers: {
            'Authorization': `token ${this.GITHUB_TOKEN}`,
          },
        }
      );

      const fileInfo = await getResponse.json();
      if (!fileInfo.sha) {
        console.log('File not found in GitHub');
        return true;
      }

      // Delete file
      const deleteResponse = await fetch(
        `https://api.github.com/repos/${this.REPO_OWNER}/${this.REPO_NAME}/contents/${filePath}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `token ${this.GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Delete image ${fileName}`,
            sha: fileInfo.sha,
          }),
        }
      );

      return deleteResponse.ok;
    } catch (error) {
      console.error('GitHub delete failed:', error);
      return false;
    }
  }
}
