import chromadb
import os
from sentence_transformers import SentenceTransformer


class VectorStoreService:
    def __init__(self):
        self.client = chromadb.Client()
        self.collection = self.client.get_or_create_collection(
            "vishleshan_skills",
            metadata={"hnsw:space": "cosine"}
        )
        self._model = None

    def _get_model(self):
        if not self._model:
            self._model = SentenceTransformer('all-MiniLM-L6-v2')
        return self._model

    def add_skill(self, skill_id: str, canonical_name: str,
                  category: str, synonyms: list):
        text = f"{canonical_name} {category} {' '.join(synonyms)}"
        embedding = self._get_model().encode(text).tolist()
        try:
            self.collection.add(
                ids=[skill_id],
                embeddings=[embedding],
                documents=[text],
                metadatas=[{
                    "canonical": canonical_name,
                    "category": category
                }]
            )
        except:
            pass  # Already exists

    def find_closest_skill(self, raw_skill: str, n: int = 1) -> list:
        embedding = self._get_model().encode(raw_skill).tolist()
        results = self.collection.query(
            query_embeddings=[embedding],
            n_results=n
        )
        if not results["ids"][0]:
            return []
        return [
            {
                "canonical": results["metadatas"][0][i]["canonical"],
                "distance": results["distances"][0][i]
            }
            for i in range(len(results["ids"][0]))
        ]


vector_store = VectorStoreService()
