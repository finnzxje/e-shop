"""
BERT Metadata Embedder + Fusion with CLIP
==========================================
Embeds product metadata (category, color, price, etc.) using BERT
Then fuses with existing CLIP embeddings → Final 512D hybrid vector

Usage:
    1. Load existing CLIP embeddings (512D)
    2. Generate BERT metadata embeddings (512D)
    3. Fuse: α*CLIP + (1-α)*BERT → 512D
    4. Save to database + numpy files
"""

import torch
import torch.nn as nn
from transformers import AutoTokenizer, AutoModel
import pandas as pd
import numpy as np
import pickle
import os
from typing import Dict, List, Optional, Tuple
import logging
from tqdm import tqdm
from sklearn.preprocessing import StandardScaler, LabelEncoder
import psycopg2
from psycopg2.extras import execute_values

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ============================================================================
# 1. METADATA ENCODER WITH BERT
# ============================================================================

class MetadataEncoder(nn.Module):
    """
    Encode product metadata into 512D vector using BERT + MLP
    Handles: category, color, size, gender, price, rating, etc.
    """
    
    def __init__(self, 
                 bert_model_name: str = "bert-base-uncased",
                 categorical_dims: Dict[str, int] = None,
                 numerical_features: List[str] = None,
                 embedding_dim: int = 64,
                 output_dim: int = 512):
        """
        Args:
            bert_model_name: HuggingFace BERT model
            categorical_dims: {'category_id': 150, 'color_id': 50, ...}
            numerical_features: ['price', 'avg_rating', 'discount_percentage']
            embedding_dim: Size for categorical embeddings
            output_dim: Final output (512 to match CLIP)
        """
        super().__init__()
        
        self.categorical_dims = categorical_dims or {}
        self.numerical_features = numerical_features or []
        
        # BERT for text metadata (category_name, color_name, etc.)
        self.bert = AutoModel.from_pretrained(bert_model_name)
        self.bert_dim = self.bert.config.hidden_size  # 768 for BERT-base
        
        # Freeze BERT (optional - faster training)
        for param in self.bert.parameters():
            param.requires_grad = False
        
        # Categorical embeddings
        self.embeddings = nn.ModuleDict({
            name: nn.Embedding(num_classes + 1, embedding_dim, padding_idx=0)
            for name, num_classes in self.categorical_dims.items()
        })
        
        # Calculate total input dimension
        total_cat_dim = len(self.categorical_dims) * embedding_dim
        total_num_dim = len(self.numerical_features)
        total_dim = self.bert_dim + total_cat_dim + total_num_dim
        
        # MLP to project to output_dim
        self.mlp = nn.Sequential(
            nn.Linear(total_dim, 1024),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(1024, 512),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(512, output_dim),
            nn.LayerNorm(output_dim)
        )
    
    def forward(self, 
                text_inputs: Dict[str, torch.Tensor],
                categorical_inputs: Dict[str, torch.Tensor], 
                numerical_inputs: torch.Tensor) -> torch.Tensor:
        """
        Args:
            text_inputs: BERT inputs {'input_ids': ..., 'attention_mask': ...}
            categorical_inputs: {'category_id': tensor, 'color_id': tensor}
            numerical_inputs: tensor of shape (batch, num_features)
        
        Returns:
            embeddings: tensor of shape (batch, 512)
        """
        # 1. BERT encoding for text metadata
        bert_output = self.bert(**text_inputs)
        bert_features = bert_output.last_hidden_state[:, 0, :]  # [CLS] token
        
        # 2. Categorical embeddings
        cat_embeddings = []
        for name, emb_layer in self.embeddings.items():
            if name in categorical_inputs:
                cat_embeddings.append(emb_layer(categorical_inputs[name]))
        
        if cat_embeddings:
            cat_embeddings = torch.cat(cat_embeddings, dim=-1)
        else:
            cat_embeddings = torch.zeros(bert_features.size(0), 0).to(bert_features.device)
        
        # 3. Concatenate all features
        if numerical_inputs.size(1) > 0:
            combined = torch.cat([bert_features, cat_embeddings, numerical_inputs], dim=-1)
        else:
            combined = torch.cat([bert_features, cat_embeddings], dim=-1)
        
        # 4. Project to output dimension
        output = self.mlp(combined)
        
        # 5. L2 normalize (like CLIP)
        output = output / output.norm(dim=-1, keepdim=True)
        
        return output


