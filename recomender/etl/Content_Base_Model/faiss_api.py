"""
FastAPI + FAISS Recommendation System using Hybrid Embeddings

Components:
1. FAISS Index Builder - Build index from hybrid embeddings
2. FastAPI Server - REST API for recommendations
3. Redis Cache - Cache hot products
4. Health monitoring

Usage:
    python faiss_api.py
    # Query:
    curl http://localhost:8000/recommend/PRODUCT_123?k=10
"""

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any, Tuple
import numpy as np
import faiss
import pickle
import redis
import json
import logging
from datetime import datetime
import time
from pathlib import Path
import pandas as pd
from contextlib import asynccontextmanager

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================================
# CONFIGURATION
# ============================================================================

class Config:
    """Application configuration"""
    
    # Paths inside container
    EMBEDDINGS_PATH = "data/processed/hybrid_embeddings.npy"
    VARIANT_IDS_PATH = "data/processed/hybrid_variant_ids.npy"
    FAISS_INDEX_PATH = "data/faiss/hybrid_index.faiss"
    PRODUCT_METADATA_PATH = "data/processed/item_features.csv"
    
    # FAISS settings
    EMBEDDING_DIM = 512
    FAISS_USE_GPU = False
    FAISS_INDEX_TYPE = "Flat"  # Options: "Flat", "IVF", "HNSW"
    FAISS_NLIST = 100  # For IVF
    FAISS_NPROBE = 10
    
    # Redis settings
    REDIS_HOST = "redis"
    REDIS_PORT = 6379
    REDIS_DB = 0
    REDIS_CACHE_TTL = 3600  # 1 hour
    USE_REDIS = True
    
    # API settings
    DEFAULT_K = 10
    MAX_K = 100
    API_VERSION = "1.0.0"


# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class RecommendationItem(BaseModel):
    """Single recommendation"""
    variant_id: str 
    similarity_score: float
    product_name: Optional[str] = None
    category_name: Optional[str] = None
    price: Optional[float] = None
    image_path: Optional[str] = None


class RecommendationResponse(BaseModel):
    """API response"""
    query_variant_id: str
    recommendations: List[RecommendationItem]
    response_time_ms: float
    from_cache: bool = False
    total_results: int


class BatchRecommendationRequest(BaseModel):
    """Batch request"""
    product_ids: List[str] = Field(..., max_items=50)
    k: int = Field(10, ge=1, le=100)
    
    @validator('product_ids')
    def validate_product_ids(cls, v):
        if not v:
            raise ValueError("product_ids cannot be empty")
        return v


class HealthResponse(BaseModel):
    """Health check"""
    status: str
    timestamp: str
    faiss_index_size: int
    redis_connected: bool
    version: str
    embedding_dimension: int


# ============================================================================
# FAISS INDEX MANAGER
# ============================================================================

