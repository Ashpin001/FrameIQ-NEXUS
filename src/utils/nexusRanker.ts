import { ScoredCandidate } from '../types';

// Compute 18x12 HSV histogram + 32x18 spatial feature vector from an image data URL
export async function extractFeatures(dataUrl: string): Promise<Float32Array> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = dataUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 18;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new Float32Array(18 * 12 + 32 * 18);

  ctx.drawImage(img, 0, 0, 32, 18);
  const imgData = ctx.getImageData(0, 0, 32, 18);
  const data = imgData.data;

  // 1. HSV Histogram: 18 H bins, 12 S bins
  const hBins = 18, sBins = 12;
  const hist = new Float32Array(hBins * sBins);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const delta = max - min;
    let h = 0;
    if (delta !== 0) {
      if (max === r) h = ((g - b) / delta) % 6;
      else if (max === g) h = (b - r) / delta + 2;
      else h = (r - g) / delta + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    h = (h / 2) % 180;
    const s = max === 0 ? 0 : (delta / max) * 255;
    const hb = Math.min(hBins - 1, Math.floor((h / 180) * hBins));
    const sb = Math.min(sBins - 1, Math.floor((s / 256) * sBins));
    hist[hb * sBins + sb]++;
  }

  // L2 normalize hist
  let hSumSq = 0;
  for (let i = 0; i < hist.length; i++) hSumSq += hist[i] * hist[i];
  const hNorm = Math.sqrt(hSumSq) || 1e-8;
  for (let i = 0; i < hist.length; i++) hist[i] = (hist[i] / hNorm) * 0.7;

  // 2. Grayscale spatial grid (32x18)
  const gray = new Float32Array(32 * 18);
  let gSum = 0;
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const val = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
    gray[j] = val;
    gSum += val;
  }
  const gMean = gSum / gray.length;
  let gSumSq = 0;
  for (let i = 0; i < gray.length; i++) {
    gray[i] -= gMean;
    gSumSq += gray[i] * gray[i];
  }
  const gNorm = Math.sqrt(gSumSq) || 1e-8;
  for (let i = 0; i < gray.length; i++) {
    gray[i] = (gray[i] / gNorm) * 0.3;
  }

  // Concatenate hist (0.7) and gray (0.3)
  const feature = new Float32Array(hist.length + gray.length);
  feature.set(hist, 0);
  feature.set(gray, hist.length);
  return feature;
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA * normB) || 1e-8;
  return Math.max(0, Math.min(1, dot / denom));
}

export async function rerankNexus(
  items: ScoredCandidate[],
  diversity = 0.55,
  novelty = 0.35,
  category = 'general',
  topK = 5
): Promise<ScoredCandidate[]> {
  if (!items || items.length === 0) return [];

  const div = Math.max(0, Math.min(1, diversity));
  const nov = Math.max(0, Math.min(1, novelty));
  const cat = category.toLowerCase();

  const priors: Record<string, [number, number]> = {
    education: [0.85, 0.15],
    gaming: [0.55, 0.45],
    travel: [0.65, 0.35],
    news: [0.9, 0.1],
    general: [0.75, 0.25],
  };
  const [qWeight, noveltyWeight] = priors[cat] || priors.general;

  // Extract feature vectors
  const vectors = await Promise.all(items.map((it) => extractFeatures(it.dataUrl)));
  const n = items.length;

  // Pairwise similarity matrix
  const similarity: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        similarity[i][j] = 1.0;
      } else if (i < j) {
        const sim = cosineSimilarity(vectors[i], vectors[j]);
        similarity[i][j] = sim;
        similarity[j][i] = sim;
      }
    }
  }

  // Quality scores
  const rawQuality = items.map((x) => Math.max(0, Math.min(1, x.cqtr_score)));

  // Temporal novelty
  const timestamps = items.map((x) => x.timestamp_sec);
  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);
  const span = Math.max(maxTime - minTime, 1.0);

  const temporalNovelty = timestamps.map((t) => {
    let minDiff = span;
    for (const s of timestamps) {
      if (s !== t) {
        minDiff = Math.min(minDiff, Math.abs(t - s));
      }
    }
    return minDiff / span;
  });

  // Visual novelty: inverse of mean similarity to other items
  const visualNovelty = similarity.map((row, i) => {
    const sumOthers = row.reduce((acc, v, j) => (j !== i ? acc + v : acc), 0);
    return Math.max(0, 1.0 - sumOthers / Math.max(n - 1, 1));
  });

  const noveltyScores = visualNovelty.map((vn, i) => (vn + temporalNovelty[i]) / 2);

  // Base combined score
  const baseScores = rawQuality.map(
    (q, i) => qWeight * q + noveltyWeight * nov * noveltyScores[i]
  );

  // Greedy MMR selection
  const selected: number[] = [];
  const remaining = new Set<number>(Array.from({ length: n }, (_, i) => i));

  while (remaining.size > 0 && selected.length < Math.min(topK, n)) {
    let bestIdx = -1;
    let bestMMR = -Infinity;

    for (const i of remaining) {
      let maxPenalty = 0;
      for (const s of selected) {
        maxPenalty = Math.max(maxPenalty, similarity[i][s]);
      }
      const mmrScore = (1 - div) * baseScores[i] + div * (1 - maxPenalty);

      if (mmrScore > bestMMR) {
        bestMMR = mmrScore;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0) {
      selected.push(bestIdx);
      remaining.delete(bestIdx);
    } else {
      break;
    }
  }

  return selected.map((idx, rankIdx) => {
    const orig = items[idx];
    const prevSelected = selected.slice(0, rankIdx);
    const maxPenalty = prevSelected.reduce(
      (m, s) => Math.max(m, similarity[idx][s]),
      0
    );
    const divScore = Math.round((1 - maxPenalty) * 1000) / 1000;

    return {
      ...orig,
      quality_score: Math.round(rawQuality[idx] * 1000) / 1000,
      novelty_score: Math.round(noveltyScores[idx] * 1000) / 1000,
      diversity_score: divScore,
      rank: rankIdx + 1,
      url: orig.dataUrl,
    };
  });
}