# ============================================================================
# 2. BERT METADATA EMBEDDER
# ============================================================================

class BERTMetadataEmbedder:
    """
    Generate metadata embeddings using BERT + categorical/numerical features
    """
    
    def __init__(self,
                 bert_model_name: str = "bert-base-uncased",
                 device: str = None):
        """
        Args:
            bert_model_name: HuggingFace BERT model
            device: cuda or cpu
        """
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.bert_model_name = bert_model_name
        
        logger.info(f"Loading BERT tokenizer: {bert_model_name}")
        self.tokenizer = AutoTokenizer.from_pretrained(bert_model_name)
        
        # Will be initialized after analyzing data
        self.encoder = None
        self.categorical_encoders = {}
        self.numerical_scaler = None
        self.schema = None
        
        logger.info(f"✓ BERT tokenizer loaded on {self.device}")
    
    def analyze_metadata_schema(self, df: pd.DataFrame) -> Dict:
        """
        Analyze dataframe to determine features
        
        Returns:
            schema: {'categorical': {...}, 'numerical': [...], 'text': [...]}
        """
        logger.info("Analyzing metadata schema...")
        
        categorical_features = {}
        numerical_features = []
        text_features = []
        
        # Define feature types
        categorical_cols = ['category_id', 'color_id', 'size', 'gender']
        numerical_cols = ['price', 'avg_rating', 'num_reviews', 'discount_percentage']
        text_cols = ['category_name', 'color_name', 'size', 'gender']
        
        for col in categorical_cols:
            if col in df.columns:
                unique_vals = df[col].nunique()
                categorical_features[col] = unique_vals
                logger.info(f"  Categorical: {col} → {unique_vals} unique values")
        
        for col in numerical_cols:
            if col in df.columns:
                numerical_features.append(col)
                logger.info(f"  Numerical: {col}")
        
        for col in text_cols:
            if col in df.columns:
                text_features.append(col)
                logger.info(f"  Text: {col}")
        
        return {
            'categorical': categorical_features,
            'numerical': numerical_features,
            'text': text_features
        }
    
    def fit(self, df: pd.DataFrame):
        """
        Fit encoders and initialize model
        
        Args:
            df: DataFrame with metadata columns
        """
        logger.info("Fitting metadata encoder...")
        
        # Analyze schema
        self.schema = self.analyze_metadata_schema(df)
        
        # Fit label encoders for categorical features
        for col in self.schema['categorical'].keys():
            le = LabelEncoder()
            df[f'{col}_encoded'] = le.fit_transform(df[col].astype(str).fillna('unknown'))
            self.categorical_encoders[col] = le
            logger.info(f"  Encoded {col}: {len(le.classes_)} classes")
        
        # Fit scaler for numerical features
        if self.schema['numerical']:
            numerical_data = df[self.schema['numerical']].fillna(0).values
            self.numerical_scaler = StandardScaler()
            self.numerical_scaler.fit(numerical_data)
            logger.info(f"  Scaled {len(self.schema['numerical'])} numerical features")
        
        # Initialize encoder model
        self.encoder = MetadataEncoder(
            bert_model_name=self.bert_model_name,
            categorical_dims=self.schema['categorical'],
            numerical_features=self.schema['numerical'],
            output_dim=512
        ).to(self.device)
        
        logger.info("✓ Metadata encoder initialized")
    
    def encode_batch(self, df_batch: pd.DataFrame) -> np.ndarray:
        """
        Encode a batch of products
        
        Args:
            df_batch: Batch of products
        
        Returns:
            embeddings: (batch_size, 512) numpy array
        """
        # 1. Prepare text input (combine text metadata)
        text_list = []
        for _, row in df_batch.iterrows():
            text_parts = []
            for col in self.schema['text']:
                if col in row and pd.notna(row[col]):
                    text_parts.append(str(row[col]))
            text = " ".join(text_parts) if text_parts else "unknown"
            text_list.append(text)
        
        # Tokenize
        text_inputs = self.tokenizer(
            text_list,
            padding=True,
            truncation=True,
            max_length=128,
            return_tensors="pt"
        ).to(self.device)
        
        # 2. Prepare categorical inputs
        categorical_inputs = {}
        for col in self.schema['categorical'].keys():
            encoded_col = f'{col}_encoded'
            if encoded_col in df_batch.columns:
                categorical_inputs[col] = torch.LongTensor(df_batch[encoded_col].values).to(self.device)
            else:
                # Transform new data
                encoded = self.categorical_encoders[col].transform(
                    df_batch[col].astype(str).fillna('unknown')
                )
                categorical_inputs[col] = torch.LongTensor(encoded).to(self.device)
        
        # 3. Prepare numerical inputs
        if self.schema['numerical']:
            numerical_data = df_batch[self.schema['numerical']].fillna(0).values
            numerical_data = self.numerical_scaler.transform(numerical_data)
            numerical_inputs = torch.FloatTensor(numerical_data).to(self.device)
        else:
            numerical_inputs = torch.zeros(len(df_batch), 0).to(self.device)
        
        # 4. Encode
        self.encoder.eval()
        with torch.no_grad():
            embeddings = self.encoder(text_inputs, categorical_inputs, numerical_inputs)
        
        return embeddings.cpu().numpy()
    
    def encode_all(self, df: pd.DataFrame, batch_size: int = 32) -> np.ndarray:
        """
        Encode all products
        
        Args:
            df: DataFrame with all products
            batch_size: Batch size for processing
        
        Returns:
            embeddings: (N, 512) numpy array
        """
        if self.encoder is None:
            raise ValueError("Encoder not fitted. Call fit() first.")
        
        logger.info(f"Encoding {len(df)} products with BERT metadata encoder...")
        
        embeddings = []
        
        for i in tqdm(range(0, len(df), batch_size), desc="BERT encoding"):
            batch = df.iloc[i:i+batch_size]
            batch_emb = self.encode_batch(batch)
            embeddings.append(batch_emb)
        
        embeddings = np.vstack(embeddings)
        logger.info(f"✓ Encoded {len(embeddings)} products → {embeddings.shape}")
        
        return embeddings
    
    def save_artifacts(self, output_dir: str = "../data/processed"):
        """Save encoder and preprocessors"""
        os.makedirs(output_dir, exist_ok=True)
        
        # Save model state
        torch.save(self.encoder.state_dict(), f"{output_dir}/bert_metadata_encoder.pt")
        
        # Save encoders and scaler
        with open(f"{output_dir}/metadata_label_encoders.pkl", "wb") as f:
            pickle.dump(self.categorical_encoders, f)
        
        with open(f"{output_dir}/metadata_scaler.pkl", "wb") as f:
            pickle.dump(self.numerical_scaler, f)
        
        with open(f"{output_dir}/metadata_schema.pkl", "wb") as f:
            pickle.dump(self.schema, f)
        
        logger.info(f"✓ BERT encoder artifacts saved to {output_dir}/")


