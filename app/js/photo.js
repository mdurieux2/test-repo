// Photo de profil : l'image choisie sur l'iPhone (photothèque ou appareil photo) est
// recadrée en carré et réduite, pour tenir dans le stockage de l'appareil (~30 Ko).

export const PHOTO_SIZE = 320;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image illisible'));
    };
    img.src = url;
  });
}

/** Renvoie une image JPEG carrée (data URL), centrée sur le milieu de la photo. */
export async function squarePhoto(file, size = PHOTO_SIZE) {
  const { img, url } = await loadImage(file);
  try {
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function isPhoto(value) {
  return typeof value === 'string' && value.startsWith('data:image/');
}
