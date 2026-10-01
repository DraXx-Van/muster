// Client-side image prep: centre-crop to a square and shrink, so uploads are tiny (about 20-40 KB) and fast.
export async function resizeToSquare(file: File, size = 256, quality = 0.85): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  const bmp = await createImageBitmap(file).catch(() => { throw new Error('That image could not be read. Try a JPG or PNG.'); });
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser cannot process images.');
  ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size);
  bmp.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process the image.'))), 'image/jpeg', quality));
}

/** Centre-crop to a wide banner (default 1280 x 480) for event covers. */
export async function resizeToCover(file: File, width = 1280, height = 480, quality = 0.85): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  const bmp = await createImageBitmap(file).catch(() => { throw new Error('That image could not be read. Try a JPG or PNG.'); });
  const targetRatio = width / height;
  let sw = bmp.width;
  let sh = bmp.height;
  if (sw / sh > targetRatio) sw = sh * targetRatio; else sh = sw / targetRatio;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser cannot process images.');
  ctx.drawImage(bmp, (bmp.width - sw) / 2, (bmp.height - sh) / 2, sw, sh, 0, 0, width, height);
  bmp.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process the image.'))), 'image/jpeg', quality));
}
