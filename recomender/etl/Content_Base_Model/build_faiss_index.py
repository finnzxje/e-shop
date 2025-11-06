"""
  Build và test FAISS index với nhiều configurations  
  Returns:
    FLat index, IVF index, HNSW index 
"""
import numpy as np
import faiss
import pickle
import argparse
import logging
from pathlib import Path
from typing import Tuple
import time

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class FAISSIndexBuilder:
    """
    Build và test FAISS index với nhiều configurations
    """
    
    def __init__(self, 
                 embeddings_path: str = "../data/processed/hybrid_embeddings.npy",
                 variant_ids_path: str = "../data/processed/hybrid_variant_ids.npy",
                 output_dir: str = "../data/faiss"):
        """
        Args:
            embeddings_path: Path to hybrid embeddings
            variant_ids_path: Path to variant IDs
            output_dir: Output directory for FAISS index
        """
        self.embeddings_path = embeddings_path
        self.variant_ids_path = variant_ids_path
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        self.embeddings = None
        self.variant_ids = None
        self.dimension = None
    
    def load_embeddings(self) -> Tuple[np.ndarray, np.ndarray]:
        """Load hybrid embeddings"""
        logger.info(f"Loading embeddings from {self.embeddings_path}...")
        
        self.embeddings = np.load(self.embeddings_path)
        self.variant_ids = np.load(self.variant_ids_path, allow_pickle=True)
        self.dimension = self.embeddings.shape[1]
        
        logger.info(f"✓ Loaded {len(self.embeddings)} embeddings")
        logger.info(f"  Shape: {self.embeddings.shape}")
        logger.info(f"  Dimension: {self.dimension}")
        
        # Verify L2 normalization
        norms = np.linalg.norm(self.embeddings, axis=1)
        logger.info(f"  Norm range: [{norms.min():.4f}, {norms.max():.4f}]")
        
        if not np.allclose(norms, 1.0, atol=1e-3):
            logger.warning("⚠ Embeddings not L2-normalized! Normalizing now...")
            self.embeddings = self.embeddings / np.linalg.norm(self.embeddings, axis=1, keepdims=True)
            logger.info("✓ Embeddings normalized")
        
        # Convert to float32 for FAISS
        self.embeddings = self.embeddings.astype('float32')
        
        return self.embeddings, self.variant_ids
    
    def build_flat_index(self) -> faiss.Index:
        """
        Build Flat index (exact search)
        
        Pros: 100% accuracy
        Cons: Slower for large datasets (>1M vectors)
        Use case: <100K vectors or when accuracy is critical
        """
        logger.info("\n Building Flat Index (Exact Search)...")
        
        index = faiss.IndexFlatIP(self.dimension)
        
        start_time = time.time()
        index.add(self.embeddings)
        build_time = time.time() - start_time
        
        logger.info(f"✓ Flat index built in {build_time:.2f}s")
        logger.info(f"  Total vectors: {index.ntotal}")
        
        return index
    
    def build_ivf_index(self, nlist: int = 100, nprobe: int = 10) -> faiss.Index:
        """
        Build IVF index (approximate search with clustering)
        
        Args:
            nlist: Number of clusters (sqrt(N) to 4*sqrt(N) recommended)
            nprobe: Number of clusters to search (1-nlist, higher = more accurate)
        
        Pros: Much faster than Flat for large datasets
        Cons: Slight accuracy loss (~95-99% recall)
        Use case: 100K-10M vectors
        """
        logger.info(f"\n Building IVF Index (nlist={nlist}, nprobe={nprobe})...")
        
        # Create quantizer
        quantizer = faiss.IndexFlatIP(self.dimension)
        
        # Create IVF index
        index = faiss.IndexIVFFlat(quantizer, self.dimension, nlist, faiss.METRIC_INNER_PRODUCT)
        
        # Train on embeddings
        logger.info("Training IVF clusters...")
        start_time = time.time()
        index.train(self.embeddings)
        train_time = time.time() - start_time
        
        logger.info(f"✓ Training completed in {train_time:.2f}s")
        
        # Add vectors
        logger.info("Adding vectors to index...")
        start_time = time.time()
        index.add(self.embeddings)
        add_time = time.time() - start_time
        
        # Set search parameters
        index.nprobe = nprobe
        
        logger.info(f"✓ IVF index built in {train_time + add_time:.2f}s")
        logger.info(f"  Total vectors: {index.ntotal}")
        logger.info(f"  Clusters: {nlist}")
        logger.info(f"  Search clusters (nprobe): {nprobe}")
        
        return index
    
    def build_hnsw_index(self, M: int = 32, efConstruction: int = 40, efSearch: int = 16) -> faiss.Index:
        """
        Build HNSW index (hierarchical navigable small world)
        
        Args:
            M: Number of connections per layer (16-64, higher = better accuracy)
            efConstruction: Size of dynamic candidate list (construction)
            efSearch: Size of dynamic candidate list (search)
        
        Pros: Best for large scale (>10M), very fast search
        Cons: Slower build time, more memory
        Use case: 1M-100M+ vectors
        """
        logger.info(f"\n Building HNSW Index (M={M}, efC={efConstruction}, efS={efSearch})...")
        
        index = faiss.IndexHNSWFlat(self.dimension, M, faiss.METRIC_INNER_PRODUCT)
        index.hnsw.efConstruction = efConstruction
        index.hnsw.efSearch = efSearch
        
        logger.info("Adding vectors to HNSW index...")
        start_time = time.time()
        index.add(self.embeddings)
        build_time = time.time() - start_time
        
        logger.info(f" HNSW index built in {build_time:.2f}s")
        logger.info(f"  Total vectors: {index.ntotal}")
        logger.info(f"  M: {M}")
        logger.info(f"  efSearch: {efSearch}")
        
        return index
    
    def benchmark_index(self, index: faiss.Index, n_queries: int = 100, k: int = 10) -> dict:
        """
        Benchmark index performance
        
        Args:
            index: FAISS index to benchmark
            n_queries: Number of random queries
            k: Number of neighbors to retrieve
        
        Returns:
            Dict with performance metrics
        """
        logger.info(f"\n Benchmarking index with {n_queries} queries...")
        
        # Random query vectors
        query_indices = np.random.choice(len(self.embeddings), n_queries, replace=False)
        query_vectors = self.embeddings[query_indices]
        
        # Search
        start_time = time.time()
        distances, indices = index.search(query_vectors, k)
        search_time = time.time() - start_time
        
        # Calculate metrics
        avg_time_per_query = (search_time / n_queries) * 1000  # ms
        qps = n_queries / search_time
        
        logger.info(" Benchmark Results:")
        logger.info(f"  Total time: {search_time:.3f}s")
        logger.info(f"  Avg time per query: {avg_time_per_query:.2f}ms")
        logger.info(f"  Queries per second: {qps:.0f} QPS")
        
        return {
            'total_time': search_time,
            'avg_time_ms': avg_time_per_query,
            'qps': qps,
            'n_queries': n_queries,
            'k': k
        }
    
    def save_index(self, index: faiss.Index, index_name: str):
        """Save FAISS index and mappings"""
        index_path = self.output_dir / f"{index_name}.faiss"
        mappings_path = self.output_dir / f"{index_name}_mappings.pkl"
        
        logger.info(f"\n Saving index to {index_path}...")
        
        # Save index
        faiss.write_index(index, str(index_path))
        
        # Save mappings
        mappings = {
            'variant_ids': self.variant_ids,
            'id_to_idx': {str(vid): idx for idx, vid in enumerate(self.variant_ids)},
            'idx_to_id': {idx: str(vid) for idx, vid in enumerate(self.variant_ids)}
        }
        
        with open(mappings_path, 'wb') as f:
            pickle.dump(mappings, f)
        
        logger.info(f"✓ Index saved to {index_path}")
        logger.info(f"✓ Mappings saved to {mappings_path}")
        
        # Print file sizes
        index_size_mb = index_path.stat().st_size / (1024 * 1024)
        mappings_size_mb = mappings_path.stat().st_size / (1024 * 1024)
        
        logger.info(f"  Index size: {index_size_mb:.2f} MB")
        logger.info(f"  Mappings size: {mappings_size_mb:.2f} MB")
    
    def compare_indexes(self):
        """Compare different index types"""
        logger.info("\n" + "="*70)
        logger.info(" COMPARING INDEX TYPES")
        logger.info("="*70)
        
        results = {}
        
        # 1. Flat Index
        logger.info("\nFLAT INDEX (Exact Search)")
        flat_index = self.build_flat_index()
        results['flat'] = self.benchmark_index(flat_index)
        
        # 2. IVF Index
        logger.info("\n IVF INDEX (Approximate Search)")
        nlist = min(100, int(np.sqrt(len(self.embeddings))))
        ivf_index = self.build_ivf_index(nlist=nlist, nprobe=10)
        results['ivf'] = self.benchmark_index(ivf_index)
        
        # 3. HNSW Index
        logger.info("\n HNSW INDEX (Hierarchical NSW)")
        hnsw_index = self.build_hnsw_index()
        results['hnsw'] = self.benchmark_index(hnsw_index)
        
        # Print comparison
        logger.info("\n" + "="*70)
        logger.info("COMPARISON SUMMARY")
        logger.info("="*70)
        logger.info(f"{'Index Type':<15} {'Avg Time (ms)':<15} {'QPS':<15}")
        logger.info("-"*70)
        
        for name, metrics in results.items():
            logger.info(f"{name.upper():<15} {metrics['avg_time_ms']:<15.2f} {metrics['qps']:<15.0f}")
        
        logger.info("="*70)
        
        # Save all indexes
        self.save_index(flat_index, "hybrid_flat")
        self.save_index(ivf_index, "hybrid_ivf")
        self.save_index(hnsw_index, "hybrid_hnsw")
        
        return results


