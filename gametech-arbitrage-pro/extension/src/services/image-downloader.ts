/**
 * Image Downloader - Handle product image downloads
 * [cite: 2026-01-23] - Image download feature
 */

export class ImageDownloader {
  /**
   * Download multiple images
   */
  async downloadImages(imageUrls: string[], asin: string): Promise<{ success: string[]; failed: string[] }> {
    const results = { success: [] as string[], failed: [] as string[] };

    for (let i = 0; i < imageUrls.length; i++) {
      try {
        const url = imageUrls[i];
        
        // Fetch image through background script to bypass CORS
        const response = await this.fetchImage(url);
        
        if (response) {
          // Create blob and download
          const blob = this.dataUrlToBlob(response);
          const objectUrl = URL.createObjectURL(blob);
          
          // Trigger download via Chrome API
          await this.triggerDownload(objectUrl, `gametech-${asin}-image-${i + 1}.jpg`);
          
          URL.revokeObjectURL(objectUrl);
          results.success.push(url);
        } else {
          results.failed.push(url);
        }
      } catch (error) {
        console.error('[ImageDownloader] Failed to download:', error);
        results.failed.push(imageUrls[i]);
      }
    }

    return results;
  }

  /**
   * Fetch image via background script
   */
  private async fetchImage(url: string): Promise<string | null> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'proxyImage', url },
        (response) => {
          if (response?.success) {
            resolve(response.dataUrl);
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  /**
   * Convert data URL to Blob
   */
  private dataUrlToBlob(dataUrl: string): Blob {
    const byteString = atob(dataUrl.split(',')[1]);
    const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    
    return new Blob([ab], { type: mimeString });
  }

  /**
   * Trigger Chrome download
   */
  private async triggerDownload(url: string, filename: string): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.downloads.download(
        {
          url,
          filename,
          saveAs: false,
        },
        (downloadId) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * Package images into ZIP (future feature)
   */
  async packageAsZip(imageUrls: string[], asin: string): Promise<Blob | null> {
    // TODO: Implement JSZip integration
    console.log('[ImageDownloader] ZIP packaging not yet implemented');
    return null;
  }
}
