export interface EditorOptions {
  title?: string;
  subtitle?: string;
  aspect?: '16:9' | '1:1' | '9:16';
  brightness?: number; // 0.4 - 1.8
  contrast?: number;   // 0.4 - 1.8
  style?: 'gradient' | 'dark' | 'none';
}

export async function compositeThumbnail(
  sourceImageSrc: string,
  options: EditorOptions
): Promise<string> {
  const {
    title = '',
    subtitle = '',
    aspect = '16:9',
    brightness = 1.0,
    contrast = 1.0,
    style = 'gradient',
  } = options;

  const dims: Record<string, [number, number]> = {
    '16:9': [1280, 720],
    '1:1': [1080, 1080],
    '9:16': [720, 1280],
  };

  const [w, h] = dims[aspect] || [1280, 720];

  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = (e) => reject(new Error('Failed to load image for composition'));
    img.src = sourceImageSrc;
  });

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to create canvas context');

  // Center-crop / fit image to target aspect ratio
  const imgAspect = img.width / img.height;
  const targetAspect = w / h;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;

  if (imgAspect > targetAspect) {
    sw = img.height * targetAspect;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / targetAspect;
    sy = (img.height - sh) / 2;
  }

  // Draw filtered image
  ctx.save();
  ctx.filter = `brightness(${brightness}) contrast(${contrast})`;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  ctx.restore();

  // Overlay styles
  if (style === 'gradient') {
    const grad = ctx.createLinearGradient(0, h * 0.35, 0, h);
    grad.addColorStop(0, 'rgba(7, 10, 22, 0)');
    grad.addColorStop(0.5, 'rgba(7, 10, 22, 0.6)');
    grad.addColorStop(1, 'rgba(7, 10, 22, 0.92)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, h * 0.35, w, h * 0.65);
  } else if (style === 'dark') {
    ctx.fillStyle = 'rgba(8, 12, 25, 0.78)';
    ctx.fillRect(0, h * 0.62, w, h * 0.38);
  }

  // Draw headline and subtitle text
  const cleanTitle = title.trim();
  const cleanSubtitle = subtitle.trim();

  if (cleanTitle || cleanSubtitle) {
    const titleFontSize = Math.max(28, Math.round(w * 0.046));
    const subFontSize = Math.max(16, Math.round(w * 0.024));

    ctx.font = `800 ${titleFontSize}px Outfit, Inter, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Wrap title lines
    const maxCharsPerLine = Math.max(14, Math.floor(w / (titleFontSize * 0.58)));
    const words = cleanTitle.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
      if (lines.length >= 3) break;
    }
    if (currentLine && lines.length < 3) lines.push(currentLine);

    const lineHeight = Math.round(titleFontSize * 1.22);
    const totalTextHeight =
      lines.length * lineHeight + (cleanSubtitle ? subFontSize + 16 : 0);
    const startY = h - totalTextHeight - Math.round(h * 0.08);
    const startX = Math.round(w * 0.06);

    lines.forEach((line, idx) => {
      const y = startY + idx * lineHeight;
      // Drop stroke shadow
      ctx.lineWidth = Math.max(4, Math.round(titleFontSize * 0.08));
      ctx.strokeStyle = '#080b16';
      ctx.strokeText(line, startX, y);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(line, startX, y);
    });

    if (cleanSubtitle) {
      const subY = startY + lines.length * lineHeight + 8;
      ctx.font = `600 ${subFontSize}px 'DM Sans', Inter, sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#080b16';
      ctx.strokeText(cleanSubtitle, startX, subY);
      ctx.fillStyle = '#c7c9ff';
      ctx.fillText(cleanSubtitle, startX, subY);
    }
  }

  return canvas.toDataURL('image/jpeg', 0.94);
}