def main():
    parser = argparse.ArgumentParser(description="Build FAISS index from hybrid embeddings")
    
    parser.add_argument(
        '--index-type',
        type=str,
        default='flat',
        choices=['flat', 'ivf', 'hnsw', 'all'],
        help='Type of FAISS index to build'
    )
    
    parser.add_argument(
        '--nlist',
        type=int,
        default=100,
        help='Number of clusters for IVF index'
    )
    
    parser.add_argument(
        '--nprobe',
        type=int,
        default=10,
        help='Number of clusters to search for IVF'
    )
    
    parser.add_argument(
        '--embeddings',
        type=str,
        default='../data/processed/hybrid_embeddings.npy',
        help='Path to hybrid embeddings'
    )
    
    parser.add_argument(
        '--variant-ids',
        type=str,
        default='../data/processed/hybrid_variant_ids.npy',
        help='Path to variant IDs'
    )
    
    parser.add_argument(
        '--output-dir',
        type=str,
        default='../data/faiss',
        help='Output directory for FAISS index'
    )
    
    parser.add_argument(
        '--benchmark',
        action='store_true',
        help='Run benchmark after building'
    )
    
    args = parser.parse_args()
    
    # Initialize builder
    builder = FAISSIndexBuilder(
        embeddings_path=args.embeddings,
        variant_ids_path=args.variant_ids,
        output_dir=args.output_dir
    )
    
    # Load embeddings
    builder.load_embeddings()
    
    # Build index
    if args.index_type == 'all':
        # Compare all index types
        builder.compare_indexes()
    
    elif args.index_type == 'flat':
        index = builder.build_flat_index()
        if args.benchmark:
            builder.benchmark_index(index)
        builder.save_index(index, "hybrid_flat")
    
    elif args.index_type == 'ivf':
        index = builder.build_ivf_index(nlist=args.nlist, nprobe=args.nprobe)
        if args.benchmark:
            builder.benchmark_index(index)
        builder.save_index(index, "hybrid_ivf")
    
    elif args.index_type == 'hnsw':
        index = builder.build_hnsw_index()
        if args.benchmark:
            builder.benchmark_index(index)
        builder.save_index(index, "hybrid_hnsw")
    
    logger.info("\n FAISS index building completed!")
    logger.info(f"Output: {args.output_dir}/")


if __name__ == "__main__":
    main()