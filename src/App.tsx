import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { HomePage } from './pages/HomePage';
import { ProcessingPage } from './pages/ProcessingPage';
import { ResultPage } from './pages/ResultPage';
import { ComparisonPage } from './pages/ComparisonPage';
import { AblationPage } from './pages/AblationPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { StudioPage } from './pages/StudioPage';
import { NexusPage } from './pages/NexusPage';
import { HistoryPage } from './pages/HistoryPage';
import { BatchQueuePage } from './pages/BatchQueuePage';
import { VideoRecord, ProcessingResultRecord, BatchQueueItem } from './types';
import {
  initializeSampleDataIfEmpty,
  getResultById,
  getVideoById,
  getStoredResults,
  getStoredVideos,
} from './utils/storage';
import { createBatchItemFromFile } from './utils/batchProcessor';
import './styles/style.css';

export function App() {
  const [currentView, setCurrentView] = useState<string>('home');
  const [activeVideo, setActiveVideo] = useState<VideoRecord | null>(null);
  const [activeResult, setActiveResult] = useState<ProcessingResultRecord | null>(null);
  const [videoElementForProcessing, setVideoElementForProcessing] = useState<HTMLVideoElement | undefined>(undefined);
  const [batchQueue, setBatchQueue] = useState<BatchQueueItem[]>([]);

  // Professional Theme & Layout states
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('frameiq_theme') || 'studio');
  const [layout, setLayout] = useState<string>(() => localStorage.getItem('frameiq_layout') || 'expanded');

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('frameiq_theme', newTheme);
    document.body.setAttribute('data-theme', newTheme);
  };

  const handleLayoutChange = (newLayout: string) => {
    setLayout(newLayout);
    localStorage.setItem('frameiq_layout', newLayout);
    document.body.setAttribute('data-layout', newLayout);
  };

  // Sync theme and layout attributes on mount
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    document.body.setAttribute('data-layout', layout);
  }, [theme, layout]);

  // Initialize sample data on first launch
  useEffect(() => {
    const { sampleVideo, sampleResult } = initializeSampleDataIfEmpty();
    if (!activeVideo) setActiveVideo(sampleVideo);
    if (!activeResult) setActiveResult(sampleResult);
  }, []);

  const handleNavigate = (view: string, paramId?: number) => {
    if (paramId) {
      const res = getResultById(paramId);
      if (res) {
        setActiveResult(res);
        const vid = getVideoById(res.video_id);
        if (vid) setActiveVideo(vid);
      }
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartProcessing = (video: VideoRecord, videoEl?: HTMLVideoElement) => {
    setActiveVideo(video);
    setVideoElementForProcessing(videoEl);
    setCurrentView('processing');
  };

  const handleProcessingComplete = (result: ProcessingResultRecord) => {
    setActiveResult(result);
    setCurrentView('result');
  };

  const handleUpdateActiveCandidate = (candidate: any) => {
    if (!activeResult) return;
    const updated: ProcessingResultRecord = {
      ...activeResult,
      best_frame_index: candidate.frame_index,
      best_timestamp_sec: candidate.timestamp_sec,
      cqtr_score: candidate.projectedScore ?? candidate.cqtr_score,
      thumbnail_dataUrl: candidate.dataUrl,
    };
    setActiveResult(updated);
  };

  // If viewing Nexus 3D Studio, render its dedicated full-viewport layout
  if (currentView === 'nexus') {
    return (
      <NexusPage
        initialResult={activeResult || undefined}
        video={activeVideo || undefined}
        onNavigate={handleNavigate}
      />
    );
  }

  const handleAddBatchFiles = (files: File[]) => {
    const newItems = files.map((f) => createBatchItemFromFile(f));
    setBatchQueue((prev) => [...prev, ...newItems]);
  };

  const activeBatchCount = batchQueue.filter(
    (x) => x.status === 'queued' || x.status === 'processing'
  ).length;

  return (
    <div className="app-shell">
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        batchQueueCount={activeBatchCount}
      />

      <div className="main-wrap">
        <Topbar
          currentView={currentView}
          onNavigate={handleNavigate}
          batchQueueCount={activeBatchCount}
          theme={theme}
          onThemeChange={handleThemeChange}
          layout={layout}
          onLayoutChange={handleLayoutChange}
        />

        <main className="content">
          {currentView === 'home' && (
            <HomePage
              onStartProcessing={handleStartProcessing}
              onNavigate={handleNavigate}
              onAddBatchFiles={handleAddBatchFiles}
              batchQueueCount={activeBatchCount}
            />
          )}

          {currentView === 'batch' && (
            <BatchQueuePage
              queue={batchQueue}
              setQueue={setBatchQueue}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'processing' && activeVideo && (
            <ProcessingPage
              video={activeVideo}
              videoElement={videoElementForProcessing}
              onComplete={handleProcessingComplete}
              onError={(err) => console.error('Processing error:', err)}
            />
          )}

          {currentView === 'result' && activeVideo && activeResult && (
            <ResultPage
              video={activeVideo}
              result={activeResult}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'comparison' && activeVideo && activeResult && (
            <ComparisonPage
              video={activeVideo}
              result={activeResult}
              onNavigate={handleNavigate}
              onUpdateActiveCandidate={handleUpdateActiveCandidate}
            />
          )}

          {currentView === 'ablation' && activeVideo && activeResult && (
            <AblationPage
              video={activeVideo}
              result={activeResult}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'analytics' && activeVideo && activeResult && (
            <AnalyticsPage
              video={activeVideo}
              result={activeResult}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'studio' && activeVideo && activeResult && (
            <StudioPage
              video={activeVideo}
              result={activeResult}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'history' && (
            <HistoryPage onNavigate={handleNavigate} />
          )}
        </main>

        <footer className="footer">
          FrameIQ AI · Explainable video thumbnail intelligence · Scores are heuristics, not measured CTR
        </footer>
      </div>
    </div>
  );
}

export default App;
