import React, { useRef, useEffect, useState } from 'react';

interface VideoPreviewPlayerProps {
  previewUrl: string | null;
  isUsingSample: boolean;
  onVideoElementReady?: (videoEl: HTMLVideoElement | null) => void;
  onMetadataLoaded?: (meta: { duration: number; width: number; height: number }) => void;
}

export const VideoPreviewPlayer: React.FC<VideoPreviewPlayerProps> = ({
  previewUrl,
  isUsingSample,
  onVideoElementReady,
  onMetadataLoaded,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [sampleTime, setSampleTime] = useState<number>(0);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [realMeta, setRealMeta] = useState<{ duration: number; width: number; height: number } | null>(null);

  // Notify parent of video element
  useEffect(() => {
    if (onVideoElementReady) {
      onVideoElementReady(videoRef.current);
    }
  }, [previewUrl, onVideoElementReady]);

  // Video event handlers for uploaded files
  const handleLoadedMetadata = () => {
    setVideoError(null);
    if (videoRef.current) {
      const d = videoRef.current.duration || 10;
      const w = videoRef.current.videoWidth || 1280;
      const h = videoRef.current.videoHeight || 720;
      setRealMeta({ duration: d, width: w, height: h });
      if (onMetadataLoaded) {
        onMetadataLoaded({ duration: d, width: w, height: h });
      }
    }
  };

  const handleVideoError = () => {
    setVideoError('Browser could not play this codec directly. You can still click Analyze Video to extract frames.');
  };

  // Sample video animation loop
  useEffect(() => {
    if (!isUsingSample) return;

    let animId: number;
    let lastTimestamp = performance.now();
    let currentTime = sampleTime;
    const duration = 9.5;

    const scenes = [
      { name: 'Intro & Title Card', bg: '#09152b', accent: '#7c3aed', motion: 0.1 },
      { name: 'Tech Lab Drone Shot', bg: '#132338', accent: '#06b6d4', motion: 0.4 },
      { name: 'Speaker Spotlight', bg: '#23153c', accent: '#f43f5e', motion: 0.8 },
      { name: 'Product Detail & Sensor', bg: '#1b2034', accent: '#3b82f6', motion: 0.95 },
      { name: 'Feature Benchmarks', bg: '#291b48', accent: '#ec4899', motion: 0.85 },
      { name: 'Landscape B-Roll', bg: '#11292b', accent: '#10b981', motion: 0.6 },
      { name: 'Closing Summary', bg: '#1f1636', accent: '#8b5cf6', motion: 0.3 },
    ];

    const render = (now: number) => {
      const delta = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      if (isPlaying) {
        currentTime = (currentTime + delta) % duration;
        setSampleTime(currentTime);
      }

      const canvas = sampleCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;

          const progress = currentTime / duration;
          const sceneIdx = Math.min(scenes.length - 1, Math.floor(progress * scenes.length));
          const scene = scenes[sceneIdx];
          const t = currentTime * 4;

          // Background
          const grad = ctx.createLinearGradient(0, 0, w, h);
          grad.addColorStop(0, scene.bg);
          grad.addColorStop(1, '#05070e');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, h);

          // Animated central orb
          ctx.fillStyle = scene.accent;
          ctx.beginPath();
          const cx = w * 0.5 + Math.cos(t) * 45 * scene.motion;
          const cy = h * 0.45 + Math.sin(t) * 22 * scene.motion;
          ctx.arc(cx, cy, 38, 0, Math.PI * 2);
          ctx.fill();

          // High contrast box
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(cx - 50, cy - 35, 100, 70);

          // Grid lines
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.lineWidth = 1;
          for (let x = 30; x < w; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
          }

          // Bottom HUD overlay
          ctx.fillStyle = 'rgba(7, 10, 22, 0.85)';
          ctx.fillRect(0, h - 38, w, 38);

          // Scene tag & timestamp
          ctx.fillStyle = '#c7b0ff';
          ctx.font = 'bold 12px Inter, sans-serif';
          ctx.fillText(`Scene ${sceneIdx + 1}: ${scene.name}`, 14, h - 16);

          ctx.fillStyle = '#ffffff';
          ctx.font = '11px monospace';
          ctx.fillText(`${currentTime.toFixed(1)}s / ${duration.toFixed(1)}s`, w - 90, h - 16);

          // Top badge
          ctx.fillStyle = 'rgba(126, 78, 235, 0.25)';
          ctx.fillRect(10, 10, 155, 22);
          ctx.strokeStyle = '#8c59ef';
          ctx.strokeRect(10, 10, 155, 22);
          ctx.fillStyle = '#d8b9ff';
          ctx.font = '10px Inter, sans-serif';
          ctx.fillText('LIVE DEMO VIDEO STREAM', 18, 25);
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isUsingSample, isPlaying]);

  // If user uploaded a video
  if (previewUrl) {
    return (
      <div style={{ position: 'relative', width: '100%' }}>
        <video
          ref={videoRef}
          id="preview"
          className="video-preview"
          src={previewUrl}
          controls
          playsInline
          preload="metadata"
          onLoadedMetadata={handleLoadedMetadata}
          onError={handleVideoError}
          style={{ width: '100%', height: '220px', display: 'block', borderRadius: '11px', background: '#050711' }}
        />

        {videoError && (
          <div
            style={{
              position: 'absolute',
              bottom: 40,
              left: 10,
              right: 10,
              padding: '8px 12px',
              background: 'rgba(60, 20, 30, 0.9)',
              border: '1px solid #e4587d',
              borderRadius: '8px',
              color: '#ffd8e0',
              fontSize: '11px',
            }}
          >
            {videoError}
          </div>
        )}

        {realMeta && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '8px',
              fontSize: '11px',
              color: '#9da7c0',
            }}
          >
            <span>
              <b>Resolution:</b> {realMeta.width} × {realMeta.height}
            </span>
            <span>
              <b>Duration:</b> {realMeta.duration.toFixed(1)}s (~{Math.round(realMeta.duration * 30)} frames)
            </span>
          </div>
        )}
      </div>
    );
  }

  // If using sample demo video
  if (isUsingSample) {
    return (
      <div style={{ position: 'relative', width: '100%' }}>
        <canvas
          ref={sampleCanvasRef}
          width={400}
          height={225}
          style={{
            width: '100%',
            height: '220px',
            borderRadius: '11px',
            display: 'block',
            background: '#090e1c',
          }}
        />

        {/* Custom video controls bar for demo canvas */}
        <div
          style={{
            marginTop: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: '#111626',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #232a42',
          }}
        >
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              background: '#281c4a',
              border: '1px solid #774ac9',
              color: 'white',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>

          <input
            type="range"
            min="0"
            max="9.5"
            step="0.1"
            value={sampleTime}
            onChange={(e) => {
              setIsPlaying(false);
              setSampleTime(parseFloat(e.target.value));
            }}
            style={{ flex: 1, accentColor: '#9c4dff', margin: 0, padding: 0 }}
          />

          <span style={{ fontSize: '11px', color: '#c4cbde', minWidth: '70px', textAlign: 'right', fontFamily: 'monospace' }}>
            {sampleTime.toFixed(1)}s / 9.5s
          </span>
        </div>
      </div>
    );
  }

  // Initial Empty Placeholder
  return (
    <div className="preview-placeholder" id="preview-placeholder">
      <div className="preview-play">▶</div>
      <p>Your video preview will appear here</p>
      <small style={{ color: '#7a85a0', marginTop: '4px' }}>
        Select a file or click &quot;Try Preset Demo Video&quot; above
      </small>
    </div>
  );
};