class FAISSIndexManager:
    """
    Manage FAISS index for ultra-fast similarity search
    Supports multiple index types for different scale/speed tradeoffs
    """
    
    def __init__(self, config: Config):
        self.config = config
        self.index = None
        self.variant_ids = None
        self.id_to_idx = {}
        self.idx_to_id = {}
        self.product_metadata = {}
        
    def build_index_from_embeddings(self, 
                                    embeddings: np.ndarray, 
                                    variant_ids: np.ndarray) -> None:
        """
        Build FAISS index from embeddings
        
        Args:
            embeddings: (N, 512) L2-normalized hybrid embeddings
            variant_ids: (N,) product IDs
        """
        logger.info(f"Building FAISS index from {len(embeddings)} embeddings...")
        
        # Ensure float32
        embeddings = embeddings.astype('float32')
        
        # Verify L2 normalization
        norms = np.linalg.norm(embeddings, axis=1)
        if not np.allclose(norms, 1.0, atol=1e-3):
            logger.warning("Embeddings not L2-normalized, normalizing now...")
            embeddings = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)
        
        d = embeddings.shape[1]  # 512
        n = embeddings.shape[0]
        
        # Build index based on config
        if self.config.FAISS_INDEX_TYPE == "Flat":
            # Exact search (best accuracy, slower for large datasets)
            logger.info("Building Flat index (exact search)...")
            self.index = faiss.IndexFlatIP(d)  # Inner Product = cosine sim for normalized vectors
            
        elif self.config.FAISS_INDEX_TYPE == "IVF":
            # Approximate search with IVF (faster, slight accuracy loss)
            logger.info(f"Building IVF index (nlist={self.config.FAISS_NLIST})...")
            quantizer = faiss.IndexFlatIP(d)
            self.index = faiss.IndexIVFFlat(quantizer, d, self.config.FAISS_NLIST)
            
            # Train index
            logger.info("Training IVF index...")
            self.index.train(embeddings)
            self.index.nprobe = self.config.FAISS_NPROBE
            
        elif self.config.FAISS_INDEX_TYPE == "HNSW":
            # Hierarchical NSW (best for large scale)
            logger.info("Building HNSW index...")
            self.index = faiss.IndexHNSWFlat(d, 32)  # 32 = M parameter
            self.index.hnsw.efConstruction = 40
            self.index.hnsw.efSearch = 16
        
        else:
            raise ValueError(f"Unknown index type: {self.config.FAISS_INDEX_TYPE}")
        
        # Add embeddings to index
        logger.info("Adding embeddings to index...")
        self.index.add(embeddings)
        
        # Store mappings
        self.variant_ids = variant_ids
        self.id_to_idx = {str(vid): idx for idx, vid in enumerate(variant_ids)}
        self.idx_to_id = {idx: str(vid) for idx, vid in enumerate(variant_ids)}
        
        logger.info(f"✓ FAISS index built: {self.index.ntotal} vectors")
        logger.info(f"  Index type: {self.config.FAISS_INDEX_TYPE}")
        logger.info(f"  Dimension: {d}")
    
    def search(self, product_id: str, k: int = 10) -> Tuple[List[str], List[float]]:
        """
        Search for k most similar products
        
        Args:
            product_id: Query product ID
            k: Number of results
        
        Returns:
            (product_ids, similarity_scores)
        """
        if product_id not in self.id_to_idx:
            raise ValueError(f"Product {product_id} not found in index")
        
        # Get query vector
        query_idx = self.id_to_idx[product_id]
        query_vector = self.index.reconstruct(int(query_idx)).reshape(1, -1)
        
        # Search (k+1 to exclude self)
        similarities, indices = self.index.search(query_vector, k + 1)
        
        # Filter out query product and convert
        results_ids = []
        results_scores = []
        
        for idx, sim in zip(indices[0], similarities[0]):
            if idx != query_idx and idx in self.idx_to_id:
                results_ids.append(self.idx_to_id[idx])
                results_scores.append(float(sim))
            
            if len(results_ids) >= k:
                break
        
        return results_ids, results_scores
    
    def batch_search(self, product_ids: List[str], k: int = 10) -> Dict[str, Tuple[List[str], List[float]]]:
        """
        Batch search for multiple products
        
        Args:
            product_ids: List of query product IDs
            k: Number of results per query
        
        Returns:
            Dict mapping product_id -> (recommended_ids, scores)
        """
        results = {}
        
        # Get query vectors
        valid_ids = [pid for pid in product_ids if pid in self.id_to_idx]
        if not valid_ids:
            return results
        
        query_indices = [self.id_to_idx[pid] for pid in valid_ids]
        query_vectors = np.array([self.index.reconstruct(int(idx)) for idx in query_indices])
        
        # Batch search
        similarities, indices = self.index.search(query_vectors, k + 1)
        
        # Process results
        for i, product_id in enumerate(valid_ids):
            query_idx = query_indices[i]
            
            results_ids = []
            results_scores = []
            
            for idx, sim in zip(indices[i], similarities[i]):
                if idx != query_idx and idx in self.idx_to_id:
                    results_ids.append(self.idx_to_id[idx])
                    results_scores.append(float(sim))
                
                if len(results_ids) >= k:
                    break
            
            results[product_id] = (results_ids, results_scores)
        
        return results
    
    def save_index(self, path: str = None):
        """Save FAISS index to disk"""
        path = path or self.config.FAISS_INDEX_PATH
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        
        faiss.write_index(self.index, path)
        
        # Save mappings
        mappings = {
            'variant_ids': self.variant_ids,
            'id_to_idx': self.id_to_idx,
            'idx_to_id': self.idx_to_id
        }
        
        with open(path.replace('.faiss', '_mappings.pkl'), 'wb') as f:
            pickle.dump(mappings, f)
        
        logger.info(f"✓ FAISS index saved to {path}")
    
    def load_index(self, path: str = None):
        """Load FAISS index from disk"""
        path = path or self.config.FAISS_INDEX_PATH
        
        if not Path(path).exists():
            raise FileNotFoundError(f"FAISS index not found at {path}")
        
        logger.info(f"Loading FAISS index from {path}...")
        
        self.index = faiss.read_index(path)
        
        # Load mappings
        with open(path.replace('.faiss', '_mappings.pkl'), 'rb') as f:
            mappings = pickle.load(f)
        
        self.variant_ids = mappings['variant_ids']
        self.id_to_idx = mappings['id_to_idx']
        self.idx_to_id = mappings['idx_to_id']
        
        logger.info(f" FAISS index loaded: {self.index.ntotal} vectors")
    
    def load_product_metadata(self, path: str = None):
        """Load product metadata for enriching responses"""
        path = path or self.config.PRODUCT_METADATA_PATH
        
        if not Path(path).exists():
            logger.warning(f"Metadata file not found: {path}")
            return
        
        logger.info(f"Loading product metadata from {path}...")
        
        df = pd.read_csv(path)
        df['variant_id'] = df['variant_id'].astype(str)
        
        # Create lookup dict
        self.product_metadata = df.set_index('variant_id').to_dict('index')
        
        logger.info(f"Loaded metadata for {len(self.product_metadata)} products")


