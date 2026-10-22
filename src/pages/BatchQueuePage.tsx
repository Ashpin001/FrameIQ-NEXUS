import React, { useRef, useState, useEffect } from 'react';
import { BatchQueueItem, ProcessingResultRecord } from '../types';
import {
  createBatchItemFromFile,
  createBatchItemFromTemplate,
  processBatchItem,
} from '../utils/batchProcessor';

interface BatchQueuePageProps {
  queue: BatchQueueItem[];
  setQueue: React.Dispatch<React.SetStateAction<BatchQueueItem[]>>;
  onNavigate: (view: string, param?: number) => void;
}

export const BatchQueuePage: React.FC<BatchQueuePageProps> = ({
  queue,
  setQueue,
  onNavigate,
}) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stats
  const totalCount = queue.length;
  const completedCount = queue.filter((x) => x.status === 'completed').length;
  const queuedCount = queue.filter((x) => x.status === 'queued').length;
  const failedCount = queue.filter((x) => x.status === 'failed').length;

  const completedItems = queue.filter((x) => x.status === 'completed' && x.result);
  const avgCQTR =
    completedItems.length > 0
      ? completedItems.reduce((acc, curr) => acc + (curr.result?.cqtr_score || 0), 0) /
        completedItems.length
      : 0;

  // Handle files selected via input or drop
  const handleFilesAdded = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newItems: BatchQueueItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      newItems.push(createBatchItemFromFile(file));
    }
    setQueue((prev) => [...prev, ...newItems]);
  };

  const handleAddSampleBatch = (count = 3) => {
    const newItems: BatchQueueItem[] = [];
    for (let i = 0; i < count; i++) {
      newItems.push(createBatchItemFromTemplate(queue.length + i));
    }
    setQueue((prev) => [...prev, ...newItems]);
  };

  const handleRemoveItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearCompleted = () => {
    setQueue((prev) => prev.filter((item) => item.status !== 'completed'));
  };

  // Start / Resume Batch Processing
  const handleStartProcessing = () => {
    setIsPaused(false);
    setIsProcessing(true);
  };

  const handlePauseProcessing = () => {
    setIsPaused(true);
  };

  // Sequential execution effect
  useEffect(() => {
    if (!isProcessing || isPaused) return;

    // Find next queued item
    const nextItem = queue.find((x) => x.status === 'queued');
    if (!nextItem) {
      setIsProcessing(false);
      setActiveItemId(null);
      return;
    }

    let isCancelled = false;
    setActiveItemId(nextItem.id);

    // Update status to processing
    setQueue((prev) =>
      prev.map((it) =>
        it.id === nextItem.id
          ? { ...it, status: 'processing', progressPercent: 5, currentStageText: 'Starting analysis…' }
          : it
      )
    );

    processBatchItem(nextItem, (pct, stageText) => {
      if (!isCancelled) {
        setQueue((prev) =>
          prev.map((it) =>
            it.id === nextItem.id
              ? { ...it, progressPercent: pct, currentStageText: stageText }
              : it
          )
        );
      }
    })
      .then((res: ProcessingResultRecord) => {
        if (!isCancelled) {
          setQueue((prev) =>
            prev.map((it) =>
              it.id === nextItem.id
                ? {
                    ...it,
                    status: 'completed',
                    progressPercent: 100,
                    currentStageText: 'Complete',
                    result: res,
                  }
                : it
            )
          );
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setQueue((prev) =>
            prev.map((it) =>
              it.id === nextItem.id
                ? {
                    ...it,
                    status: 'failed',
                    error: err?.message || 'Processing failed',
                    currentStageText: 'Failed',
                  }
                : it
            )
          );
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isProcessing, isPaused, queue, setQueue]);

  // Download all completed thumbnails
  const handleDownloadAll = () => {
    completedItems.forEach((item, idx) => {
      if (item.result?.thumbnail_dataUrl) {
        setTimeout(() => {
          const a = document.createElement('a');
          a.href = item.result!.thumbnail_dataUrl;
          a.download = `frameiq_${item.videoRecord.filename.replace(/\.[^/.]+$/, '')}_thumb.jpg`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }, idx * 250);
      }
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="page-heading">
        <div className="eyebrow">✦ BATCH PROCESSING PIPELINE</div>
        <h1>Batch Video Queue</h1>
        <p>
          Upload multiple videos and process them in sequence with autonomous
          shot detection, CQTR ranking, and thumbnail generation.
        </p>
      </div>

      {/* Metrics Bar */}
      <div className="metric-grid" style={{ marginBottom: '24px' }}>
        <div>
          <small>TOTAL IN QUEUE</small>
          <strong>{totalCount}</strong>
        </div>
        <div>
          <small>WAITING / ACTIVE</small>
          <strong style={{ color: '#fbbf24' }}>
            {queuedCount + (activeItemId ? 1 : 0)}
          </strong>
        </div>
        <div>
          <small>COMPLETED</small>
          <strong style={{ color: '#34d399' }}>{completedCount}</strong>
        </div>
        <div>
          <small>AVG CQTR SCORE</small>
          <strong>{avgCQTR > 0 ? avgCQTR.toFixed(3) : '—'}</strong>
        </div>
      </div>

      {/* Control Actions Toolbar */}
      <div
        className="panel"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '16px 20px',
        }}
      >
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {isProcessing && !isPaused ? (
            <button
              type="button"
              className="btn"
              style={{ background: '#7c2d12', borderColor: '#ea580c' }}
              onClick={handlePauseProcessing}
            >
              ⏸ Pause Queue
            </button>
          ) : (
            <button
              type="button"
              className="btn"
              disabled={queuedCount === 0}
              onClick={handleStartProcessing}
            >
              ▶ Start Batch Processing ({queuedCount} queued)
            </button>
          )}

          <button
            type="button"
            className="btn ghost"
            onClick={() => fileInputRef.current?.click()}
          >
            ＋ Add Videos
          </button>

          <button
            type="button"
            className="btn ghost"
            onClick={() => handleAddSampleBatch(3)}
          >
            ⚡ Add 3 Sample Videos
          </button>

          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept=".mp4,.avi,.mov,.mkv,.webm"
            style={{ display: 'none' }}
            onChange={(e) => handleFilesAdded(e.target.files)}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {completedCount > 0 && (
            <button
              type="button"
              className="btn ghost"
              onClick={handleDownloadAll}
              style={{ color: '#a7f3d0' }}
            >
              ⤓ Download All ({completedCount})
            </button>
          )}

          {completedCount > 0 && (
            <button
              type="button"
              className="btn ghost"
              onClick={handleClearCompleted}
            >
              Clear Completed
            </button>
          )}
        </div>
      </div>

      {/* Queue Items List */}
      {queue.length === 0 ? (
        <div
          className="dropzone"
          style={{ minHeight: '260px', margin: '20px 0' }}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFilesAdded(e.dataTransfer.files);
          }}
        >
          <div className="upload-icon">☷</div>
          <strong>Your Batch Processing Queue is Empty</strong>
          <p>Drop multiple video files here or choose an option below to start</p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button
              type="button"
              className="btn"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Browse Files (Multiple)
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={(e) => {
                e.stopPropagation();
                handleAddSampleBatch(3);
              }}
            >
              Load 3 Multi-Scene Demo Videos
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
          {queue.map((item, index) => {
            const isItemProcessing = item.status === 'processing';
            const isCompleted = item.status === 'completed';
            const isFailed = item.status === 'failed';

            return (
              <div
                key={item.id}
                className="panel"
                style={{
                  display: 'grid',
                  gridTemplateColumns: isCompleted && item.result ? '160px 1fr auto' : '1fr auto',
                  gap: '20px',
                  alignItems: 'center',
                  borderColor: isItemProcessing
                    ? '#a855f7'
                    : isCompleted
                    ? '#22c55e'
                    : isFailed
                    ? '#ef4444'
                    : '#252b40',
                  boxShadow: isItemProcessing ? '0 0 16px rgba(168, 85, 247, 0.25)' : 'none',
                  background: isItemProcessing
                    ? 'linear-gradient(140deg, #181938, #111428)'
                    : 'linear-gradient(140deg, #141a2a, #0f1422)',
                }}
              >
                {/* Thumbnail Preview for completed items */}
                {isCompleted && item.result && (
                  <div style={{ width: '160px' }}>
                    <img
                      src={item.result.thumbnail_dataUrl}
                      alt={item.videoRecord.filename}
                      style={{
                        width: '100%',
                        aspectRatio: '16/9',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '1px solid #3e4766',
                        display: 'block',
                      }}
                    />
                  </div>
                )}

                {/* Video Info and Progress */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#8e99b7' }}>#{index + 1}</span>
                    <strong style={{ fontSize: '15px', color: '#f3f4fd' }}>
                      {item.videoRecord.filename}
                    </strong>

                    {/* Status Pill */}
                    {item.status === 'queued' && (
                      <span className="tag" style={{ background: '#242217', borderColor: '#856404', color: '#fcd34d' }}>
                        QUEUED
                      </span>
                    )}
                    {item.status === 'processing' && (
                      <span className="tag" style={{ background: '#2c164a', borderColor: '#a855f7', color: '#e9d5ff' }}>
                        PROCESSING…
                      </span>
                    )}
                    {item.status === 'completed' && (
                      <span className="tag" style={{ background: '#112d22', borderColor: '#16a34a', color: '#86efac' }}>
                        ✓ COMPLETED
                      </span>
                    )}
                    {item.status === 'failed' && (
                      <span className="tag" style={{ background: '#36151e', borderColor: '#dc2626', color: '#fca5a5' }}>
                        FAILED
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '12px', color: '#94a0bd', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <span>Duration: {item.videoRecord.duration_sec.toFixed(1)}s</span>
                    <span>Resolution: {item.videoRecord.width}×{item.videoRecord.height}</span>
                    {item.result && (
                      <>
                        <span>Shots: <b>{item.result.num_shots}</b></span>
                        <span>Candidates: <b>{item.result.num_candidates}</b></span>
                        <span>CQTR Score: <b style={{ color: '#c084fc' }}>{item.result.cqtr_score.toFixed(3)}</b></span>
                        <span>Time: {item.result.processing_time_sec.toFixed(1)}s</span>
                      </>
                    )}
                  </div>

                  {/* Progress Bar for Active Item */}
                  {isItemProcessing && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#d8b4fe', marginBottom: '4px' }}>
                        <span>{item.currentStageText}</span>
                        <span>{item.progressPercent}%</span>
                      </div>
                      <div className="progress-bar-track" style={{ height: '6px', margin: 0 }}>
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${item.progressPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {isFailed && item.error && (
                    <div style={{ color: '#f87171', fontSize: '12px', marginTop: '6px' }}>
                      Error: {item.error}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {isCompleted && item.result && (
                    <>
                      <button
                        type="button"
                        className="btn"
                        style={{ padding: '7px 14px', fontSize: '12px' }}
                        onClick={() => onNavigate('result', item.result!.id)}
                      >
                        View Result →
                      </button>

                      <button
                        type="button"
                        className="btn ghost"
                        style={{ padding: '7px 12px', fontSize: '12px' }}
                        onClick={() => onNavigate('nexus', item.result!.id)}
                      >
                        3D Nexus
                      </button>

                      <button
                        type="button"
                        className="btn ghost"
                        style={{ padding: '7px 12px', fontSize: '12px' }}
                        onClick={() => onNavigate('studio', item.result!.id)}
                      >
                        Studio
                      </button>

                      <a
                        className="btn ghost"
                        style={{ padding: '7px 12px', fontSize: '12px' }}
                        href={item.result.thumbnail_dataUrl}
                        download={`frameiq_${item.videoRecord.filename.replace(/\.[^/.]+$/, '')}.jpg`}
                      >
                        ↓ JPEG
                      </a>
                    </>
                  )}

                  {item.status === 'queued' && (
                    <button
                      type="button"
                      className="btn ghost"
                      style={{ padding: '6px 10px', fontSize: '11px', color: '#fca5a5' }}
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      Remove
                    </button>
                  )}

                  {item.status === 'failed' && (
                    <button
                      type="button"
                      className="btn ghost"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => {
                        setQueue((prev) =>
                          prev.map((it) =>
                            it.id === item.id ? { ...it, status: 'queued', error: undefined } : it
                          )
                        );
                        setIsProcessing(true);
                        setIsPaused(false);
                      }}
                    >
                      Retry
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
