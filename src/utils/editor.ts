export type ThumbnailTemplateId =
  | 'viral'
  | 'cinematic'
  | 'tech'
  | 'minimal'
  | 'breaking'
  | 'split'
  | 'classic';

export interface ThumbnailTemplateDefinition {
  id: ThumbnailTemplateId;
  name: string;
  tagline: string;
  defaultBadge: string;
  defaultAccent: string;
  icon: string;
  description: string;
}

export const THUMBNAIL_TEMPLATES: ThumbnailTemplateDefinition[] = [
  {
    id: 'viral',
    name: 'Viral Creator',
    tagline: 'High-CTR YouTube / Gaming',
    defaultBadge: '⚡ MUST WATCH',
    defaultAccent: '#facc15',
    icon: '🔥',
    description: 'Electric neon badge, high-impact gradient, slanted accents, maximum click-through contrast.',
  },
  {
    id: 'cinematic',
    name: 'Cinematic Doc',
    tagline: '2.35:1 Film & Documentary',
    defaultBadge: '✦ 4K ULTRA HD',
    defaultAccent: '#f59e0b',
    icon: '🎬',
    description: 'Cinematic matte letterbox bars, elegant serif letterspacing, golden amber accents, filmic vignette.',
  },
  {
    id: 'tech',
    name: 'Tech / Editorial',
    tagline: 'SaaS, AI & Product Suite',
    defaultBadge: '// AI SYNTHESIS 2026',
    defaultAccent: '#38bdf8',
    icon: '⚡',
    description: 'Monospace terminal header, dual-glow border, structured badge pills, clean futuristic typography.',
  },
  {
    id: 'minimal',
    name: 'Glass Minimal',
    tagline: 'Clean Swiss Design',
    defaultBadge: '● CURATED SELECTION',
    defaultAccent: '#a78bfa',
    icon: '💎',
    description: 'Frosted glassmorphism floating card, subtle luminous border, understated typography, premium feel.',
  },
  {
    id: 'breaking',
    name: 'Broadcast News',
    tagline: 'Urgent Alert & Commentary',
    defaultBadge: '● BREAKING REPORT',
    defaultAccent: '#ef4444',
    icon: '🚨',
    description: 'Urgent red alert strip, high-contrast banner, bold broadcast typography, maximum news urgency.',
  },
  {
    id: 'split',
    name: 'Split Storyteller',
    tagline: 'Side-by-side & Editorial',
    defaultBadge: 'CASE STUDY',
    defaultAccent: '#10b981',
    icon: '▥',
    description: 'Vertical accent edge, tiered category badge, partitioned content layout, great for comparisons.',
  },
  {
    id: 'classic',
    name: 'FrameIQ Classic',
    tagline: 'Gradient Bottom Fade',
    defaultBadge: 'FRAME IQ',
    defaultAccent: '#8b5cf6',
    icon: '✦',
    description: 'The proven smooth dark gradient fade with stroke typography and subtitle support.',
  },
];

export interface EditorOptions {
  title?: string;
  subtitle?: string;
  aspect?: '16:9' | '1:1' | '9:16';
  brightness?: number; // 0.4 - 1.8
  contrast?: number;   // 0.4 - 1.8
  style?: 'gradient' | 'dark' | 'none';
  template?: ThumbnailTemplateId;
  badgeText?: string;
  accentColor?: string;
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
    template = 'classic',
    badgeText = '',
    accentColor,
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
    img.onerror = () => reject(new Error('Failed to load image for composition'));
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

  const cleanTitle = title.trim();
  const cleanSubtitle = subtitle.trim();
  const cleanBadge = (badgeText || '').trim();

  // Color defaults based on template
  const templateConfig = THUMBNAIL_TEMPLATES.find((t) => t.id === template) || THUMBNAIL_TEMPLATES[6];
  const primaryAccent = accentColor || templateConfig.defaultAccent;