# ============================================================================
# 3. HYBRID EMBEDDING FUSION
# ============================================================================

class HybridEmbeddingFusion:
    """
    Fuse CLIP and BERT embeddings into final hybrid vector
    """
    
    def __init__(self, alpha: float = 0.7):
        """
        Args:
            alpha: Weight for CLIP (0-1). BERT weight = 1 - alpha
                  Default 0.7 means 70% CLIP, 30% metadata
        """
        self.alpha = alpha
        logger.info(f"Fusion weights: {alpha:.2f} CLIP + {1-alpha:.2f} Metadata")
    
    def fuse(self, 
             clip_embeddings: np.ndarray,
             bert_embeddings: np.ndarray) -> np.ndarray:
        """
        Fuse embeddings with weighted average
        
        Args:
            clip_embeddings: (N, 512) from CLIP
            bert_embeddings: (N, 512) from BERT metadata
        
        Returns:
            hybrid_embeddings: (N, 512) L2-normalized
        """
        assert clip_embeddings.shape == bert_embeddings.shape, \
            f"Shape mismatch: CLIP {clip_embeddings.shape} vs BERT {bert_embeddings.shape}"
        
        logger.info("Fusing CLIP and BERT embeddings...")
        
        # Weighted average
        hybrid = self.alpha * clip_embeddings + (1 - self.alpha) * bert_embeddings
        
        # L2 normalize
        hybrid = hybrid / np.linalg.norm(hybrid, axis=1, keepdims=True)
        
        logger.info(f"✓ Fused {len(hybrid)} embeddings with α={self.alpha:.2f}")
        return hybrid


