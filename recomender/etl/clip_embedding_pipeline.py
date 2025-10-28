import torch
import clip
from PIL import Image
import requests
from io import BytesIO
import pandas as pd
import numpy as np
import pickle
import os
from typing import List, Dict, Optional, Tuple
import logging
from tqdm import tqdm
import psycopg2
from psycopg2.extras import execute_values

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class CLIPEmbedder:
    """ CLIP model wrapper for encoding image and text """
    
    def __init__(self, model_name: str = "ViT-B/32  ", device: Optional[str] = None):
        """
        Initialize CLIP model
        
        Args:
            model_name: CLIP model variant (default "ViT-B/32")
            device: RTX 4050 (default None, will auto-detect)
        """
        if device is None:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device
            
        logger.info(f"Loading CLIP model {model_name} on {self.device}")
        try:
            self.model, self.preprocess = clip.load(model_name, device=self.device)
            self.model.eval()
            logger.info("CLIP model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading CLIP model: {e}")
            raise

    def encode_text(self, text: str) -> Optional[np.ndarray]:
        """ Encode text to CLIP embedding
        
        Args:
            text: Input text string
        Returns:
            np.ndarray: 512-dim embedding for ViT-B/32
        """
        try:
            text_tokens = clip.tokenize([text], truncate=True).to(self.device)
            with torch.no_grad():
                text_feature = self.model.encode_text(text_tokens)
                # Normalize to unit vector
                text_feature /= text_feature.norm(dim=-1, keepdim=True)
            return text_feature.cpu().numpy()[0]
        except Exception as e:
            logger.error(f"Error encoding text: {e}")
            return None

    def encode_image_from_url(self, image_url: str, timeout: int = 10) -> Optional[np.ndarray]:
        """Download image from URL and encode to CLIP embedding
        
        Args:
            image_url: URL of the image
            timeout: Request timeout in seconds (default 10)
        Returns:
            np.ndarray: 512-dim embedding or None if error
        """
        try:
            # Download image
            response = requests.get(image_url, timeout=timeout)
            response.raise_for_status()
            
            # Open and preprocess image
            image = Image.open(BytesIO(response.content)).convert("RGB")
            image_tensor = self.preprocess(image).unsqueeze(0).to(self.device)
            
            # Encode image
            with torch.no_grad():
                image_feature = self.model.encode_image(image_tensor)
                # Normalize to unit vector
                image_feature /= image_feature.norm(dim=-1, keepdim=True)
            return image_feature.cpu().numpy()[0]
        except Exception as e:
            logger.error(f"Error encoding image from URL {image_url}: {e}")
            return None

    def encode_images_from_path(self, image_path: str) -> Optional[np.ndarray]:
        """ Encode image from local file path to CLIP embedding
        
        Args:
            image_path: Local file path of the image
        Returns:
            np.ndarray: 512-dim embedding or None if error
        """
        try:
            # Check if file exists
            if not os.path.exists(image_path):
                logger.warning(f"Image file not found: {image_path}")
                return None
            
            # Open and preprocess image
            image = Image.open(image_path).convert("RGB")
            image_tensor = self.preprocess(image).unsqueeze(0).to(self.device)
            
            # Encode image
            with torch.no_grad():
                image_feature = self.model.encode_image(image_tensor)
                # Normalize to unit vector
                image_feature /= image_feature.norm(dim=-1, keepdim=True)
            return image_feature.cpu().numpy()[0]
        except Exception as e:
            logger.error(f"Error encoding image from path {image_path}: {e}")
            return None

    def encode_product(self,
                      product_name: str,
                      product_description: str,
                      image_path: Optional[str] = None,
                      text_weight: float = 0.5) -> Optional[np.ndarray]:
        """ Encode product using name, description and optional local image path
        
        Args:
            product_name: Name of the product
            product_description: Description of the product
            image_path: Local file path to product image (default None)
            text_weight: Weight for text embedding (default 0.5)
        Returns:
            Combined embedding vector or None if error
        """
        # Create text description
        text = f"{product_name}. {product_description}"
        text_emb = self.encode_text(text)
        
        if text_emb is None:
            return None
        
        # If no image path, return text embedding only
        if not image_path or pd.isna(image_path):
            return text_emb
        
        # Try to encode image from local path
        image_emb = self.encode_images_from_path(image_path)
        
        if image_emb is not None:
            # Weight combination
            combined_emb = (text_weight * text_emb) + ((1 - text_weight) * image_emb)
            # Re-normalize
            combined_emb = combined_emb / np.linalg.norm(combined_emb)
            return combined_emb
        else:
            # Fallback to text only
            logger.warning(f"Failed to encode image from path {image_path}, falling back to text.")
            return text_emb


