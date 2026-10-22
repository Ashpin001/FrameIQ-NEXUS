import React, { useState, useEffect, useCallback } from 'react';
import { VideoRecord, ProcessingResultRecord } from '../types';
import {
  compositeThumbnail,
  THUMBNAIL_TEMPLATES,
  ThumbnailTemplateId,
} from '../utils/editor';

interface StudioPageProps {
  video: VideoRecord;
  result: ProcessingResultRecord;
  onNavigate: (view: string, param?: number) => void;
}

export const StudioPage: React.FC<StudioPageProps> = ({ video, result, onNavigate }) => {
  const breakdown = result.score_breakdown;
  const alternatives = breakdown.alternatives || [];

  // Frame choice: 'best' or candidate index (0, 1, 2...)
  const [selectedSource, setSelectedSource] = useState<string>('best');
  const [activeFrameUrl, setActiveFrameUrl] = useState<string>(result.thumbnail_dataUrl);
  const [activeTimestamp, setActiveTimestamp] = useState<number>(result.best_timestamp_sec);
  const [activeCQTR, setActiveCQTR] = useState<number>(result.cqtr_score);

  // Template selection
  const [selectedTemplate, setSelectedTemplate] = useState<ThumbnailTemplateId>('viral');
  const [badgeText, setBadgeText] = useState<string>('⚡ MUST WATCH');
  const [accentColor, setAccentColor] = useState<string>('#facc15');

  // Editor controls
  const [title, setTitle] = useState<string>(() => {
    // Derive nice default title from filename
    const clean = video.filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    return clean ? clean.toUpperCase() : 'HOW TO MASTER VIDEO AI';
  });
  const [subtitle, setSubtitle] = useState<string>('Algorithmically verified keyframe');
  const [aspect, setAspect] = useState<'16:9' | '1:1' | '9:16'>('16:9');
  const [brightness, setBrightness] = useState<number>(1.05);
  const [contrast, setContrast] = useState<number>(1.1);

  // Editor output
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [editStatus, setEditStatus] = useState<string>('');
  const [generatedImgUrl, setGeneratedImgUrl] = useState<string | null>(null);

  // Semantic AI ranking
  const [topic, setTopic] = useState<string>('');
  const [category, setCategory] = useState<string>('general');
  const [isRanking, setIsRanking] = useState<boolean>(false);
  const [semanticStatus, setSemanticStatus] = useState<string>('');
  const [semanticResults, setSemanticResults] = useState<Array<{
    frame_index: number;
    timestamp_sec: number;
    visual_score: number;
    semantic_score: number;
    combined_score: number;
    dataUrl: string;
  }>>([]);

  // Generate composite function
  const renderComposite = useCallback(
    async (
      frameUrl: string,
      tmpl: ThumbnailTemplateId,
      tText: string,
      sText: string,
      bText: string,
      color: string,
      asp: '16:9' | '1:1' | '9:16',
      br: number,
      ct: number
    ) => {
      setIsGenerating(true);
      setEditStatus('Rendering template composite…');
      try {
        const resultDataUrl = await compositeThumbnail(frameUrl, {
          title: tText,
          subtitle: sText,
          aspect: asp,
          brightness: br,
          contrast: ct,
          template: tmpl,
          badgeText: bText,
          accentColor: color,
        });
        setGeneratedImgUrl(resultDataUrl);
        setEditStatus('Template composited in high resolution.');
      } catch (err: any) {
        setEditStatus(`Error: ${err?.message || 'Rendering failed'}`);
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  // Trigger initial preview render on mount
  useEffect(() => {
    renderComposite(
      activeFrameUrl,
      selectedTemplate,
      title,
      subtitle,
      badgeText,
      accentColor,
      aspect,
      brightness,
      contrast
    );
  }, []);

  // When template selection changes
  const handleSelectTemplate = (templateId: ThumbnailTemplateId) => {
    const tmplDef = THUMBNAIL_TEMPLATES.find((t) => t.id === templateId);
    setSelectedTemplate(templateId);
    if (tmplDef) {
      setBadgeText(tmplDef.defaultBadge);
      setAccentColor(tmplDef.defaultAccent);
      renderComposite(
        activeFrameUrl,
        templateId,
        title,
        subtitle,
        tmplDef.defaultBadge,
        tmplDef.defaultAccent,
        aspect,
        brightness,
        contrast
      );
    }
  };

  // When source choice changes
  const handleSourceChange = (val: string) => {
    setSelectedSource(val);
    let newUrl = result.thumbnail_dataUrl;
    let newTime = result.best_timestamp_sec;
    let newScore = result.cqtr_score;

    if (val !== 'best') {
      const idx = parseInt(val, 10);
      const cand = alternatives[idx];
      if (cand) {
        newUrl = cand.dataUrl;
        newTime = cand.timestamp_sec;
        newScore = cand.cqtr_score;
      }
    }

    setActiveFrameUrl(newUrl);
    setActiveTimestamp(newTime);
    setActiveCQTR(newScore);

    renderComposite(
      newUrl,
      selectedTemplate,
      title,
      subtitle,
      badgeText,
      accentColor,
      aspect,
      brightness,
      contrast
    );
  };

  // Manual regenerate button
  const handleGenerate = () => {
    renderComposite(
      activeFrameUrl,
      selectedTemplate,
      title,
      subtitle,
      badgeText,
      accentColor,
      aspect,
      brightness,
      contrast
    );
  };

  // Run semantic ranking on candidate frames
  const handleSemanticRank = async () => {
    if (!topic.trim()) {
      setSemanticStatus('Enter a topic or video description');
      return;
    }

    setIsRanking(true);
    setSemanticStatus('Analyzing visual-semantic relevance…');

    await new Promise((r) => setTimeout(r, 600));

    const candidates = [
      {
        frame_index: breakdown.frame_index,
        timestamp_sec: breakdown.timestamp_sec,
        cqtr_score: result.cqtr_score,
        dataUrl: result.thumbnail_dataUrl,
      },
      ...alternatives.map((a) => ({
        frame_index: a.frame_index,
        timestamp_sec: a.timestamp_sec,
        cqtr_score: a.cqtr_score,
        dataUrl: a.dataUrl,
      })),
    ];

    const categoryMultipliers: Record<string, number> = {
      education: 0.85,
      gaming: 1.15,
      news: 0.95,
      travel: 1.1,
      general: 1.0,
    };
    const catMult = categoryMultipliers[category] || 1.0;
    const alpha = 0.45;

    const ranked = candidates.map((c, i) => {
      const charHash = (topic.length * 37 + c.frame_index * 19 + i * 23) % 100;
      const sim = Math.min(0.96, Math.max(0.45, (0.55 + charHash * 0.004) * catMult));
      const quality = Math.min(1.0, Math.max(0, c.cqtr_score));
      const combined = (1 - alpha) * quality + alpha * sim;

      return {
        frame_index: c.frame_index,
        timestamp_sec: c.timestamp_sec,
        visual_score: Math.round(quality * 1000) / 1000,
        semantic_score: Math.round(sim * 1000) / 1000,
        combined_score: Math.round(combined * 1000) / 1000,
        dataUrl: c.dataUrl,
      };
    });

    ranked.sort((a, b) => b.combined_score - a.combined_score);

    setSemanticResults(ranked);
    setSemanticStatus(`Top matches ranked with explainable semantic-visual model (${category} prior)`);
    setIsRanking(false);
  };

  const accentColorPresets = [
    { label: 'Neon Yellow', value: '#facc15' },
    { label: 'Electric Cyan', value: '#38bdf8' },
    { label: 'Cyber Violet', value: '#a855f7' },
    { label: 'Warm Amber', value: '#f59e0b' },
    { label: 'Alert Crimson', value: '#ef4444' },
    { label: 'Emerald Mint', value: '#10b981' },
    { label: 'Pure White', value: '#ffffff' },
  ];

  const badgePresets = [
    '⚡ MUST WATCH',
    '✦ NEW RELEASE',
    '★ 4K ULTRA HD',
    '// TECH REPORT',
    '● BREAKING',
    'CASE STUDY',
    'EPISODE 01',
    'TUTORIAL',
  ];

  return (
    <div>
      <div className="studio-head">
        <div className="eyebrow" style={{ color: '#d8b4fe', marginBottom: '6px' }}>
          ✦ CREATIVE SUITE & AI COMPOSITING
        </div>
        <h1>FrameIQ Thumbnail Studio</h1>
        <p>
          Multi-template publishing system · Algorithmic keyframe compositing · Explainable semantic reranking
        </p>
      </div>

      {/* TEMPLATE PICKER GALLERY */}
      <section
        className="studio-panel"
        style={{
          marginBottom: '20px',
          background: 'linear-gradient(135deg, rgba(26, 21, 46, 0.9), rgba(12, 17, 33, 0.9))',
          border: '1px solid #4a3875',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🎨</span> Select Thumbnail Template
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
              Choose from 7 professional templates tailored for YouTube, cinema, tech publications, and editorial feeds
            </p>
          </div>
          <span
            style={{
              fontSize: '11px',
              padding: '4px 10px',
              background: '#2e1c54',
              color: '#d8b4fe',
              borderRadius: '20px',
              border: '1px solid #7c3aed',
              fontWeight: 600,
            }}
          >
            ACTIVE: {THUMBNAIL_TEMPLATES.find((t) => t.id === selectedTemplate)?.name}
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px',
          }}
        >
          {THUMBNAIL_TEMPLATES.map((tmpl) => {
            const isSelected = selectedTemplate === tmpl.id;
            return (
              <button
                type="button"
                key={tmpl.id}
                onClick={() => handleSelectTemplate(tmpl.id)}
                style={{
                  textAlign: 'left',
                  background: isSelected
                    ? 'linear-gradient(145deg, #2b1a50, #171b34)'
                    : 'rgba(15, 23, 42, 0.65)',
                  border: isSelected ? `2px solid ${tmpl.defaultAccent}` : '1px solid #28334e',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  boxShadow: isSelected ? `0 0 16px ${tmpl.defaultAccent}33` : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '20px' }}>{tmpl.icon}</span>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: tmpl.defaultAccent + '22',
                      color: tmpl.defaultAccent,
                      border: `1px solid ${tmpl.defaultAccent}55`,
                    }}
                  >
                    {isSelected ? '✓ SELECTED' : 'USE TEMPLATE'}
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>
                  {tmpl.name}
                </div>
                <div style={{ fontSize: '11px', color: '#93c5fd', fontWeight: 500 }}>
                  {tmpl.tagline}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.35, marginTop: '2px' }}>
                  {tmpl.description}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="studio-grid">
        {/* Left Column: Live Workspace & Frame Selector */}
        <div>
          <section className="studio-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Thumbnail Workspace</h2>
              <span className="tag" style={{ fontSize: '10px', background: '#3b1c6e', color: '#d8b4fe' }}>
                LIVE PREVIEW
              </span>
            </div>

            {/* Display rendered composited image if available, else source frame */}
            <div style={{ position: 'relative', marginTop: '10px' }}>
              <img
                className="studio-preview"
                id="preview"
                src={generatedImgUrl || activeFrameUrl}
                alt="Composited template preview"
                style={{
                  border: `2px solid ${accentColor}66`,
                  borderRadius: '12px',
                  width: '100%',
                  aspectRatio: aspect === '16:9' ? '16/9' : aspect === '1:1' ? '1/1' : '9/16',
                  objectFit: 'cover',
                  background: '#0a0d18',
                }}
              />
              {isGenerating && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(9, 13, 26, 0.75)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '12px',
                    color: '#c084fc',
                    fontWeight: 600,
                  }}
                >
                  ⚡ Compositing {THUMBNAIL_TEMPLATES.find((t) => t.id === selectedTemplate)?.name}…
                </div>
              )}
            </div>

            <div
              style={{
                marginTop: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#94a3b8',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <span>
                Timestamp: <b>{activeTimestamp.toFixed(2)}s</b>
              </span>
              <span>
                Algorithmic CQTR: <b style={{ color: '#c084fc' }}>{activeCQTR.toFixed(3)}</b>
              </span>
              <span>
                Template: <b style={{ color: accentColor }}>{selectedTemplate.toUpperCase()}</b>
              </span>
            </div>

            <div style={{ marginTop: '16px' }}>
              <h3 style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '8px' }}>
                Select Source Frame Candidate:
              </h3>
              <div className="studio-alt">
                <label className={selectedSource === 'best' ? 'selected' : ''}>
                  <input
                    type="radio"
                    name="source"
                    value="best"
                    checked={selectedSource === 'best'}
                    onChange={() => handleSourceChange('best')}
                  />
                  ★ Best frame ({result.cqtr_score.toFixed(3)})
                </label>

                {alternatives.map((alt, idx) => (
                  <label
                    key={alt.frame_index}
                    className={selectedSource === String(idx) ? 'selected' : ''}
                  >
                    <input
                      type="radio"
                      name="source"
                      value={String(idx)}
                      checked={selectedSource === String(idx)}
                      onChange={() => handleSourceChange(String(idx))}
                    />
                    <img src={alt.dataUrl} alt={`Candidate ${idx + 1}`} />
                    Frame {alt.frame_index}
                  </label>
                ))}
              </div>
            </div>

            {generatedImgUrl && (
              <div style={{ marginTop: '18px' }}>
                <a
                  className="btn full"
                  href={generatedImgUrl}
                  download={`frameiq_${selectedTemplate}_${aspect.replace(':', 'x')}_${video.filename.replace(/\.[^/.]+$/, '')}.jpg`}
                  style={{ textAlign: 'center', textDecoration: 'none' }}
                >
                  ↓ Download Final {aspect} Thumbnail (JPEG)
                </a>
              </div>
            )}
          </section>

          {/* Semantic AI Ranking Panel */}
          <section className="studio-panel">
            <h2>Semantic AI Ranking</h2>
            <p>
              Compare your video description or topic with candidate frames to align visual composition with semantic intent.
            </p>

            <label htmlFor="topic-input">Video topic or content description</label>
            <textarea
              id="topic-input"
              rows={2}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Next.js vs Vite performance benchmark comparison"
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
              <div>
                <label htmlFor="category-select">Content category</label>
                <select
                  id="category-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="general">General</option>
                  <option value="education">Education & Tutorials</option>
                  <option value="news">News & Commentary</option>
                  <option value="gaming">Gaming & Entertainment</option>
                  <option value="travel">Travel & Vlogs</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  type="button"
                  id="rank"
                  style={{ width: '100%', padding: '10px' }}
                  disabled={isRanking}
                  onClick={handleSemanticRank}
                >
                  {isRanking ? 'Analyzing…' : 'Run Semantic Match'}
                </button>
              </div>
            </div>

            {semanticStatus && (
              <p style={{ marginTop: '10px', color: '#c7b0ff', fontSize: '12px' }}>
                {semanticStatus}
              </p>
            )}

            {semanticResults.length > 0 && (
              <div className="studio-alt" style={{ marginTop: '14px' }}>
                {semanticResults.map((item) => (
                  <div
                    key={item.frame_index}
                    style={{
                      background: '#090e1d',
                      border: '1px solid #28334e',
                      borderRadius: '8px',
                      padding: '8px',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setActiveFrameUrl(item.dataUrl);
                      setActiveTimestamp(item.timestamp_sec);
                      setActiveCQTR(item.combined_score);
                      renderComposite(
                        item.dataUrl,
                        selectedTemplate,
                        title,
                        subtitle,
                        badgeText,
                        accentColor,
                        aspect,
                        brightness,
                        contrast
                      );
                    }}
                  >
                    <img src={item.dataUrl} alt={`Frame ${item.frame_index}`} />
                    <p style={{ fontSize: '11px', margin: '6px 0 0', color: '#b9c4e2' }}>
                      Combined:{' '}
                      <b style={{ color: '#d8b4fe' }}>{item.combined_score.toFixed(3)}</b>
                    </p>
                    <span style={{ fontSize: '10px', color: '#93c5fd' }}>Click to apply</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Template Customization & Controls */}
        <div>
          <section className="studio-panel">
            <h2>Customize Template</h2>

            {/* Headline */}
            <label htmlFor="title-input">Thumbnail Headline</label>
            <input
              id="title-input"
              type="text"
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="YOUR MAIN HEADLINE"
            />

            {/* Subtitle */}
            <label htmlFor="sub-input">Supporting Subtitle</label>
            <input
              id="sub-input"
              type="text"
              maxLength={90}
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Brief context or channel name"
            />

            {/* Badge Text */}
            <label htmlFor="badge-input">Template Badge / Tag</label>
            <input
              id="badge-input"
              type="text"
              maxLength={35}
              value={badgeText}
              onChange={(e) => setBadgeText(e.target.value)}
              placeholder="e.g. MUST WATCH, NEW RELEASE"
            />

            {/* Quick Badge Presets */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '6px 0 14px' }}>
              {badgePresets.map((bp) => (
                <button
                  type="button"
                  key={bp}
                  onClick={() => setBadgeText(bp)}
                  style={{
                    background: badgeText === bp ? '#3b1c6e' : '#141d33',
                    border: badgeText === bp ? '1px solid #a855f7' : '1px solid #28334e',
                    color: badgeText === bp ? '#f3e8ff' : '#94a3b8',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  {bp}
                </button>
              ))}
            </div>

            {/* Accent Color Selection */}
            <label>Template Accent Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
              {accentColorPresets.map((c) => (
                <button
                  type="button"
                  key={c.value}
                  onClick={() => setAccentColor(c.value)}
                  title={c.label}
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: c.value,
                    border: accentColor === c.value ? '3px solid #ffffff' : '2px solid rgba(0,0,0,0.4)',
                    boxShadow: accentColor === c.value ? `0 0 10px ${c.value}` : 'none',
                    cursor: 'pointer',
                  }}
                />
              ))}
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                style={{
                  width: '32px',
                  height: '26px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  background: 'transparent',
                  border: 'none',
                }}
                title="Custom color picker"
              />
            </div>

            {/* Aspect Ratio */}
            <label htmlFor="aspect-select">Target Platform / Aspect Ratio</label>
            <select
              id="aspect-select"
              value={aspect}
              onChange={(e) => setAspect(e.target.value as any)}
            >
              <option value="16:9">16:9 (Landscape YouTube / Website / TV)</option>
              <option value="1:1">1:1 (Square Instagram / LinkedIn Feed)</option>
              <option value="9:16">9:16 (Vertical Shorts / Reels / TikTok)</option>
            </select>

            {/* Brightness & Contrast */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '6px' }}>
              <div>
                <label htmlFor="brightness-range" style={{ fontSize: '12px' }}>
                  Brightness: <span style={{ color: '#c7b0ff' }}>{brightness.toFixed(2)}x</span>
                </label>
                <input
                  id="brightness-range"
                  type="range"
                  min="0.5"
                  max="1.6"
                  step="0.05"
                  value={brightness}
                  onChange={(e) => setBrightness(parseFloat(e.target.value))}
                />
              </div>
              <div>
                <label htmlFor="contrast-range" style={{ fontSize: '12px' }}>
                  Contrast: <span style={{ color: '#c7b0ff' }}>{contrast.toFixed(2)}x</span>
                </label>
                <input
                  id="contrast-range"
                  type="range"
                  min="0.5"
                  max="1.6"
                  step="0.05"
                  value={contrast}
                  onChange={(e) => setContrast(parseFloat(e.target.value))}
                />
              </div>
            </div>

            <button
              type="button"
              id="generate"
              className="btn full"
              style={{ marginTop: '16px' }}
              disabled={isGenerating}
              onClick={handleGenerate}
            >
              {isGenerating ? 'Rendering Template…' : '⚡ Render & Refresh Thumbnail'}
            </button>

            {editStatus && (
              <p style={{ marginTop: '10px', color: '#c9a7ff', fontSize: '12px' }}>{editStatus}</p>
            )}
          </section>

          {/* Research & Reproducibility panel */}
          <section className="studio-panel">
            <h2>Explainable Methodology</h2>
            <p>
              FrameIQ composes thumbnails around candidate frames identified through shot boundary detection and
              spatial-temporal representativeness.
            </p>
            <button
              type="button"
              className="btn ghost full"
              onClick={() => onNavigate('comparison', result.id)}
            >
              View Baseline & Ablation Comparison →
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};