# ============================================================================
# 4. COMPLETE PIPELINE
# ============================================================================

class HybridEmbeddingPipeline:
    """
    Complete pipeline: Load CLIP → Generate BERT → Fuse → Save
    """
    
    def __init__(self,
                 db_config: Dict,
                 bert_model: str = "bert-base-uncased",
                 fusion_alpha: float = 0.7,
                 device: str = None):
        """
        Args:
            db_config: Database connection config
            bert_model: HuggingFace BERT model name
            fusion_alpha: Fusion weight (0-1)
            device: cuda or cpu
        """
        self.db_config = db_config
        self.fusion_alpha = fusion_alpha
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        
        # Initialize components
        self.bert_embedder = BERTMetadataEmbedder(bert_model, device=self.device)
        self.fusion = HybridEmbeddingFusion(alpha=fusion_alpha)
        
        self.conn = None
    
    def _connect_db(self):
        """Connect to PostgreSQL"""
        try:
            self.conn = psycopg2.connect(**self.db_config)
            logger.info("Database connection established")
        except Exception as e:
            logger.error(f"Error connecting to database: {e}")
            raise
    
    def close_db(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
            logger.info("Database connection closed")
    
    def load_clip_embeddings(self, input_dir: str = "../data/processed") -> Tuple[np.ndarray, np.ndarray]:
        """
        Load existing CLIP embeddings
        
        Returns:
            (variant_ids, clip_embeddings)
        """
        logger.info(f"Loading CLIP embeddings from {input_dir}/...")
        
        variant_ids = np.load(f"{input_dir}/variant_ids.npy", allow_pickle=True)
        clip_embeddings = np.load(f"{input_dir}/clip_item_embeddings.npy")
        
        logger.info(f"✓ Loaded CLIP embeddings: {clip_embeddings.shape}")
        logger.info(f"✓ Variant IDs: {len(variant_ids)}")
        
        return variant_ids, clip_embeddings
    
    def load_metadata(self, csv_path: str = "../data/processed/item_features.csv") -> pd.DataFrame:
        """
        Load product metadata from CSV
        """
        logger.info(f"Loading metadata from {csv_path}...")
        
        if not os.path.exists(csv_path):
            raise FileNotFoundError(f"CSV not found: {csv_path}")
        
        df = pd.read_csv(csv_path)
        df['variant_id'] = df['variant_id'].astype(str)
        
        logger.info(f"✓ Loaded metadata for {len(df)} products")
        return df
    
    def save_to_database(self, variant_ids: np.ndarray, embeddings: np.ndarray):
        """
        Save hybrid embeddings to PostgreSQL with pgvector
        """
        logger.info("Saving hybrid embeddings to database...")
        cursor = self.conn.cursor()
        
        try:
            # Create table
            cursor.execute("""
                CREATE EXTENSION IF NOT EXISTS vector;
                
                DROP TABLE IF EXISTS hybrid_embeddings;
                CREATE TABLE hybrid_embeddings (
                    variant_id TEXT PRIMARY KEY,
                    embedding vector(512),
                    embedding_type TEXT DEFAULT 'hybrid_clip_bert',
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
                
                CREATE INDEX hybrid_embeddings_embedding_idx 
                ON hybrid_embeddings USING ivfflat (embedding vector_cosine_ops)
                WITH (lists = 100);
            """)
            
            # Prepare data
            values = [(vid, emb.tolist()) for vid, emb in zip(variant_ids, embeddings)]
            
            # Bulk insert
            execute_values(
                cursor,
                """
                INSERT INTO hybrid_embeddings (variant_id, embedding, created_at)
                VALUES %s
                """,
                values,
                template="(%s, %s::vector, NOW())"
            )
            
            self.conn.commit()
            logger.info(f"✓ Saved {len(embeddings)} hybrid embeddings to database")
            
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Error saving to database: {e}")
            raise
        finally:
            cursor.close()
    
    def save_to_numpy(self, 
                     variant_ids: np.ndarray,
                     embeddings: np.ndarray,
                     output_dir: str = "../data/processed"):
        """
        Save hybrid embeddings to numpy files (compatible with LightFM)
        """
        logger.info(f"Saving hybrid embeddings to {output_dir}/...")
        os.makedirs(output_dir, exist_ok=True)
        
        # Save embeddings
        np.save(f"{output_dir}/hybrid_embeddings.npy", embeddings)
        np.save(f"{output_dir}/hybrid_variant_ids.npy", variant_ids)
        
        # Save mapping
        id_to_idx = {vid: idx for idx, vid in enumerate(variant_ids)}
        with open(f"{output_dir}/hybrid_variant_id_mapping.pkl", "wb") as f:
            pickle.dump(id_to_idx, f)
        
        logger.info(f"✓ Saved to {output_dir}/")
        logger.info(f"  - hybrid_embeddings.npy: {embeddings.shape}")
        logger.info(f"  - hybrid_variant_ids.npy: {len(variant_ids)}")
    
    def run(self, 
            save_to_db: bool = True,
            save_to_numpy: bool = True,
            input_dir: str = "../data/processed",
            output_dir: str = "../data/processed"):
        """
        Run complete hybrid embedding pipeline
        """
        try:
            logger.info("\n" + "="*70)
            logger.info("STARTING HYBRID EMBEDDING PIPELINE (CLIP + BERT)")
            logger.info("="*70)
            
            # Connect to database
            self._connect_db()
            
            # Step 1: Load CLIP embeddings
            logger.info("\n[Step 1/6] Loading existing CLIP embeddings...")
            variant_ids, clip_embeddings = self.load_clip_embeddings(input_dir)
            
            # Step 2: Load metadata
            logger.info("\n[Step 2/6] Loading product metadata...")
            metadata_df = self.load_metadata()
            
            # Align metadata with variant_ids
            metadata_df = metadata_df[metadata_df['variant_id'].isin(variant_ids)]
            metadata_df = metadata_df.set_index('variant_id').loc[variant_ids].reset_index()
            logger.info(f"  Aligned {len(metadata_df)} products")
            
            # Step 3: Fit BERT encoder
            logger.info("\n[Step 3/6] Fitting BERT metadata encoder...")
            self.bert_embedder.fit(metadata_df)
            
            # Step 4: Generate BERT embeddings
            logger.info("\n[Step 4/6] Generating BERT metadata embeddings...")
            bert_embeddings = self.bert_embedder.encode_all(metadata_df, batch_size=32)
            
            # Step 5: Fuse embeddings
            logger.info("\n[Step 5/6] Fusing CLIP and BERT embeddings...")
            hybrid_embeddings = self.fusion.fuse(clip_embeddings, bert_embeddings)
            
            # Step 6: Save results
            logger.info("\n[Step 6/6] Saving hybrid embeddings...")
            
            if save_to_db:
                self.save_to_database(variant_ids, hybrid_embeddings)
            
            if save_to_numpy:
                self.save_to_numpy(variant_ids, hybrid_embeddings, output_dir)
            
            # Save BERT artifacts
            self.bert_embedder.save_artifacts(output_dir)
            
            logger.info("\n" + "="*70)
            logger.info(" HYBRID EMBEDDING PIPELINE COMPLETED!")
            logger.info("="*70)
            logger.info(f"  Total embeddings: {len(hybrid_embeddings)}")
            logger.info(f"  Embedding dimension: {hybrid_embeddings.shape[1]}")
            logger.info(f"  Fusion: {self.fusion_alpha:.1%} CLIP + {1-self.fusion_alpha:.1%} Metadata")
            logger.info(f"  Output: {output_dir}/")
            logger.info("="*70)
            
            return {
                'variant_ids': variant_ids,
                'clip_embeddings': clip_embeddings,
                'bert_embeddings': bert_embeddings,
                'hybrid_embeddings': hybrid_embeddings
            }
            
        except Exception as e:
            logger.error(f"\n❌ Pipeline failed: {e}", exc_info=True)
            raise
        finally:
            self.close_db()


# ============================================================================
# MAIN EXECUTION
# ============================================================================

if __name__ == "__main__":
    from config import Config
    
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
    
    print("\n Hybrid embeddings ready!")
    print(f"  Use 'hybrid_embeddings.npy' for LightFM training")
    print(f"  Query from 'hybrid_embeddings' table in PostgreSQL")