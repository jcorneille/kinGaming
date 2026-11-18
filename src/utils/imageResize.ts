/**
 * Formats photo acceptés pour les avatars User & Client
 */
export const PROFILE_IMAGE_ACCEPT =
  'image/*,.jpg,.jpeg,.jfif,.pjpeg,.pjp,.png,.webp,.avif,.gif,.bmp,.svg,.ico,.tif,.tiff,.heic,.heif';

const EXTENSION_MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  jfif: 'image/jpeg',
  pjpeg: 'image/jpeg',
  pjp: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  heic: 'image/heic',
  heif: 'image/heif',
};

function getFileExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

function isSupportedImageFile(file: File): boolean {
  if (file.type && file.type.startsWith('image/')) return true;
  const ext = getFileExtension(file.name);
  return Boolean(ext && EXTENSION_MIME_MAP[ext]);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const ext = getFileExtension(file.name);
        const mappedMime = EXTENSION_MIME_MAP[ext];
        if (
          mappedMime &&
          (reader.result.startsWith('data:application/octet-stream') ||
            reader.result.startsWith('data:;base64,'))
        ) {
          const base64Idx = reader.result.indexOf(';base64,');
          if (base64Idx !== -1) {
            resolve(`data:${mappedMime}${reader.result.slice(base64Idx)}`);
            return;
          }
        }
        resolve(reader.result);
      } else {
        reject(new Error("Impossible de lire l'image."));
      }
    };
    reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier image.'));
    reader.readAsDataURL(file);
  });
}

async function decodeImageSource(
  file: File
): Promise<{ source: CanvasImageSource; width: number; height: number; cleanup?: () => void }> {
  // 1. Tenter createImageBitmap (gère orientation EXIF + nombreux formats)
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Continuer vers le repli HTMLImageElement (ex. SVG ou formats gérés par <img>)
    }
  }

  // 2. Repli ObjectURL puis DataURL
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('decode_object_url_failed'));
      image.src = objectUrl;
    });
    const w = img.naturalWidth || img.width || 256;
    const h = img.naturalHeight || img.height || 256;
    return {
      source: img,
      width: w,
      height: h,
      cleanup: () => URL.revokeObjectURL(objectUrl),
    };
  } catch {
    URL.revokeObjectURL(objectUrl);
  }

  const dataUrl = await readFileAsDataUrl(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(
        new Error(
          "Format photo non décodable par ce navigateur. Utilisez JPG, JPEG, PNG, WebP, GIF, AVIF, BMP ou SVG."
        )
      );
    image.src = dataUrl;
  });

  return {
    source: img,
    width: img.naturalWidth || img.width || 256,
    height: img.naturalHeight || img.height || 256,
  };
}

/**
 * Compresse et redimensionne une photo de profil en carré centré (pour affichage rond)
 * en acceptant un large éventail de formats photo (JPG, PNG, WebP, GIF, AVIF, BMP, SVG, TIFF, HEIC...).
 */
export async function compressProfileImage(
  file: File,
  maxSize = 256,
  quality = 0.85
): Promise<string> {
  if (!isSupportedImageFile(file)) {
    throw new Error(
      'Format non reconnu. Formats supportés : JPG, JPEG, PNG, WebP, GIF, AVIF, BMP, SVG, TIFF, ICO.'
    );
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("L'image est trop volumineuse (maximum 15 Mo avant compression).");
  }

  const decoded = await decodeImageSource(file);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = maxSize;
    canvas.height = maxSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Impossible de traiter l’image sur ce navigateur.');
    }

    // Recadrage carré centré (cover) idéal pour l'affichage en cercle (rounded-full)
    const minSide = Math.min(decoded.width, decoded.height);
    const sx = (decoded.width - minSide) / 2;
    const sy = (decoded.height - minSide) / 2;

    ctx.clearRect(0, 0, maxSize, maxSize);
    ctx.drawImage(decoded.source, sx, sy, minSide, minSide, 0, 0, maxSize, maxSize);

    // Préférer WebP (conserve transparence PNG/SVG + compression légère), sinon JPEG
    const webpUrl = canvas.toDataURL('image/webp', quality);
    if (webpUrl.startsWith('data:image/webp') && webpUrl.length <= 450_000) {
      return webpUrl;
    }

    // Repli JPEG avec fond sombre propre si transparence
    const jpegCanvas = document.createElement('canvas');
    jpegCanvas.width = maxSize;
    jpegCanvas.height = maxSize;
    const jCtx = jpegCanvas.getContext('2d');
    if (jCtx) {
      jCtx.fillStyle = '#0f172a';
      jCtx.fillRect(0, 0, maxSize, maxSize);
      jCtx.drawImage(canvas, 0, 0);
      for (const q of [quality, 0.72, 0.58]) {
        const jpgUrl = jpegCanvas.toDataURL('image/jpeg', q);
        if (jpgUrl.length <= 450_000) {
          return jpgUrl;
        }
      }
      return jpegCanvas.toDataURL('image/jpeg', 0.5);
    }

    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    decoded.cleanup?.();
  }
}

/**
 * Compresse et redimensionne une image d'arrière-plan plein écran en préservant
 * son ratio d'aspect afin de rester légère dans le stockage local.
 */
export async function compressBackgroundImage(
  file: File,
  maxWidth = 1600,
  maxHeight = 900,
  quality = 0.8
): Promise<string> {
  if (!isSupportedImageFile(file)) {
    throw new Error('Veuillez sélectionner un fichier image valide (JPG, PNG, WebP, GIF, AVIF, BMP, SVG).');
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("L'image est trop volumineuse (maximum 15 Mo avant compression).");
  }

  const decoded = await decodeImageSource(file);
  try {
    const scale = Math.min(maxWidth / decoded.width, maxHeight / decoded.height, 1);
    const targetWidth = Math.max(1, Math.round(decoded.width * scale));
    const targetHeight = Math.max(1, Math.round(decoded.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Impossible de traiter l’image sur ce navigateur.');
    }

    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(decoded.source, 0, 0, targetWidth, targetHeight);

    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    decoded.cleanup?.();
  }
}
