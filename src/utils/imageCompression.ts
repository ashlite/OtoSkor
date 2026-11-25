import { FIELD_LIMITS } from '@/src/types/inspection';

export async function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('File bukan format gambar yang valid.'));
      img.onload = () => {
        const maxDimension = 1080;
        let width = img.naturalWidth;
        let height = img.naturalHeight;

        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas tidak tersedia untuk kompresi gambar.'));
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.8;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        while (dataUrl.length > FIELD_LIMITS.DOC_IMAGE_MAX_BYTES && quality > 0.35) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        if (dataUrl.length > FIELD_LIMITS.DOC_IMAGE_MAX_BYTES) {
          // Final downscale pass if still large
          const smallCanvas = document.createElement('canvas');
          smallCanvas.width = Math.round(width * 0.7);
          smallCanvas.height = Math.round(height * 0.7);
          const smallCtx = smallCanvas.getContext('2d');
          if (smallCtx) {
            smallCtx.drawImage(canvas, 0, 0, smallCanvas.width, smallCanvas.height);
            dataUrl = smallCanvas.toDataURL('image/jpeg', 0.68);
          }
        }

        if (dataUrl.length > FIELD_LIMITS.DOC_IMAGE_MAX_BYTES) {
          reject(new Error('Ukuran gambar terlalu besar setelah dikompresi. Gunakan foto yang lebih ringkas.'));
          return;
        }

        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