  // ----------------------------------------------------------------------
  // TEMPLATE-SPECIFIC OVERLAYS AND GRAPHICS
  // ----------------------------------------------------------------------
  if (template === 'cinematic') {
    // 2.35:1 Letterbox Bars (Matte)
    const letterboxH = Math.round(h * 0.11);
    ctx.fillStyle = '#06070b';
    ctx.fillRect(0, 0, w, letterboxH);
    ctx.fillRect(0, h - letterboxH, w, letterboxH);

    // Filmic vignette gradient
    const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.7);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(4,6,12,0.72)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, letterboxH, w, h - letterboxH * 2);

    // Subtle bottom gradient for readability
    const grad = ctx.createLinearGradient(0, h * 0.45, 0, h - letterboxH);
    grad.addColorStop(0, 'rgba(7,9,16,0)');
    grad.addColorStop(1, 'rgba(7,9,16,0.85)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, h * 0.45, w, h * 0.55 - letterboxH);

    // Top letterbox metadata
    const badgeToDraw = cleanBadge || templateConfig.defaultBadge;
    ctx.font = `700 ${Math.round(w * 0.016)}px 'Cinzel', 'Times New Roman', Georgia, serif`;
    ctx.letterSpacing = '3px';
    ctx.fillStyle = primaryAccent;
    ctx.textAlign = 'right';
    ctx.fillText(badgeToDraw, w - Math.round(w * 0.05), Math.round(letterboxH * 0.65));

    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('CINEMATIC 4K FRAME ARCHIVE', Math.round(w * 0.05), Math.round(letterboxH * 0.65));
    ctx.letterSpacing = '0px';

  } else if (template === 'viral') {
    // High-CTR YouTube style: saturated gradient from bottom + top right accent glow
    const grad = ctx.createLinearGradient(0, h * 0.25, 0, h);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.4, 'rgba(8, 5, 20, 0.45)');
    grad.addColorStop(0.85, 'rgba(10, 3, 24, 0.94)');
    grad.addColorStop(1, '#05020c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, h * 0.25, w, h * 0.75);

    // Electric accent border glow around thumbnail
    ctx.strokeStyle = primaryAccent;
    ctx.lineWidth = Math.max(6, Math.round(w * 0.008));
    ctx.strokeRect(0, 0, w, h);

    // Dynamic top-left or bottom badge pill
    const badgeToDraw = cleanBadge || templateConfig.defaultBadge;
    if (badgeToDraw) {
      const badgeFontSize = Math.max(20, Math.round(w * 0.024));
      ctx.font = `900 ${badgeFontSize}px 'Outfit', 'Arial Black', sans-serif`;
      const badgeMetrics = ctx.measureText(badgeToDraw);
      const bPadX = Math.round(badgeFontSize * 0.8);
      const bPadY = Math.round(badgeFontSize * 0.35);
      const bW = badgeMetrics.width + bPadX * 2;
      const bH = badgeFontSize + bPadY * 2;
      const bX = Math.round(w * 0.05);
      const bY = Math.round(h * 0.08);

      // Slanted yellow badge background
      ctx.save();
      ctx.fillStyle = primaryAccent;
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.roundRect(bX, bY, bW, bH, 8);
      ctx.fill();

      // Slanted border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Badge text in bold black
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeToDraw, bX + bPadX, bY + bH / 2);
      ctx.restore();
    }

  } else if (template === 'tech') {
    // Tech & AI editorial: gradient ramp + dark lower card + cyan grid lines
    const grad = ctx.createLinearGradient(0, h * 0.3, 0, h);
    grad.addColorStop(0, 'rgba(11, 15, 29, 0)');
    grad.addColorStop(0.5, 'rgba(11, 15, 29, 0.75)');
    grad.addColorStop(1, 'rgba(8, 11, 22, 0.96)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, h * 0.3, w, h * 0.7);

    // Top tech bar
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, w, Math.round(h * 0.07));
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, Math.round(h * 0.07));
    ctx.lineTo(w, Math.round(h * 0.07));
    ctx.stroke();

    // Monospace header
    ctx.font = `700 ${Math.max(14, Math.round(w * 0.016))}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = primaryAccent;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(cleanBadge || templateConfig.defaultBadge, Math.round(w * 0.04), Math.round(h * 0.035));

    ctx.textAlign = 'right';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('STATUS: SYNTHESIZED [OK]', w - Math.round(w * 0.04), Math.round(h * 0.035));

    // Corner targeting brackets
    const bracketSize = Math.round(w * 0.025);
    ctx.strokeStyle = primaryAccent;
    ctx.lineWidth = 3;
    // bottom right corner
    ctx.beginPath();
    ctx.moveTo(w - Math.round(w * 0.04), h - Math.round(h * 0.05) - bracketSize);
    ctx.lineTo(w - Math.round(w * 0.04), h - Math.round(h * 0.05));
    ctx.lineTo(w - Math.round(w * 0.04) - bracketSize, h - Math.round(h * 0.05));
    ctx.stroke();

  } else if (template === 'minimal') {
    // Glassmorphic floating card
    const cardMarginX = Math.round(w * 0.06);
    const cardW = w - cardMarginX * 2;
    const cardH = Math.round(h * 0.38);
    const cardY = h - cardH - Math.round(h * 0.06);

    ctx.save();
    // Glass card backdrop
    ctx.fillStyle = 'rgba(13, 17, 32, 0.82)';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.roundRect(cardMarginX, cardY, cardW, cardH, 16);
    ctx.fill();

    // Luminous delicate border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Badge inside minimal card
    const badgeToDraw = cleanBadge || templateConfig.defaultBadge;
    if (badgeToDraw) {
      ctx.font = `700 ${Math.round(w * 0.015)}px 'Inter', sans-serif`;
      ctx.fillStyle = primaryAccent;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(badgeToDraw, cardMarginX + Math.round(w * 0.03), cardY + Math.round(cardH * 0.15));
    }

  } else if (template === 'breaking') {
    // Broadcast News
    const bannerH = Math.round(h * 0.28);
    const bannerY = h - bannerH;

    // Red high-contrast header bar
    const barH = Math.round(h * 0.08);
    ctx.fillStyle = primaryAccent;
    ctx.fillRect(0, bannerY - barH, w, barH);

    ctx.font = `900 ${Math.round(barH * 0.55)}px 'Impact', 'Arial Black', sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText((cleanBadge || templateConfig.defaultBadge).toUpperCase(), Math.round(w * 0.04), bannerY - barH / 2);

    // Dark broadcast news strap
    ctx.fillStyle = 'rgba(10, 14, 26, 0.95)';
    ctx.fillRect(0, bannerY, w, bannerH);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, bannerY);
    ctx.lineTo(w, bannerY);
    ctx.stroke();

  } else if (template === 'split') {
    // Left vertical border & accent partition
    const stripeW = Math.round(w * 0.015);
    ctx.fillStyle = primaryAccent;
    ctx.fillRect(0, 0, stripeW, h);

    const grad = ctx.createLinearGradient(0, h * 0.3, 0, h);
    grad.addColorStop(0, 'rgba(8, 12, 24, 0)');
    grad.addColorStop(0.6, 'rgba(8, 12, 24, 0.7)');
    grad.addColorStop(1, 'rgba(8, 12, 24, 0.95)');
    ctx.fillStyle = grad;
    ctx.fillRect(stripeW, h * 0.3, w - stripeW, h * 0.7);

    // Left badge
    const badgeToDraw = cleanBadge || templateConfig.defaultBadge;
    if (badgeToDraw) {
      ctx.font = `800 ${Math.round(w * 0.016)}px 'Outfit', sans-serif`;
      ctx.fillStyle = primaryAccent;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(badgeToDraw.toUpperCase(), Math.round(w * 0.06), Math.round(h * 0.52));
    }

  } else {
    // Classic / Fallback
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

    if (cleanBadge) {
      ctx.font = `700 ${Math.round(w * 0.016)}px 'Outfit', sans-serif`;
      ctx.fillStyle = primaryAccent;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(cleanBadge.toUpperCase(), Math.round(w * 0.06), Math.round(h * 0.52));
    }
  }

  // ----------------------------------------------------------------------
  // RENDER HEADLINE & SUBTITLE
  // ----------------------------------------------------------------------
  if (cleanTitle || cleanSubtitle) {
    let titleFontSize = Math.max(28, Math.round(w * 0.046));
    let subFontSize = Math.max(16, Math.round(w * 0.024));

    if (template === 'viral') {
      titleFontSize = Math.max(34, Math.round(w * 0.054));
    } else if (template === 'cinematic') {
      titleFontSize = Math.max(26, Math.round(w * 0.040));
    }

    // Set font family
    let fontFamily = "'Outfit', 'Inter', sans-serif";
    if (template === 'cinematic') {
      fontFamily = "'Cinzel', 'Times New Roman', Georgia, serif";
    } else if (template === 'tech') {
      fontFamily = "'Space Grotesk', 'Inter', sans-serif";
    } else if (template === 'breaking') {
      fontFamily = "'Impact', 'Arial Black', sans-serif";
    }

    ctx.font = `800 ${titleFontSize}px ${fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Wrap title lines
    const maxCharsPerLine = Math.max(13, Math.floor(w / (titleFontSize * 0.58)));
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

    const lineHeight = Math.round(titleFontSize * 1.2);
    const totalTextHeight = lines.length * lineHeight + (cleanSubtitle ? subFontSize + 16 : 0);

    let startX = Math.round(w * 0.06);
    let startY = h - totalTextHeight - Math.round(h * 0.08);

    if (template === 'cinematic') {
      const letterboxH = Math.round(h * 0.11);
      startY = h - letterboxH - totalTextHeight - Math.round(h * 0.04);
      startX = Math.round(w * 0.05);
    } else if (template === 'minimal') {
      const cardMarginX = Math.round(w * 0.06);
      const cardH = Math.round(h * 0.38);
      const cardY = h - cardH - Math.round(h * 0.06);
      startX = cardMarginX + Math.round(w * 0.03);
      startY = cardY + Math.round(cardH * 0.36);
    } else if (template === 'breaking') {
      const bannerH = Math.round(h * 0.28);
      const bannerY = h - bannerH;
      startX = Math.round(w * 0.04);
      startY = bannerY + Math.round(bannerH * 0.14);
    }

    lines.forEach((line, idx) => {
      const y = startY + idx * lineHeight;
      // Heavy drop stroke
      ctx.lineWidth = Math.max(5, Math.round(titleFontSize * 0.1));
      ctx.strokeStyle = '#05070f';
      ctx.strokeText(line, startX, y);

      // Main fill
      if (template === 'viral' && idx === 0) {
        ctx.fillStyle = primaryAccent; // highlight first line with vibrant accent
      } else {
        ctx.fillStyle = '#ffffff';
      }
      ctx.fillText(line, startX, y);
    });

    if (cleanSubtitle) {
      const subY = startY + lines.length * lineHeight + 8;
      ctx.font = `600 ${subFontSize}px 'DM Sans', Inter, sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#060812';
      ctx.strokeText(cleanSubtitle, startX, subY);
      ctx.fillStyle = template === 'viral' ? '#ffffff' : (template === 'tech' ? '#7dd3fc' : '#c7c9ff');
      ctx.fillText(cleanSubtitle, startX, subY);
    }
  }

  return canvas.toDataURL('image/jpeg', 0.94);
}
