"""
Complete Workflow: CLIP → BERT → Hybrid → Recommendations
(no LightFM)
"""

import numpy as np
import pandas as pd
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import Config  # Updated import path

# ============================================================================
# STEP 1: CLIP EMBEDDINGS (Already done)
# ============================================================================

print("="*70)
print("STEP 1: CLIP Embeddings")
print("="*70)
print("✓ Already generated via clip_embedding_pipeline.py")
print("  Files:")
print("    - data/processed/clip_item_embeddings.npy")
print("    - data/processed/variant_ids.npy")
print()

# ============================================================================
# STEP 2-3: BERT + HYBRID EMBEDDINGS
# ============================================================================

print("="*70)
print("STEP 2-3: Generating BERT Metadata + Hybrid Fusion")
print("="*70)

from bert_metadata_embedder import HybridEmbeddingPipeline

# Initialize pipeline
pipeline = HybridEmbeddingPipeline(
    db_config=Config.DB_CONFIG,
    bert_model="bert-base-uncased",
    fusion_alpha=0.7,  # 70% CLIP + 30% metadata
    device="cuda"
)

# Run pipeline
results = pipeline.run(
    save_to_db=True,
    save_to_numpy=True,
    input_dir="../data/processed",
    output_dir="../data/processed"
)

print("\n✓ Hybrid embeddings generated!")
print(f"  Shape: {results['hybrid_embeddings'].shape}")
print(f"  Saved to: data/processed/hybrid_embeddings.npy")
print()

# ============================================================================
# STEP 4: RECOMMENDATIONS (Direct cosine similarity)
# ============================================================================

print("\n" + "="*70)
print("STEP 4: Making Recommendations")
print("="*70)

class HybridRecommender:
    """
    Recommendation system using hybrid embeddings
    """
    
    def __init__(self, embeddings_path: str = "../data/processed/hybrid_embeddings.npy"):
        """Load hybrid embeddings"""
        self.embeddings = np.load(embeddings_path)
        self.variant_ids = np.load(embeddings_path.replace("hybrid_embeddings", "hybrid_variant_ids"))
        
        # Create lookup
        self.id_to_idx = {vid: idx for idx, vid in enumerate(self.variant_ids)}
        self.idx_to_id = {idx: vid for vid, idx in self.id_to_idx.items()}
        
        print(f"✓ Loaded {len(self.embeddings)} hybrid embeddings")
    
    def get_similar_products(self, product_id: str, k: int = 10) -> list:
        """
        Find k most similar products using cosine similarity
        """
        if product_id not in self.id_to_idx:
            print(f"Product {product_id} not found in embeddings")
            return []
        
        query_idx = self.id_to_idx[product_id]
        query_emb = self.embeddings[query_idx]
        
        similarities = np.dot(self.embeddings, query_emb)
        
        # Exclude itself and get top-k
        top_indices = np.argsort(-similarities)[1:k+1]
        
        return [
            (self.idx_to_id[idx], float(similarities[idx]))
            for idx in top_indices
        ]
    
    def batch_recommend(self, product_ids: list, k: int = 10) -> dict:
        """Batch recommendation"""
        return {pid: self.get_similar_products(pid, k) for pid in product_ids}


# Example usage
print("\nExample: Get recommendations for a product")
print("-" * 70)

recommender = HybridRecommender()
example_product_id = recommender.variant_ids[0]
recommendations = recommender.get_similar_products(example_product_id, k=5)

print(f"\nTop 5 recommendations for product '{example_product_id}':")
for i, (rec_id, score) in enumerate(recommendations, 1):
    print(f"  {i}. Product {rec_id} (similarity: {score:.4f})")

print("\n" + "="*70)
print(" COMPLETE WORKFLOW FINISHED!")
print("="*70)
print("""
Summary:
--------
1. CLIP embeddings (image + text)
2. BERT metadata embeddings
3. Hybrid fusion (70% CLIP + 30% metadata)
4. Recommendation using cosine similarity (no LightFM)
""")
