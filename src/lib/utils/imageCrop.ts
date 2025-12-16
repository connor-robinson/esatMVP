/**
 * Crop image to remove white space by detecting last black pixel/text line
 */

interface FooterGapOptions {
  enabled?: boolean;
  /**
   * Minimum proportion of image height that must be blank between content and footer
   */
  minBlankPercent?: number;
  /**
   * Minimum number of blank pixels required between content and footer
   */
  minBlankPixels?: number;
  /**
   * Maximum proportion of row pixels that can be considered blank when evaluating gap rows
   */
  blankContentRatio?: number;
  /**
   * Extra pixels to keep after detected content to avoid clipping
   */
  smoothingMargin?: number;
}

interface CropOptions {
  removeFooterPercent?: number; // Remove this % from bottom first (for answers or forced trim)
  paddingBottom?: number; // Minimum pixels after last content
  paddingBottomPercent?: number; // Additional padding as percent of content height
  contentThreshold?: number; // Brightness threshold to treat pixel as content
  minContentRatio?: number; // Minimum ratio of row pixels that must be darker than threshold
  footerGap?: FooterGapOptions; // Legacy gap detection (optional)
}

export async function cropImageToContent(
  imageSrc: string,
  options: CropOptions
): Promise<string> {
  const {
    removeFooterPercent = 0,
    paddingBottom = 60,
    paddingBottomPercent = 0,
    contentThreshold = 235,
    minContentRatio = 0.002,
    footerGap,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        const originalWidth = img.width;
        const originalHeight = img.height;

        // Draw image to canvas
        canvas.width = originalWidth;
        canvas.height = originalHeight;
        ctx.drawImage(img, 0, 0);

        // Get image data
        const imageData = ctx.getImageData(0, 0, originalWidth, originalHeight);
        const data = imageData.data;

        // Determine scan ceiling after forcing footer removal
        const scanLimit = removeFooterPercent > 0
          ? Math.max(0, Math.floor(originalHeight * (1 - removeFooterPercent / 100)))
          : originalHeight;

        const threshold = contentThreshold;
        const minContentPerRow = Math.max(1, Math.floor(originalWidth * minContentRatio));

        let lastContentRow = -1;

        for (let y = scanLimit - 1; y >= 0; y--) {
          let contentPixels = 0;

          for (let x = 0; x < originalWidth; x++) {
            const idx = (y * originalWidth + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const brightness = (r + g + b) / 3;

            if (brightness <= threshold) {
              contentPixels++;
              if (contentPixels >= minContentPerRow) {
                lastContentRow = y;
                break;
              }
            }
          }

          if (lastContentRow !== -1) {
            break;
          }
        }

        if (lastContentRow < 0) {
          if (scanLimit < originalHeight) {
            lastContentRow = scanLimit - 1;
          } else {
          resolve(imageSrc);
          return;
          }
        }

        const contentHeight = Math.max(1, lastContentRow + 1);
        const paddingFromPercent = paddingBottomPercent > 0
          ? Math.floor(contentHeight * paddingBottomPercent)
          : 0;
        const totalPadding = Math.max(paddingBottom, paddingFromPercent);

        const cropHeight = Math.min(scanLimit, lastContentRow + totalPadding + 1);
        const finalCropHeight = cropHeight;

        // Create cropped canvas
        const croppedCanvas = document.createElement('canvas');
        const croppedCtx = croppedCanvas.getContext('2d');
        if (!croppedCtx) {
          resolve(imageSrc);
          return;
        }

        croppedCanvas.width = originalWidth;
        croppedCanvas.height = finalCropHeight;
        croppedCtx.drawImage(img, 0, 0, originalWidth, finalCropHeight, 0, 0, originalWidth, finalCropHeight);

        // Convert to data URL
        const croppedDataUrl = croppedCanvas.toDataURL('image/png');
        resolve(croppedDataUrl);
      } catch (error) {
        console.warn('Image cropping failed:', error);
        resolve(imageSrc); // Return original on error
      }
    };

    img.onerror = () => {
      resolve(imageSrc); // Return original on load error
    };

    img.src = imageSrc;
  });
}