# REDIS CACHE MANAGER

class RedisCacheManager:
    """
    Cache frequently requested recommendations in Redis
    """
    
    def __init__(self, config: Config):
        self.config = config
        self.redis_client = None
        
        if config.USE_REDIS:
            try:
                self.redis_client = redis.Redis(
                    host=config.REDIS_HOST,
                    port=config.REDIS_PORT,
                    db=config.REDIS_DB,
                    decode_responses=True
                )
                self.redis_client.ping()
                logger.info("Redis connected")
            except Exception as e:
                logger.warning(f"Redis connection failed: {e}")
                self.redis_client = None
    
    def get(self, product_id: str, k: int) -> Optional[Dict]:
        """Get cached recommendations"""
        if not self.redis_client:
            return None
        
        try:
            key = f"rec:{product_id}:{k}"
            cached = self.redis_client.get(key)
            
            if cached:
                logger.debug(f"Cache HIT: {product_id}")
                return json.loads(cached)
            
            return None
        except Exception as e:
            logger.error(f"Redis get error: {e}")
            return None
    
    def set(self, product_id: str, k: int, data: Dict):
        """Cache recommendations"""
        if not self.redis_client:
            return
        
        try:
            key = f"rec:{product_id}:{k}"
            self.redis_client.setex(
                key,
                self.config.REDIS_CACHE_TTL,
                json.dumps(data)
            )
            logger.debug(f"Cache SET: {product_id}")
        except Exception as e:
            logger.error(f"Redis set error: {e}")
    
    def is_connected(self) -> bool:
        """Check Redis connection"""
        if not self.redis_client:
            return False
        
        try:
            self.redis_client.ping()
            return True
        except:
            return False



# FASTAPI APPLICATION


# Global state
faiss_manager = None
cache_manager = None

