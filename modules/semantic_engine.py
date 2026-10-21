"""Optional CLIP zero-shot semantic reranker. Explicitly reports when unavailable."""
from functools import lru_cache
import numpy as np

@lru_cache(maxsize=1)
def _model():
    from sentence_transformers import SentenceTransformer
    return SentenceTransformer('clip-ViT-B-32')

def rerank(scored_candidates, topic, category='general', top_k=30):
    """Return ordered candidates and per-frame explainable scores; raises on missing optional dependency."""
    from PIL import Image
    import cv2
    if not topic or not topic.strip():
        raise ValueError('A topic is required for semantic ranking')
    model = _model()
    subset = scored_candidates[:top_k]
    imgs = [Image.fromarray(cv2.cvtColor(c.frame, cv2.COLOR_BGR2RGB)) for c in subset]
    image_vec = np.asarray(model.encode(imgs, convert_to_numpy=True, show_progress_bar=False))
    text_vec = np.asarray(model.encode([topic], convert_to_numpy=True, show_progress_bar=False))[0]
    sims = (image_vec @ text_vec) / (np.linalg.norm(image_vec,axis=1)*np.linalg.norm(text_vec)+1e-8)
    relevance = np.clip((sims+1)/2, 0, 1)
    weights = {'education': .48, 'news': .52, 'gaming': .32, 'travel': .28, 'general': .40}
    alpha = weights.get(category, .40)
    items = []
    for c, sim in zip(subset, relevance):
        quality = float(np.clip(c.cqtr_score,0,1))
        score = (1-alpha)*quality+alpha*float(sim)
        items.append({'frame_index': int(c.frame_index), 'timestamp_sec':float(c.timestamp_sec),
                      'visual_score':quality,'semantic_score':float(sim),'combined_score':score,
                      'frame':c.frame})
    return sorted(items,key=lambda x:x['combined_score'],reverse=True)
