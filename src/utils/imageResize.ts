/**
 * Compresse et redimensionne une photo de profil en carré centré (JPEG/WebP Data URL)
 * afin de garder un poids léger dans localStorage et le store serveur.
 */
export async function compressProfileImage(
  file: File,
  maxSize = 256,
  quality = 0.82
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Veuillez sélectionner un fichier image valide (PNG, JPG, WebP).');
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("L'image est trop volumineuse (maximum 8 Mo avant compression).");
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error("Impossible de lire l'image."));
      }
    };
    reader.onerror = () => reject(new Error("Erreur lors de la lecture du fichier image."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Format d'image non pris en charge par le navigateur."));
    image.src = dataUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = maxSize;
  canvas.height = maxSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Impossible de traiter l’image sur ce navigateur.');
  }

  // Recadrage carré centré (cover)
  const minSide = Math.min(img.width, img.height);
  const sx = (img.width - minSide) / 2;
  const sy = (img.height - minSide) / 2;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, maxSize, maxSize);
  ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, maxSize, maxSize);

  return canvas.toDataURL('image/jpeg', quality);
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
  if (!file.type.startsWith('image/')) {
    throw new Error('Veuillez sélectionner un fichier image valide (PNG, JPG, WebP).');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("L'image est trop volumineuse (maximum 10 Mo avant compression).");
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error("Impossible de lire l'image."));
      }
    };
    reader.onerror = () => reject(new Error("Erreur lors de la lecture du fichier image."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Format d'image non pris en charge par le navigateur."));
    image.src = dataUrl;
  });

  const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
  const targetWidth = Math.max(1, Math.round(img.width * scale));
  const targetHeight = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Impossible de traiter l’image sur ce navigateur.');
  }

  ctx.fillStyle = '#050811';
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  return canvas.toDataURL('image/jpeg', quality);
}