class ClipEmbeddingPipeline:
    """ Pipeline to embed all products """
    
    def __init__(self,
                 db_config: Dict,
                 model_name: str = "ViT-B/32",
                 device: Optional[str] = None,
                 batch_size: int = 32,
                 text_weight: float = 0.5):
        """
        Initialize pipeline
        
        Args:
            db_config: Database connection config
            model_name: CLIP model variant (default "ViT-B/32")
            device: RTX 4050 (default None, will auto-detect)
            batch_size: Batch size for processing (default 32)
            text_weight: Weight for text embedding (default 0.5)
        """
        self.db_config = db_config
        self.embedder = CLIPEmbedder(model_name=model_name, device=device)
        self.batch_size = batch_size
        self.text_weight = text_weight
        self.conn = None

    def _connect_db(self):
        """ Connect to PostgreSQL database """
        try:
            self.conn = psycopg2.connect(**self.db_config)
            logger.info("Database connection established")
        except Exception as e:
            logger.error(f"Error connecting to database: {e}")
            raise

    def close_db(self):
        """ Close database connection """
        if self.conn:
            self.conn.close()
            logger.info("Database connection closed")

    def load_items_features(self) -> pd.DataFrame:
        """ Load product features from CSV file """
        csv_path = './data/processed/item_features.csv'
        
        logger.info(f"Loading item features from CSV: {csv_path}")
        
        if not os.path.exists(csv_path):
            logger.error(f"CSV file not found at: {csv_path}")
            raise FileNotFoundError(f"CSV file not found: {csv_path}")
        
        try:
            df = pd.read_csv(csv_path)
            
            # Check required columns
            required_cols = ['variant_id', 'product_name', 'product_description', 'image_path']
            missing_cols = [col for col in required_cols if col not in df.columns]
            if missing_cols:
                logger.error(f"CSV file missing columns: {missing_cols}")
                raise ValueError(f"CSV file missing required columns: {missing_cols}")
            
            # Convert variant_id to string
            df['variant_id'] = df['variant_id'].astype(str)
            
            logger.info(f"Loaded {len(df)} product variants from {csv_path}")
            return df
        except Exception as e:
            logger.error(f"Error loading product features from CSV: {e}")
            raise

    def generate_embedding(self, item_features_df: pd.DataFrame) -> List[Dict]:
        """ Generate CLIP embeddings for all items """
        embeddings_list = []
        failed_items = []
        
        logger.info(f"Starting embedding generation for {len(item_features_df)} items...")
        
        # Process with progress bar
        for idx, row in tqdm(item_features_df.iterrows(),
                            total=len(item_features_df),
                            desc="Generating embeddings"):
            variant_id = row['variant_id']
            
            # Generate embedding
            embedding_vector = self.embedder.encode_product(
                product_name=str(row.get('product_name', '')),
                product_description=str(row.get('product_description', '')),
                image_path=row.get('image_path'),
                text_weight=self.text_weight
            )
            
            if embedding_vector is not None:
                embeddings_list.append({
                    'variant_id': variant_id,
                    'embedding': embedding_vector
                })
            else:
                failed_items.append(variant_id)
                logger.warning(f"Failed to generate embedding for variant_id: {variant_id}")
        
        logger.info(f"Generated {len(embeddings_list)} embeddings")
        if failed_items:
            logger.warning(f"Failed items: {len(failed_items)}")
        
        return embeddings_list

    def save_to_database(self, embeddings: List[Dict]):
        """
        Save embeddings to PostgreSQL with pgvector
        
        Args:
            embeddings: List of dicts with 'variant_id' and 'embedding'
        """
        logger.info("Saving embeddings to database...")
        cursor = self.conn.cursor()
        
        try:
            # Create table if not exists
            cursor.execute("""
                CREATE EXTENSION IF NOT EXISTS vector;
                
                CREATE TABLE IF NOT EXISTS image_embeddings (
                    variant_id TEXT PRIMARY KEY,
                    embedding vector(512),
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
                
                CREATE INDEX IF NOT EXISTS image_embeddings_embedding_idx 
                ON image_embeddings USING ivfflat (embedding vector_cosine_ops)
                WITH (lists = 100);
            """)
            
            # Prepare data for bulk insert
            values = [
                (item['variant_id'], item['embedding'].tolist()) 
                for item in embeddings
            ]
            
            # Bulk upsert
            execute_values(
                cursor,
                """
                INSERT INTO image_embeddings (variant_id, embedding, created_at)
                VALUES %s
                ON CONFLICT (variant_id) 
                DO UPDATE SET 
                    embedding = EXCLUDED.embedding,
                    updated_at = NOW()
                """,
                values,
                template="(%s, %s::vector, NOW())"
            )
            
            self.conn.commit()
            logger.info(f"Saved {len(embeddings)} embeddings to database")
            
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Error saving embeddings to database: {e}")
            raise
        finally:
            cursor.close()

    def save_to_numpy(self, embeddings: List[Dict], output_dir: str = 'data/processed'):
        """Save embeddings to numpy file for LightFM"""
        logger.info("Saving embeddings to numpy files...")
        os.makedirs(output_dir, exist_ok=True)
        
        # Extract variant_ids and embeddings
        variant_ids = [item['variant_id'] for item in embeddings]
        embedding_matrix = np.array([item['embedding'] for item in embeddings])
        
        # Save files
        np.save(f"{output_dir}/variant_ids.npy", variant_ids)
        np.save(f"{output_dir}/clip_item_embeddings.npy", embedding_matrix)
        
        # Save mapping dict
        id_to_idx = {vid: idx for idx, vid in enumerate(variant_ids)}
        with open(f"{output_dir}/variant_id_mapping.pkl", "wb") as f:
            pickle.dump(id_to_idx, f)
        
        logger.info(f"Embeddings saved to {output_dir}")
        logger.info(f"  - variant_ids.npy: {len(variant_ids)} ids")
        logger.info(f"  - clip_item_embeddings.npy: {embedding_matrix.shape}")
        logger.info(f"  - variant_id_mapping.pkl: {len(id_to_idx)} mappings")

    def run(self, save_to_db: bool = True, save_to_numpy: bool = True):
        """ Run the full embedding pipeline
        
        Args:
            save_to_db: Whether to save to PostgreSQL
            save_to_numpy: Whether to save to numpy files
        """
        try:
            logger.info("=" * 60)
            logger.info("Starting CLIP Embedding Pipeline...")
            logger.info("=" * 60)
            
            # Connect to database
            self._connect_db()
            
            # Step 1: Load item features from CSV
            logger.info("\n[Step 1/4] Loading item features from CSV...")
            item_features_df = self.load_items_features()
            
            # Step 2: Generate embeddings
            logger.info("\n[Step 2/4] Generating CLIP embeddings...")
            embeddings = self.generate_embedding(item_features_df)
            
            # Step 3: Save to database
            if save_to_db:
                logger.info("\n[Step 3/4] Saving embeddings to PostgreSQL...")
                self.save_to_database(embeddings)
            else:
                logger.info("\n[Step 3/4] Skipping database save")
            
            # Step 4: Save to numpy files
            if save_to_numpy:
                logger.info("\n[Step 4/4] Saving embeddings to numpy files...")
                self.save_to_numpy(embeddings)
            else:
                logger.info("\n[Step 4/4] Skipping numpy save")
            
            logger.info("\n" + "=" * 60)
            logger.info("✓ CLIP Embedding Pipeline completed successfully!")
            logger.info(f"  Total embeddings generated: {len(embeddings)}")
            logger.info(f"  Embedding dimension: 512")
            logger.info("=" * 60)
            
        except Exception as e:
            logger.error(f"\n✗ CLIP Embedding Pipeline failed: {e}")
            raise
        finally:
            self.close_db()


if __name__ == "__main__":
    from config import Config
    
    # Initialize pipeline
    pipeline = ClipEmbeddingPipeline(
        db_config=Config.DB_CONFIG,
        model_name="ViT-B/32",
        batch_size=32,
        text_weight=0.5
    )
    
    # Run pipeline - save to both database and numpy
    pipeline.run(save_to_db=True, save_to_numpy=True)