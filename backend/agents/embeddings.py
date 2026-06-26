import logging

logger = logging.getLogger(__name__)

# Global model cache to avoid reloading on each request
_model_cache = None

def get_embedding_model():
    global _model_cache
    if _model_cache is None:
        try:
            from sentence_transformers import SentenceTransformer
            # Force CPU device to optimize memory and CPU usage on serverless containers (like Render)
            _model_cache = SentenceTransformer('all-MiniLM-L6-v2', device='cpu')
        except Exception as e:
            logger.error("Failed to load SentenceTransformer all-MiniLM-L6-v2: %s", e)
    return _model_cache