@asynccontextmanager
async def lifespan(eshop: FastAPI):
    """Startup and shutdown events"""
    global faiss_manager, cache_manager
    
    # Startup
    logger.info(" Starting recommendation API...")
    
    config = Config()
    
    # Initialize FAISS
    faiss_manager = FAISSIndexManager(config)
    
    # Try to load existing index
    if Path(config.FAISS_INDEX_PATH).exists():
        logger.info("Loading existing FAISS index...")
        faiss_manager.load_index()
    else:
        logger.info("Building new FAISS index...")
        embeddings = np.load(config.EMBEDDINGS_PATH)
        variant_ids = np.load(config.VARIANT_IDS_PATH, allow_pickle=True)
        faiss_manager.build_index_from_embeddings(embeddings, variant_ids)
        faiss_manager.save_index()
    
    # Load product metadata
    faiss_manager.load_product_metadata()
    
    # Initialize Redis cache
    cache_manager = RedisCacheManager(config)
    
    logger.info(" API ready to serve requests")
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")

# Create FastAPI app
eshop = FastAPI(
    title="Hybrid Recommendation API",
    description="Fast product recommendations using FAISS and hybrid embeddings (α×CLIP + (1-α)×BERT)",
    version=Config.API_VERSION,
    lifespan=lifespan
)

# CORS middleware
eshop.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request timing middleware
@eshop.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    response.headers["X-Process-Time-Ms"] = str(round(process_time, 2))
    return response


# API ENDPOINTS
@eshop.get("/", response_model=Dict[str, str])
async def root():
    """Root endpoint"""
    return {
        "message": "Hybrid Recommendation API",
        "version": Config.API_VERSION,
        "docs": "/docs"
    }


@eshop.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow().isoformat(),
        faiss_index_size=faiss_manager.index.ntotal if faiss_manager else 0,
        redis_connected=cache_manager.is_connected() if cache_manager else False,
        version=Config.API_VERSION,
        embedding_dimension=Config.EMBEDDING_DIM
    )


@eshop.get("/recommend/{variant_id}", response_model=RecommendationResponse)
async def get_recommendations(
    variant_id: str,
    k: int = Query(default=Config.DEFAULT_K, ge=1, le=Config.MAX_K, description="Number of recommendations")
):
    """
    Get recommendations for a product variant.
    Args:
        variant_id: Variant ID of the clicked product
        k: Number of recommendations to return
    """
    start_time = time.time()

    # Check cache
    cached = cache_manager.get(variant_id, k)
    if cached:
        cached['response_time_ms'] = (time.time() - start_time) * 1000
        cached['from_cache'] = True
        return RecommendationResponse(**cached)

    # Get query product metadata
    query_meta = faiss_manager.product_metadata.get(variant_id, {})
    query_gender = query_meta.get("gender")
    query_product_id = query_meta.get("product_id")  # Parent product ID

    # Search FAISS - get more results to filter
    try:
        rec_ids, rec_scores = faiss_manager.search(variant_id, k * 5)  
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    # Group recommendations by parent product_id
    product_groups = {}  # {product_id: [(variant_id, score, metadata), ...]}
    
    for rec_variant_id, score in zip(rec_ids, rec_scores):
        metadata = faiss_manager.product_metadata.get(rec_variant_id, {})
        if not metadata:
            continue
        if rec_variant_id == variant_id:
            continue
    
        parent_id = metadata.get("product_id")
        if not parent_id:
            continue
        # Skip if same as query product (different color/size)
        if parent_id == query_product_id:
            continue
        
        if parent_id not in product_groups:
            product_groups[parent_id] = []
        
        product_groups[parent_id].append((rec_variant_id, score, metadata))
    
    # Select best variant from each product group
    # Criteria: highest popularity_score, or highest similarity if same popularity
    same_gender_recs = []
    diff_gender_recs = []
    
    for parent_id, variants in product_groups.items():
        # Sort by: 1) popularity_score_normalized (desc), 2) similarity score (desc)
        variants_sorted = sorted(
            variants, 
            key=lambda x: (
                x[2].get("popularity_score_normalized", 0),  # popularity first
                x[1]  # then similarity
            ),
            reverse=True
        )
        
        # Take best variant
        best_variant = variants_sorted[0]
        rec_variant_id, score, metadata = best_variant
        
        rec_item = RecommendationItem(
            variant_id=rec_variant_id,
            similarity_score=score,
            product_name=metadata.get("product_name"),
            category_name=metadata.get("category_name"),
            price=metadata.get("price"),
            image_path=metadata.get("image_path")
        )
        
        # Separate by gender
        if query_gender and metadata.get("gender") == query_gender:
            same_gender_recs.append(rec_item)
        else:
            diff_gender_recs.append(rec_item)
    
    # Gender balancing: prioritize same gender
    recommendations = same_gender_recs[:k]
    if len(recommendations) < k:
        recommendations.extend(diff_gender_recs[:(k - len(recommendations))])
    
    # Limit to k
    recommendations = recommendations[:k]

    # Make response
    response_time = (time.time() - start_time) * 1000
    response_data = {
        "query_variant_id": variant_id,
        "recommendations": [r.dict() for r in recommendations],
        "response_time_ms": response_time,
        "from_cache": False,
        "total_results": len(recommendations)
    }

    # Cache result
    cache_manager.set(variant_id, k, response_data)

    return RecommendationResponse(**response_data)



