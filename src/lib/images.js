// Réduit une photo avant l'envoi (1600 px max, JPEG) : envoi rapide même en 3G/4G
const erreurFormat = () => Object.assign(new Error('Format de photo non supporté'), { code: 'FORMAT_PHOTO' });

export function compresserImage(fichier, tailleMax = 1600, qualite = 0.82) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(fichier);
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, tailleMax / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; // fond blanc pour les PNG transparents
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(erreurFormat())), 'image/jpeg', qualite);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(erreurFormat()); };
    img.src = url;
  });
}
