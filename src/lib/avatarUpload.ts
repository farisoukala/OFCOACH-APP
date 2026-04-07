const MAX_BYTES = 2.5 * 1024 * 1024;

const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function isHeicLike(file: File): boolean {
  const t = (file.type || '').toLowerCase();
  if (t === 'image/heic' || t === 'image/heif') return true;
  const n = file.name.toLowerCase();
  return n.endsWith('.heic') || n.endsWith('.heif');
}

function inferMime(file: File): string {
  const mime = (file.type || '').toLowerCase();
  if (mime) return mime;
  const n = file.name.toLowerCase();
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image/jpeg';
  if (n.endsWith('.png')) return 'image/png';
  if (n.endsWith('.webp')) return 'image/webp';
  if (n.endsWith('.heic')) return 'image/heic';
  if (n.endsWith('.heif')) return 'image/heif';
  return '';
}

/** Charge l’image dans un canvas et renvoie un JPEG (Safari iOS / types bizarres). */
async function fileToJpegViaCanvas(file: File): Promise<File> {
  const img = new Image();
  const url = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('decode'));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.drawImage(img, 0, 0);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob((b) => r(b), 'image/jpeg', 0.9));
  if (!blob) throw new Error('toBlob');
  return new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
}

async function compressToMaxBytes(file: File): Promise<File> {
  const img = new Image();
  const url = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('decode'));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');

  let scale = 1;
  while (scale > 0.12) {
    const cw = Math.max(1, Math.round(img.naturalWidth * scale));
    const ch = Math.max(1, Math.round(img.naturalHeight * scale));
    canvas.width = cw;
    canvas.height = ch;
    ctx.drawImage(img, 0, 0, cw, ch);
    for (let q = 0.92; q >= 0.48; q -= 0.07) {
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob((b) => r(b), 'image/jpeg', q));
      if (blob && blob.size <= MAX_BYTES) {
        return new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      }
    }
    scale *= 0.82;
  }
  throw new Error('Image trop lourde (max. 2,5 Mo après compression).');
}

/**
 * Prépare un fichier choisi sur mobile (souvent HEIC / fichiers lourds) pour l’upload Supabase.
 */
export async function prepareAvatarFileForUpload(file: File): Promise<{ file: File; mime: string; ext: string }> {
  let working = file;

  if (isHeicLike(working)) {
    const { default: heic2any } = await import('heic2any');
    const out = await heic2any({ blob: working, toType: 'image/jpeg', quality: 0.82 });
    const blob = Array.isArray(out) ? out[0] : out;
    working = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
  }

  let mime = inferMime(working);
  if (!ALLOWED[mime]) {
    try {
      working = await fileToJpegViaCanvas(working);
      mime = 'image/jpeg';
    } catch {
      throw new Error('Format accepté : photo JPEG, PNG, WebP ou HEIC (iPhone).');
    }
  }

  if (working.size > MAX_BYTES) {
    working = await compressToMaxBytes(working);
    mime = 'image/jpeg';
  }

  let ext = ALLOWED[mime];
  if (!ext) {
    throw new Error('Format accepté : JPEG, PNG ou WebP.');
  }

  // Un seul chemin Storage par utilisateur : `{userId}/avatar.jpg` — évite les échecs RLS au 2e envoi
  // quand l’extension changeait (jpg puis png) et créait un nouvel objet.
  if (ext !== 'jpg') {
    working = await fileToJpegViaCanvas(working);
    mime = 'image/jpeg';
    ext = 'jpg';
  }

  return { file: working, mime, ext };
}
