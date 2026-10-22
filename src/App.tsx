import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { HomePage } from './pages/HomePage';
import { ProcessingPage } from './pages/ProcessingPage';
import { ResultPage } from './pages/ResultPage';
import { ComparisonPage } from './pages/ComparisonPage';
import { StudioPage } from './pages/StudioPage';
import { NexusPage } from './pages/NexusPage';
import { HistoryPage } from './pages/HistoryPage';
import { VideoRecord, ProcessingResultRecord } from './types';
import {
  initializeSampleDataIfEmpty,
  getResultById,
  getVideoById,
  getStoredResults,
  getStoredVideos,
} from './utils/storage';
import './styles/style.css';

export function App() {
  const [currentView, setCurrentView] = useState<string>('home');
  const [activeVideo, setActiveVideo] = useState<VideoRecord | null>(null);
  const [activeResult, setActiveResult] = useState<ProcessingResultRecord | null>(null);
  const [videoElementForProcessing, setVideoElementForProcessing] = useState<HTMLVideoElement | undefined>(undefined);

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

  return (
    <div className="app-shell">
      <Sidebar currentView={currentView} onNavigate={handleNavigate} />

      <div className="main-wrap">
        <Topbar currentView={currentView} onNavigate={handleNavigate} />

        <main className="content">
          {currentView === 'home' && (
            <HomePage
              onStartProcessing={handleStartProcessing}
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
