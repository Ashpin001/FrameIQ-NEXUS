"""Deterministic visual-temporal reranking: novelty, MMR diversity and category priors.
These are heuristic research baselines; no CTR or human-preference claims.
"""
import cv2
import numpy as np

def features(path):
    img=cv2.imread(str(path))
    if img is None: raise ValueError('Missing candidate image')
    hsv=cv2.cvtColor(cv2.resize(img,(160,90)),cv2.COLOR_BGR2HSV)
    hist=cv2.calcHist([hsv],[0,1],None,[18,12],[0,180,0,256]).ravel().astype(np.float32)
    hist/=np.linalg.norm(hist)+1e-8
    gray=cv2.cvtColor(cv2.resize(img,(32,18)),cv2.COLOR_BGR2GRAY).astype(np.float32)/255
    tiny=gray.ravel();tiny-=tiny.mean();tiny/=np.linalg.norm(tiny)+1e-8
    return np.r_[hist*.7,tiny*.3]

def rerank(items, root, diversity=.55, novelty=.35, category='general', top_k=5):
    if not items: return []
    diversity=float(np.clip(diversity,0,1)); novelty=float(np.clip(novelty,0,1))
    category=str(category).lower()
    priors={'education':(.85,.15),'gaming':(.55,.45),'travel':(.65,.35),'news':(.9,.1),'general':(.75,.25)}
    q_weight, novelty_weight=priors.get(category,priors['general'])
    vectors=np.array([features(root / x['image_path']) for x in items])
    similarity=np.clip(vectors@vectors.T,0,1)
    raw=np.array([float(x.get('cqtr_score',0)) for x in items]);raw=np.nan_to_num(raw,nan=0,posinf=0,neginf=0)
    if raw.max()>1.0: raw=raw/100.0
    raw=np.clip(raw,0,1)
    temporal=np.array([float(x.get('timestamp_sec',0)) for x in items]); span=max(temporal.max()-temporal.min(),1)
    temporal_novelty=np.array([min(abs(t-s) for s in temporal if s!=t)/span if np.any(temporal!=t) else 0 for t in temporal])
    visual_novelty=1-(similarity.sum(axis=1)-1)/max(len(items)-1,1)
    novelty_score=(visual_novelty+temporal_novelty)/2
    base=q_weight*raw+novelty_weight*novelty*novelty_score
    selected=[];remaining=set(range(len(items)))
    while remaining and len(selected)<min(top_k,len(items)):
        def mmr(i):
            penalty=max((similarity[i,j] for j in selected),default=0)
            return (1-diversity)*base[i]+diversity*(1-penalty)
        chosen=max(sorted(remaining),key=lambda i:(mmr(i),-i))
        selected.append(chosen);remaining.remove(chosen)
    return [dict(items[i],quality_score=round(float(raw[i]),4),novelty_score=round(float(novelty_score[i]),4),diversity_score=round(float(1-max((similarity[i,j] for j in selected[:p]),default=0)),4),rank=p+1,method='visual-temporal MMR') for p,i in enumerate(selected)]
