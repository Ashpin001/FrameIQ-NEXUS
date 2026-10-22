import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { VideoRecord, ProcessingResultRecord, ScoredCandidate } from '../types';
import { rerankNexus } from '../utils/nexusRanker';
import '../styles/nexus.css';

interface NexusPageProps {
  initialResult?: ProcessingResultRecord;
  video?: VideoRecord;
  onNavigate: (view: string, param?: number) => void;
}

export const NexusPage: React.FC<NexusPageProps> = ({
  initialResult,
  video,
  onNavigate,
}) => {
  // Candidate frames from result or defaults
  const candidates: ScoredCandidate[] = initialResult
    ? [
        {
          shot_id: initialResult.score_breakdown.shot_id,
          frame_index: initialResult.best_frame_index,
          timestamp_sec: initialResult.best_timestamp_sec,
          sharpness: initialResult.score_breakdown.sharpness,
          brightness: initialResult.score_breakdown.brightness,
          contrast: initialResult.score_breakdown.contrast,
          color: initialResult.score_breakdown.color,
          scene_representativeness: initialResult.score_breakdown.scene_representativeness,
          content_importance: initialResult.score_breakdown.content_importance,
          redundancy_penalty: initialResult.score_breakdown.redundancy_penalty,
          cqtr_score: initialResult.cqtr_score,
          image_path: 'best_thumbnail.jpg',
          dataUrl: initialResult.thumbnail_dataUrl,
        },
        ...(initialResult.score_breakdown.alternatives || []),
      ]
    : [];

  const [items, setItems] = useState<ScoredCandidate[]>(candidates);
  const [rankedList, setRankedList] = useState<ScoredCandidate[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Controls
  const [category, setCategory] = useState<string>('general');
  const [diversity, setDiversity] = useState<number>(0.55);
  const [novelty, setNovelty] = useState<number>(0.35);
  const [isRanking, setIsRanking] = useState<boolean>(false);
  const [rankStatus, setRankStatus] = useState<string>('');
  const [isMotion, setIsMotion] = useState<boolean>(true);
  const [isFlatView, setIsFlatView] = useState<boolean>(false);

  // Three.js refs
  const mountRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const cardGroupRef = useRef<THREE.Group | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const displayList = rankedList.length > 0 ? rankedList : items;
  const currentSelected = displayList[selectedIndex] || displayList[0];

  // Re-build 3D cards
  const rebuild3D = (cardList: ScoredCandidate[]) => {
    const group = cardGroupRef.current;
    if (!group) return;

    // Dispose old children
    while (group.children.length > 0) {
      const child = group.children[0] as THREE.Mesh;
      group.remove(child);
      child.geometry?.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => {
            (m as any).map?.dispose();
            m.dispose();
          });
        } else {
          (child.material as any).map?.dispose();
          child.material.dispose();
        }
      }
    }

    const n = Math.max(12, cardList.length);
    const textureLoader = new THREE.TextureLoader();

    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const geometry = new THREE.PlaneGeometry(2.4, 1.35);
      const material = new THREE.MeshBasicMaterial({
        color: 0x6254a9,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      });

      const mesh = new THREE.Mesh(geometry, material);
      if (isFlatView) {
        mesh.position.set(((i % 4) - 1.5) * 2.8, (Math.floor(i / 4) - 1) * -1.8, 0);
        mesh.rotation.set(0, 0, 0);
      } else {
        mesh.position.set(Math.cos(a) * 5.2, Math.sin(a * 2) * 1.4, Math.sin(a) * 3);
        mesh.rotation.y = -a;
      }
      mesh.userData = { index: i };
      group.add(mesh);

      const candidate = cardList[i];
      if (candidate?.dataUrl) {
        textureLoader.load(candidate.dataUrl, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          material.map = tex;
          material.color.setHex(0xffffff);
          material.needsUpdate = true;
        });
      }
    }
  };

  // Initialize Three.js scene
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 800;
    const height = mount.clientHeight || 420;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      // Fallback if WebGL unsupported
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x090c19, 0.045);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 2.5, 14);
    cameraRef.current = camera;

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.6);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xa66dff, 40);
    pointLight.position.set(4, 6, 6);
    scene.add(pointLight);

    const group = new THREE.Group();
    scene.add(group);
    cardGroupRef.current = group;

    const grid = new THREE.GridHelper(30, 24, 0x483778, 0x252342);
    grid.position.y = -3;
    scene.add(grid);

    // Starfield particles
    const starGeom = new THREE.BufferGeometry();
    const starCoords: number[] = [];
    for (let i = 0; i < 500; i++) {
      starCoords.push(
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 26,
        (Math.random() - 0.5) * 35
      );
    }
    starGeom.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(starCoords, 3)
    );
    scene.add(
      new THREE.Points(
        starGeom,
        new THREE.PointsMaterial({ color: 0x7876c4, size: 0.04 })
      )
    );

    rebuild3D(displayList);

    // Pointer orbit and drag controls
    let isPointerDown = false;
    let lastClientX = 0;
    const dom = renderer.domElement;

    const handlePointerDown = (e: PointerEvent) => {
      isPointerDown = true;
      lastClientX = e.clientX;
      dom.setPointerCapture(e.pointerId);
    };

    const handlePointerUp = () => {
      isPointerDown = false;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (isPointerDown && group) {
        group.rotation.y += (e.clientX - lastClientX) * 0.008;
        lastClientX = e.clientX;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (camera) {
        camera.position.z = Math.max(5, Math.min(25, camera.position.z + Math.sign(e.deltaY)));
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (!camera || !group) return;
      const rect = dom.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(group.children);
      if (intersects.length > 0) {
        const idx = intersects[0].object.userData.index;
        if (Number.isInteger(idx) && idx < displayList.length) {
          setSelectedIndex(idx);
        }
      }
    };

    dom.addEventListener('pointerdown', handlePointerDown);
    dom.addEventListener('pointerup', handlePointerUp);
    dom.addEventListener('pointermove', handlePointerMove);
    dom.addEventListener('wheel', handleWheel, { passive: false });
    dom.addEventListener('click', handleClick);

    // Animation loop
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      if (isMotion && group) {
        group.rotation.y += 0.0015;
      }
      renderer.render(scene, camera);
    };
    animate();

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (!mount || !renderer || !camera) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(mount);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      resizeObserver.disconnect();
      dom.removeEventListener('pointerdown', handlePointerDown);
      dom.removeEventListener('pointerup', handlePointerUp);
      dom.removeEventListener('pointermove', handlePointerMove);
      dom.removeEventListener('wheel', handleWheel);
      dom.removeEventListener('click', handleClick);
      renderer.dispose();
      if (mount.contains(dom)) mount.removeChild(dom);
    };
  }, []);

  // Sync 3D card highlight
  useEffect(() => {
    const group = cardGroupRef.current;
    if (!group) return;
    group.children.forEach((mesh, idx) => {
      const isSelected = idx === selectedIndex;
      mesh.scale.setScalar(isSelected ? 1.2 : 1.0);
      const mat = (mesh as THREE.Mesh).material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = isSelected ? 1.0 : 0.85;
      }
    });
  }, [selectedIndex]);

  // Handle Adaptive Ranking with MMR
  const handleRunRanking = async () => {
    if (items.length === 0) return;
    setIsRanking(true);
    setRankStatus('Calculating histogram + structural similarity, novelty, and MMR…');

    try {
      const ranked = await rerankNexus(items, diversity, novelty, category, 5);
      setRankedList(ranked);
      setSelectedIndex(0);
      rebuild3D(ranked);
      setRankStatus(`Ranked ${ranked.length} diverse frames using MMR. No fabricated metrics.`);
    } catch (err: any) {
      setRankStatus(`Error: ${err?.message || 'Ranking failed'}`);
    } finally {
      setIsRanking(false);
    }
  };

  const handleResetView = () => {
    if (cardGroupRef.current) cardGroupRef.current.rotation.set(0, 0, 0);
    if (cameraRef.current) cameraRef.current.position.set(0, 2.5, 14);
  };

  const handleToggleViewMode = () => {
    const nextFlat = !isFlatView;
    setIsFlatView(nextFlat);
    const group = cardGroupRef.current;
    if (!group) return;

    group.children.forEach((mesh, i) => {
      if (nextFlat) {
        mesh.position.set(((i % 4) - 1.5) * 2.8, (Math.floor(i / 4) - 1) * -1.8, 0);
        mesh.rotation.set(0, 0, 0);
      } else {
        const a = (i / group.children.length) * Math.PI * 2;
        mesh.position.set(Math.cos(a) * 5.2, Math.sin(a * 2) * 1.4, Math.sin(a) * 3);
        mesh.rotation.y = -a;
      }
    });
  };

  return (
    <div className="nexus-page">
      <div className="nexus-app">
        {/* Rail navigation */}
        <aside className="rail">
          <a
            className="rail-brand"
            href="#nexus"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('nexus');
            }}
          >
            ◈ Frame<span>IQ</span>
            <small>NEXUS</small>
          </a>

          <div className="label">WORKSPACE</div>
          <button
            type="button"
            className="nav active"
            onClick={() => onNavigate('nexus')}
          >
            ◉ &nbsp; Spatial studio
          </button>
          <button
            type="button"
            className="nav"
            onClick={() => onNavigate('home')}
          >
            ↥ &nbsp; Upload video
          </button>
          <button
            type="button"
            className="nav"
            onClick={() => onNavigate('history')}
          >
            ◷ &nbsp; Projects
          </button>

          <div className="label">RESEARCH</div>
          <a className="nav" href="#analysis">
            ◇ &nbsp; Multi-objective ranker
          </a>
          <a className="nav" href="#timeline">
            ▤ &nbsp; Timeline constellation
          </a>
          <a className="nav" href="#export">
            ⇩ &nbsp; Export
          </a>

          <div className="foot">
            ● Local inference
            <small>No fake CTR metrics</small>
          </div>
        </aside>

        {/* Main Content */}
        <main className="nexus-main">
          <header className="nexus-header">
            <span>FRAMEIQ / SPATIAL INTELLIGENCE</span>
            <span className="pill">◉ 3D EXPERIMENTAL WORKSPACE</span>
          </header>

          <section className="nexus-hero">
            <div>
              <div className="eyebrow">BEYOND THE THUMBNAIL</div>
              <h1>
                See the story
                <br />
                <em>between the frames.</em>
              </h1>
              <p>
                Explore video moments as a spatial constellation. Rank for
                clarity, novelty, and diversity using an explainable
                multi-objective algorithm.
              </p>
              <div className="actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => onNavigate('home')}
                >
                  ✦ Analyze a video ↗
                </button>
                <button
                  type="button"
                  id="resetView"
                  className="btn ghost"
                  onClick={handleResetView}
                >
                  Reset 3D view
                </button>
              </div>
            </div>

            <div className="orb" aria-hidden="true">
              <span>◈</span>
              <div className="orbit a"></div>
              <div className="orbit b"></div>
            </div>
          </section>

          {/* Status Bar */}
          <div className="nexus-status" id="status" role="status">
            {initialResult
              ? `${displayList.length} real candidate frames loaded · ${initialResult.processing_time_sec.toFixed(1)}s original processing time · ready for visual-temporal ranking`
              : 'Upload and process a video to unlock the 3D frame constellation. Showing procedural demonstration frames.'}
          </div>

          {/* Workgrid: 3D Scene + Ranking Controls */}
          <section className="workgrid">
            <div className="panel scene">
              <div className="panelhead">
                <div>
                  <b>SPATIAL FRAME CONSTELLATION</b>
                  <small id="sceneLabel">
                    {isFlatView
                      ? '2D Grid projection · click frame to inspect'
                      : '3D projection · drag to orbit, scroll to zoom'}
                  </small>
                </div>
                <div className="tools">
                  <button
                    type="button"
                    id="toggleMotion"
                    onClick={() => setIsMotion(!isMotion)}
                  >
                    {isMotion ? 'Pause motion' : 'Resume motion'}
                  </button>
                  <button
                    type="button"
                    id="viewMode"
                    onClick={handleToggleViewMode}
                  >
                    {isFlatView ? 'Constellation view' : 'Switch view'}
                  </button>
                </div>
              </div>

              <div id="canvasHost" className="canvasHost" ref={mountRef}>
                <div className="scenehelp">
                  DRAG TO ORBIT · SCROLL TO ZOOM · CLICK A FRAME TO SELECT
                </div>
              </div>
            </div>

            {/* Ranking Intelligence */}
            <div className="panel control" id="analysis">
              <div className="panelhead">
                <div>
                  <b>RANKING INTELLIGENCE</b>
                  <small>MMR · Visual novelty</small>
                </div>
              </div>

              <label htmlFor="nexus-category">
                Video context
                <select
                  id="nexus-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="general">General</option>
                  <option value="education">Education</option>
                  <option value="gaming">Gaming</option>
                  <option value="travel">Travel</option>
                  <option value="news">News</option>
                </select>
              </label>

              <label htmlFor="diversity-slider">
                Visual diversity <output id="diversityValue">{diversity.toFixed(2)}</output>
                <input
                  id="diversity-slider"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={diversity}
                  onChange={(e) => setDiversity(parseFloat(e.target.value))}
                />
              </label>

              <label htmlFor="novelty-slider">
                Novelty weight <output id="noveltyValue">{novelty.toFixed(2)}</output>
                <input
                  id="novelty-slider"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={novelty}
                  onChange={(e) => setNovelty(parseFloat(e.target.value))}
                />
              </label>

              <button
                type="button"
                id="rank"
                className="btn full"
                disabled={isRanking || items.length === 0}
                onClick={handleRunRanking}
              >
                {isRanking ? 'Running MMR…' : '✦ Run adaptive ranking'}
              </button>

              <p className="note">
                MMR balances quality against near-duplicate frames; novelty
                incorporates visual feature similarity and temporal separation.
                Scores are heuristic, not predicted views or clicks.
              </p>

              {rankStatus && (
                <div id="rankStatus" className="smallstatus" aria-live="polite">
                  {rankStatus}
                </div>
              )}
            </div>
          </section>

          {/* Recommendation Galaxy Cards */}
          <section className="panel" id="timeline">
            <div className="panelhead">
              <div>
                <b>RECOMMENDATION GALAXY</b>
                <small>Real candidate frames extracted from the video</small>
              </div>
              <span className="pill" id="count">
                {displayList.length} candidates
              </span>
            </div>

            <div className="cards" id="cards">
              {displayList.length === 0 ? (
                <div className="empty">
                  Your top recommendations will appear here after processing a video.
                </div>
              ) : (
                displayList.map((f, i) => (
                  <button
                    key={`${f.frame_index}-${i}`}
                    type="button"
                    className={`frame ${i === selectedIndex ? 'selected' : ''}`}
                    onClick={() => setSelectedIndex(i)}
                  >
                    <img src={f.dataUrl} alt={`Candidate frame ${f.frame_index}`} />
                    <strong>
                      #{i + 1} · Frame {f.frame_index}
                    </strong>
                    <small>
                      {f.timestamp_sec.toFixed(1)}s · quality {f.cqtr_score.toFixed(3)}
                      {f.novelty_score !== undefined && (
                        <span> · nov {f.novelty_score.toFixed(2)}</span>
                      )}
                    </small>
                  </button>
                ))
              )}
            </div>
          </section>

          {/* Selection Inspector */}
          {currentSelected && (
            <section className="panel export" id="export">
              <div>
                <b>SELECTION INSPECTOR</b>
                <p id="inspector">
                  Frame {currentSelected.frame_index} · {currentSelected.timestamp_sec.toFixed(2)}s ·
                  CQTR {currentSelected.cqtr_score.toFixed(3)}
                  {currentSelected.novelty_score !== undefined &&
                    ` · Novelty ${currentSelected.novelty_score}`}
                  {currentSelected.diversity_score !== undefined &&
                    ` · Diversity ${currentSelected.diversity_score}`}
                  . Scores are heuristic.
                </p>
              </div>

              <div id="preview" className="nexus-preview">
                <img
                  src={currentSelected.dataUrl}
                  alt={`Selected frame ${currentSelected.frame_index}`}
                />
              </div>

              <div className="exportactions">
                <a
                  id="download"
                  className="btn ghost"
                  href={currentSelected.dataUrl}
                  download={`frameiq_nexus_frame_${currentSelected.frame_index}.jpg`}
                >
                  Download selected frame
                </a>
                {initialResult && (
                  <button
                    type="button"
                    id="editor"
                    className="btn ghost"
                    onClick={() => onNavigate('studio', initialResult.id)}
                  >
                    Open editor
                  </button>
                )}
              </div>
            </section>
          )}

          <footer>
            FRAMEIQ NEXUS · Visual-temporal diversity is an experimental heuristic ·
            Three.js spatial rendering
          </footer>
        </main>
      </div>
    </div>
  );
};