@eshop.post("/recommend/batch", response_model=Dict[str, Any])
async def get_batch_recommendations(request: BatchRecommendationRequest):
    """
    Get recommendations for multiple products in batch
    
    Args:
        request: BatchRecommendationRequest with product_ids and k
    
    Returns:
        Dict mapping product_id -> recommendations
    """
    start_time = time.time()
    
    # Batch search
    results = faiss_manager.batch_search(request.product_ids, request.k)
    
    # Format responses
    formatted_results = {}
    
    for product_id, (rec_ids, rec_scores) in results.items():
        recommendations = []
        
        for rec_variant_id, score in zip(rec_ids, rec_scores):  
            metadata = faiss_manager.product_metadata.get(rec_variant_id, {})
            
            recommendations.append({
                'variant_id': rec_variant_id,  
                'similarity_score': score,
                'product_name': metadata.get('product_name'),
                'category_name': metadata.get('category_name'),
                'price': metadata.get('price'),
                'image_path': metadata.get('image_path') 
            })
        
        formatted_results[product_id] = {
            'recommendations': recommendations,
            'total_results': len(recommendations)
        }
    
    response_time = (time.time() - start_time) * 1000
    
    return {
        'results': formatted_results,
        'response_time_ms': response_time,
        'total_queries': len(request.product_ids)
    }


@eshop.get("/stats", response_model=Dict[str, Any])
async def get_stats():
    """Get system statistics"""
    return {
        "total_products": faiss_manager.index.ntotal if faiss_manager else 0,
        "index_type": Config.FAISS_INDEX_TYPE,
        "embedding_dimension": Config.EMBEDDING_DIM,
        "redis_enabled": Config.USE_REDIS,
        "cache_ttl_seconds": Config.REDIS_CACHE_TTL,
        "max_k": Config.MAX_K
    }


# 
# CLI for building index

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "build-index":
        # Build FAISS index
        logger.info("Building FAISS index...")
        
        config = Config()
        manager = FAISSIndexManager(config)
        
        embeddings = np.load(config.EMBEDDINGS_PATH)
        variant_ids = np.load(config.VARIANT_IDS_PATH, allow_pickle=True)
        
        logger.info(f"Loaded embeddings: {embeddings.shape}")
        logger.info(f"Loaded variant IDs: {len(variant_ids)}")
        
        manager.build_index_from_embeddings(embeddings, variant_ids)
        manager.save_index()
        
        logger.info("FAISS index built and saved")
    
    else:
        # Run FastAPI server
        import uvicorn
        
        uvicorn.run(
            "faiss_api:eshop",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info"
        )