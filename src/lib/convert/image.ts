/** Conversión de imágenes con canvas (instantánea, sin ffmpeg) para los formatos que el navegador decodifica. */
export async function convertImageCanvas(file: Blob, mime: string, quality: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas-unavailable');
    if (mime === 'image/jpeg') {
      // JPEG no admite transparencia: fondo blanco en lugar de negro.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(bitmap, 0, 0);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode-failed'))), mime, quality),
    );
  } finally {
    bitmap.close();
  }
}
