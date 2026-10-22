import React, { useState, useRef } from 'react';
import { VideoRecord } from '../types';
import { saveVideo } from '../utils/storage';
import { VideoPreviewPlayer } from '../components/VideoPreviewPlayer';

interface HomePageProps {
  onStartProcessing: (video: VideoRecord, videoElement?: HTMLVideoElement) => void;
  onNavigate: (view: string, param?: number) => void;
  onAddBatchFiles: (files: File[]) => void;
  batchQueueCount: number;
}

export const HomePage: React.FC<HomePageProps> = ({
  onStartProcessing,
  onNavigate,
  onAddBatchFiles,
  batchQueueCount,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUsingSample, setIsUsingSample] = useState(false);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [videoMeta, setVideoMeta] = useState<{ duration: number; width: number; height: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (e.target.files.length > 1) {
        onAddBatchFiles(Array.from(e.target.files));
        onNavigate('batch');
      } else {
        processSelectedFile(e.target.files[0]);
      }
    }
  };

  const processSelectedFile = (file: File) => {
    const allowed = ['mp4', 'avi', 'mov', 'mkv', 'webm'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !allowed.includes(ext)) {
      setErrorMsg(`Unsupported file type. Allowed: ${allowed.join(', ')}`);
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      setErrorMsg('File too large. Maximum size is 200MB.');
      return;
    }

    setErrorMsg(null);
    setSelectedFile(file);
    setIsUsingSample(false);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleUseDemoVideo = () => {
    setErrorMsg(null);
    setSelectedFile(null);
    setIsUsingSample(true);
    setPreviewUrl(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (e.dataTransfer.files.length > 1) {
        onAddBatchFiles(Array.from(e.dataTransfer.files));
        onNavigate('batch');
      } else {
        processSelectedFile(e.dataTransfer.files[0]);
      }
    }
  };

  const handleAnalyze = () => {
    if (isUsingSample) {
      const sampleVideo: VideoRecord = {
        id: Date.now(),
        filename: 'synthetic_action_scenes.mp4',
        duration_sec: 9.5,
        fps: 30,
        frame_count: 285,
        width: 1280,
        height: 720,
        upload_date: new Date().toISOString().replace('T', ' ').substring(0, 19),
        isSample: true,
      };
      saveVideo(sampleVideo);
      onStartProcessing(sampleVideo);
      return;
    }

    if (!selectedFile || !previewUrl) {
      setErrorMsg('Please select or upload a video file first.');
      return;
    }

    const videoEl = videoElement;
    const rawDur = videoMeta?.duration ?? videoEl?.duration;
    const duration = (rawDur && Number.isFinite(rawDur) && rawDur > 0) ? rawDur : 9.5;
    const fps = 30;
    const frameCount = Math.round(duration * fps);

    const videoRecord: VideoRecord = {
      id: Date.now(),
      filename: selectedFile.name,
      duration_sec: Math.round(duration * 10) / 10,
      fps: fps,
      frame_count: frameCount,
      width: videoMeta?.width || videoEl?.videoWidth || 1280,
      height: videoMeta?.height || videoEl?.videoHeight || 720,
      upload_date: new Date().toISOString().replace('T', ' ').substring(0, 19),
      videoUrl: previewUrl,
      isSample: false,
    };

    saveVideo(videoRecord);
    onStartProcessing(videoRecord, videoEl || undefined);
  };

  return (
    <div>
      {/* NEXUS Announcement Banner */}
      <div
        style={{
          margin: '12px 0 24px',
          padding: '14px 18px',
          background: 'linear-gradient(100deg,#291747,#131e3e)',
          border: '1px solid #7654c5',
          borderRadius: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div>
          <b>NEW · FrameIQ NEXUS 3D</b> &nbsp; Spatial AI Lab · Visual-temporal MMR
        </div>
        <button
          type="button"
          onClick={() => onNavigate('nexus')}
          style={{
            background: 'none',
            border: 'none',
            color: '#d8b7ff',
            textDecoration: 'underline',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Launch 3D Studio ↗
        </button>
      </div>

      {/* Hero Section */}
      <section className="hero-grid">
        <div>
          <div className="eyebrow">✦ AI-POWERED VIDEO THUMBNAIL GENERATOR</div>
          <h1>
            Turn Your Videos Into <span>Eye-Catching Thumbnails</span>
          </h1>
          <p>
            Find the frame that tells your story. Shot detection, content-aware
            scoring, and an explainable creative workflow in one studio.
          </p>
          <div className="hero-actions">
            <a className="btn" href="#upload">
              Get Started →
            </a>
            <a className="btn ghost" href="#workflow">
              Explore workflow ↗
            </a>
            <button
              type="button"
              className="btn ghost"
              onClick={handleUseDemoVideo}
              style={{
                borderColor: isUsingSample ? '#9c4dff' : '#303650',
                color: isUsingSample ? '#c7a6ff' : '#dce1f3',
              }}
            >
              ★ Try Preset Demo Video
            </button>
          </div>
        </div>

        <div className="hero-art">
          <div className="orbit orbit-one"></div>
          <div className="orbit orbit-two"></div>
          <div className="art-video">
            <div className="art-play">▶</div>
            <span>VIDEO INPUT</span>
          </div>
          <div className="art-arrow">➜</div>
          <div className="art-cards">
            <div className="art-card">
              ✧ AI <b>92.4</b>
            </div>
            <div className="art-card">
              ▣ <b>TOP FRAME</b>
            </div>
          </div>
          <div className="art-caption">
            From video
            <br />
            to perfect thumbnail
          </div>
        </div>
      </section>

      {errorMsg && (
        <div className="error-msg" role="alert">
          {errorMsg}
        </div>
      )}

      {/* Upload and Preview Grid */}
      <section className="grid-two" id="upload">
        <div className="panel">
          <div className="panel-heading">
            <h2>
              <span className="purple">♧</span> Upload Video
            </h2>
            <span className="tag">STEP 01</span>
          </div>

          <div
            className={`dropzone ${isDragOver ? 'dragover' : ''}`}
            id="upload-box"
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            <div className="upload-icon">☁</div>
            <strong>
              {selectedFile
                ? selectedFile.name
                : isUsingSample
                ? 'Preset Multi-Scene Demo Video Selected'
                : 'Drag and drop your video here'}
            </strong>
            <p>
              {selectedFile || isUsingSample
                ? 'Click to change or select another file'
                : 'or click to browse your files'}
            </p>
            <small>MP4, MOV, AVI, MKV, WEBM · Max 200 MB · Select single or multiple files</small>
            <input
              type="file"
              ref={fileInputRef}
              id="video-input"
              name="video"
              multiple
              accept=".mp4,.avi,.mov,.mkv,.webm"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          <div style={{ marginTop: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn ghost ${isUsingSample ? 'highlight' : ''}`}
              style={{
                fontSize: '12px',
                padding: '8px 14px',
                background: isUsingSample ? '#251b47' : '#14192a',
                borderColor: isUsingSample ? '#8d55ea' : '#303650',
              }}
              onClick={handleUseDemoVideo}
            >
              {isUsingSample ? '✓ Preset Demo Selected' : 'Use Instant 7-Scene Demo'}
            </button>

            <button
              type="button"
              className="btn ghost"
              style={{
                fontSize: '12px',
                padding: '8px 14px',
                borderColor: '#6b3fd4',
                color: '#d8b4fe',
              }}
              onClick={() => onNavigate('batch')}
            >
              ☷ Batch Queue {batchQueueCount > 0 ? `(${batchQueueCount})` : ''} →
            </button>

            {selectedFile && (
              <button
                type="button"
                className="btn ghost"
                style={{ fontSize: '12px', padding: '8px 14px', color: '#c7b0ff' }}
                onClick={() => {
                  onAddBatchFiles([selectedFile]);
                  onNavigate('batch');
                }}
              >
                ＋ Send to Batch Queue
              </button>
            )}

            {selectedFile && (
              <button
                type="button"
                className="btn ghost"
                style={{ fontSize: '12px', padding: '8px 14px' }}
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
              >
                Clear
              </button>
            )}
          </div>

          <div className="upload-footer">
            <span id="file-name">
              {selectedFile
                ? `${selectedFile.name} (${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)`
                : isUsingSample
                ? 'Preset Multi-Scene Action Video (7 scenes)'
                : 'No video selected'}
            </span>
            <button
              className="btn"
              id="generate-btn"
              type="button"
              disabled={!selectedFile && !isUsingSample}
              onClick={handleAnalyze}
            >
              Analyze Video →
            </button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <h2>
              <span className="purple">▣</span> Video Preview
            </h2>
            <span className="tag">LIVE PREVIEW</span>
          </div>

          <VideoPreviewPlayer
            previewUrl={previewUrl}
            isUsingSample={isUsingSample}
            onVideoElementReady={(el) => setVideoElement(el)}
            onMetadataLoaded={(meta) => setVideoMeta(meta)}
          />

          <div className="video-facts">
            <span>◉ Scene detection</span>
            <span>✧ Quality analysis</span>
            <span>▤ Keyframes</span>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="feature-grid" id="workflow">
        <div className="panel feature">
          <div className="feature-icon">◈</div>
          <h3>Intelligent Frame Extraction</h3>
          <p>
            Detect shot boundaries and identify representative frames across your
            video using adaptive thresholding.
          </p>
        </div>
        <div className="panel feature">
          <div className="feature-icon">✧</div>
          <h3>Content-Aware Ranking</h3>
          <p>
            Evaluate sharpness, exposure, contrast, saliency, and scene
            representativeness with the CQTR formula.
          </p>
        </div>
        <div className="panel feature">
          <div className="feature-icon">▥</div>
          <h3>Creative Thumbnail Studio</h3>
          <p>
            Crop to 16:9, 1:1, or 9:16, add headlines, adjust brightness,
            and export high-resolution JPEG thumbnails.
          </p>
        </div>
      </section>

      {/* Research Section */}
      <section className="panel research" id="research">
        <div>
          <div className="eyebrow">RESEARCH-READY WORKFLOW</div>
          <h2>More than a thumbnail picker.</h2>
          <p>
            Compare baseline methods (Random, Uniform Sampling, Middle Frame,
            Sharpness-Based), inspect ablation results, and gather human
            evaluation ratings. Visual scores are explainable classical computer
            vision heuristics.
          </p>
        </div>
        <button
          type="button"
          className="btn ghost"
          onClick={() => onNavigate('history')}
        >
          View project history →
        </button>
      </section>
    </div>
  );
};
