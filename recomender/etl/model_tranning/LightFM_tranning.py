"""
LightFM Training Pipeline 
Improvements:
- Early stopping based on validation set
- Proper regularization
- Feature dimension reduction
- CLIP embeddings binned into quartiles (compatible with LightFM)
- Better hyperparameters
"""

import numpy as np
import pandas as pd
import pickle
import os
from typing import Dict, Tuple, List
import logging
from scipy.sparse import csr_matrix, hstack, vstack, lil_matrix
from lightfm import LightFM
from lightfm.evaluation import precision_at_k, recall_at_k, auc_score
from lightfm.data import Dataset
import json
from datetime import datetime
from sklearn.decomposition import TruncatedSVD

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def filter_by_interaction_count(interactions_df, min_user_interactions=2, min_item_interactions=2):
        """Lọc người dùng và item có ít tương tác - GIẢM threshold xuống 2"""
        user_counts = interactions_df.groupby('user_id').size()
        valid_users = user_counts[user_counts >= min_user_interactions].index

        item_counts = interactions_df.groupby('variant_id').size()
        valid_items = item_counts[item_counts >= min_item_interactions].index

        filtered = interactions_df[
            interactions_df['user_id'].isin(valid_users) &
            interactions_df['variant_id'].isin(valid_items)
        ].copy()

        logger.info(
            f"Filtered interactions: {len(filtered)} (from {len(interactions_df)}). "
            f"Users kept: {len(valid_users)}, Items kept: {len(valid_items)}"
        )

        return filtered

class LightFMTrainer:
    """Train LightFM recommendation model with proper validation"""
    
    def __init__(self, data_dir: str = "data/processed"):
        """
        Initialize trainer
        
        Args:
            data_dir: Directory containing processed data from ETL
        """
        self.data_dir = data_dir
        self.dataset = None
        self.model = None
        self.best_model = None
        self.user_id_map = {}
        self.item_id_map = {}
        self.user_features_map = {}
        self.item_features_map = {}
        self.training_history = []
        
        self.config = {
            'no_components': 128,
            'learning_rate': 0.05,
            'loss': 'bpr',
            'max_sampled': 30,
            'item_alpha': 1e-8,
            'user_alpha': 1e-8,
            'epochs': 50,
            'patience': 15,
            'reduce_clip_dims': True,
            'clip_target_dims': 128,
            'test_percentage': 0.1,
            'val_percentage': 0.1,
        }

    def load_data(self) -> dict:
        """Load processed data từ ETL pipeline và lọc tương tác hợp lệ"""
        logger.info("Loading data from ETL output...")

        try:
            # ===== Load dữ liệu chính =====
            interactions_df = pd.read_pickle(f"{self.data_dir}/interactions.pkl")
            user_features_df = pd.read_pickle(f"{self.data_dir}/user_features.pkl")
            item_features_df = pd.read_pickle(f"{self.data_dir}/item_features.pkl")

            embeddings_matrix = np.load(f"{self.data_dir}/clip_item_embeddings.npy")
            variant_ids = np.load(f"{self.data_dir}/variant_ids.npy")

            with open(f"{self.data_dir}/variant_id_mapping.pkl", "rb") as f:
                variant_id_mapping = pickle.load(f)

            # ===== Kiểm tra null =====
            assert interactions_df["user_id"].notnull().all(), "Null user_id found"
            assert interactions_df["variant_id"].notnull().all(), "Null variant_id found"

            # ===== Lọc tương tác ít =====
            interactions_df = filter_by_interaction_count(interactions_df, 2, 2)

            # ===== Căn chỉnh user/item features sau khi lọc =====
            valid_users = interactions_df["user_id"].unique()
            valid_items = interactions_df["variant_id"].unique()

            user_features_df = user_features_df[user_features_df["user_id"].isin(valid_users)].copy()
            item_features_df = item_features_df[item_features_df["variant_id"].isin(valid_items)].copy()

            # ===== Kiểm tra đồng bộ với embeddings CLIP =====
            mask = np.isin(variant_ids, valid_items)
            embeddings_matrix = embeddings_matrix[mask]
            variant_ids = variant_ids[mask]

            # ===== REBUILD mapping sau khi lọc =====
            variant_id_mapping_filtered = {
                vid: idx for idx, vid in enumerate(variant_ids)
            }

            logger.info("✓ Loaded and filtered data successfully:")
            logger.info(f"   - Interactions: {len(interactions_df)} records")
            logger.info(f"   - Users: {len(user_features_df)} valid users")
            logger.info(f"   - Items: {len(item_features_df)} valid items")
            logger.info(f"   - CLIP embeddings shape: {embeddings_matrix.shape}")
            logger.info(f"   - Variant IDs aligned: {len(variant_ids)}")
            logger.info(f"   - Mapping rebuilt: {len(variant_id_mapping_filtered)} items")

            return {
                "interactions": interactions_df,
                "user_features": user_features_df,
                "item_features": item_features_df,
                "embeddings_matrix": embeddings_matrix,
                "variant_ids": variant_ids,
                "variant_id_mapping": variant_id_mapping_filtered,
            }

        except Exception as e:
            logger.error(f" Failed to load or filter data: {e}", exc_info=True)
            raise

    def reduce_clip_dimensions(self, embeddings_matrix: np.ndarray) -> np.ndarray:
        """
        Reduce CLIP embedding dimensions using TruncatedSVD
        512 -> 128 dimensions to reduce overfitting
        """
        if not self.config['reduce_clip_dims']:
            return embeddings_matrix
        
        target_dims = self.config['clip_target_dims']
        original_dims = embeddings_matrix.shape[1]
        
        if original_dims <= target_dims:
            logger.info(f"CLIP dims {original_dims} <= target {target_dims}, skipping reduction")
            return embeddings_matrix
        
        logger.info(f"Reducing CLIP dimensions: {original_dims} -> {target_dims}")
        
        svd = TruncatedSVD(n_components=target_dims, random_state=42)
        reduced_embeddings = svd.fit_transform(embeddings_matrix)
        
        variance_explained = svd.explained_variance_ratio_.sum()
        logger.info(f"✓ Variance explained: {variance_explained:.2%}")
        
        return reduced_embeddings
    
    def prepare_lightfm_dataset(self, data: Dict) -> Tuple:
        """
        Prepare data for LightFM format
        
        Returns:
            Tuple of (interactions_matrix, user_features, item_features)
        """
        logger.info("\n⚙ Preparing LightFM dataset...")
        
        interactions_df = data['interactions']
        user_features_df = data['user_features']
        item_features_df = data['item_features']
        embeddings_matrix = data['embeddings_matrix']
        variant_id_mapping = data['variant_id_mapping']
        
        # Reduce CLIP dimensions FIRST
        embeddings_matrix = self.reduce_clip_dimensions(embeddings_matrix)
        
        # Initialize LightFM Dataset
        self.dataset = Dataset()
        
        # Get unique users and items
        unique_users = interactions_df['user_id'].unique()
        unique_items = interactions_df['variant_id'].unique()
        
        logger.info(f"Unique users: {len(unique_users)}")
        logger.info(f"Unique items: {len(unique_items)}")
        
        # ===== User Features =====
        logger.info("\nBuilding user features...")
        
        user_feature_names = [
            'customer_segment', 'price_segment', 'rating_behavior',
            'preferred_category_id', 'preferred_color_id', 
            'preferred_size', 'preferred_gender'
        ]
        
        # Collect all possible feature values
        user_feature_values = set()
        for col in user_feature_names:
            if col in user_features_df.columns:
                unique_vals = user_features_df[col].astype(str).unique()
                for val in unique_vals:
                    user_feature_values.add(f"{col}:{val}")
        
        logger.info(f"Total user feature values: {len(user_feature_values)}")
        
        # ===== Item Features =====
        logger.info("\nBuilding item features...")
        
        item_feature_names = [
            'category_id', 'category_name', 'size', 'color_id',
            'color_name', 'gender', 'price_range'
        ]
        
        # Collect all possible item feature values
        item_feature_values = set()
        for col in item_feature_names:
            if col in item_features_df.columns:
                unique_vals = item_features_df[col].astype(str).unique()
                for val in unique_vals:
                    item_feature_values.add(f"{col}:{val}")
        
        # Add CLIP embedding features (binned into ranges)
        # Instead of raw values, we'll bin embeddings into quartiles
        n_bins = 4  # negative, low, medium, high
        for i in range(embeddings_matrix.shape[1]):
            for bin_idx in range(n_bins):
                item_feature_values.add(f"clip_dim_{i}_bin_{bin_idx}")
        
        logger.info(f"Total item feature values: {len(item_feature_values)}")
        logger.info(f"  - Categorical: {len(item_feature_values) - embeddings_matrix.shape[1] * 4}")
        logger.info(f"  - CLIP dims (binned): {embeddings_matrix.shape[1]} x 4 bins = {embeddings_matrix.shape[1] * 4}")
        
        # ===== Fit Dataset =====
        logger.info("\nFitting LightFM dataset...")
        
        self.dataset.fit(
            users=unique_users,
            items=unique_items,
            user_features=user_feature_values,
            item_features=item_feature_values
        )
        
        # Store mappings
        self.user_id_map = {uid: idx for idx, uid in enumerate(unique_users)}
        self.item_id_map = {iid: idx for idx, iid in enumerate(unique_items)}
        
        logger.info("✓ Dataset fitted")
        
        # ===== Build Interactions Matrix =====
        logger.info("\nBuilding interactions matrix...")
        
        interactions_list = []
        for _, row in interactions_df.iterrows():
            user_id = row['user_id']
            item_id = row['variant_id']
            weight = row['normalized_score']
            
            if user_id in unique_users and item_id in unique_items:
                interactions_list.append((user_id, item_id, weight))
        
        interactions_matrix, interaction_weights = self.dataset.build_interactions(
            interactions_list
        )
        
        logger.info(f"Interactions matrix shape: {interactions_matrix.shape}")
        logger.info(f"Non-zero entries: {interactions_matrix.nnz}")
        logger.info(f"Sparsity: {1 - interactions_matrix.nnz / (interactions_matrix.shape[0] * interactions_matrix.shape[1]):.4%}")
        
        # ===== Build User Features Matrix =====
        logger.info("\nBuilding user features matrix...")
        
        user_features_list = []
        for _, row in user_features_df.iterrows():
            user_id = row['user_id']
            if user_id not in unique_users:
                continue
            
            features = []
            for col in user_feature_names:
                if col in row and pd.notna(row[col]):
                    feature_str = f"{col}:{row[col]}"
                    features.append(feature_str)
            
            if features:  # Only add if has features
                user_features_list.append((user_id, features))
        
        user_features_matrix = self.dataset.build_user_features(user_features_list)
        
        logger.info(f"User features matrix shape: {user_features_matrix.shape}")
        
        # ===== Build Item Features Matrix (with binned CLIP) =====
        logger.info("\nBuilding item features matrix with binned CLIP embeddings...")
        
        # Pre-compute quartiles for each CLIP dimension
        clip_quartiles = []
        for dim_idx in range(embeddings_matrix.shape[1]):
            dim_values = embeddings_matrix[:, dim_idx]
            quartiles = np.percentile(dim_values, [25, 50, 75])
            clip_quartiles.append(quartiles)
        
        item_features_list = []
        for _, row in item_features_df.iterrows():
            item_id = row['variant_id']
            if item_id not in unique_items:
                continue
            
            features = []
            
            # Categorical features
            for col in item_feature_names:
                if col in row and pd.notna(row[col]):
                    feature_str = f"{col}:{row[col]}"
                    features.append(feature_str)
            
            # CLIP embeddings binned into quartiles
            if item_id in variant_id_mapping:
                emb_idx = variant_id_mapping[item_id]
                embedding = embeddings_matrix[emb_idx]
                
                # Bin each dimension into 4 buckets
                for dim_idx, value in enumerate(embedding):
                    q1, q2, q3 = clip_quartiles[dim_idx]
                    
                    if value <= q1:
                        bin_idx = 0  # negative/very low
                    elif value <= q2:
                        bin_idx = 1  # low
                    elif value <= q3:
                        bin_idx = 2  # medium
                    else:
                        bin_idx = 3  # high
                    
                    features.append(f"clip_dim_{dim_idx}_bin_{bin_idx}")
            
            item_features_list.append((item_id, features))
        
        item_features_matrix = self.dataset.build_item_features(item_features_list)
        
        logger.info(f"Item features matrix shape: {item_features_matrix.shape}")
        logger.info("✓ Features built with binned CLIP embeddings")
        
        return interactions_matrix, user_features_matrix, item_features_matrix, interaction_weights
    
    def split_data(self, interactions_matrix, test_percentage=0.1, val_percentage=0.1):
        """
        Split data into train/val/test by randomly selecting interactions per user
        Ensures each user has at least 1 interaction in train
        """
        logger.info("\nSplitting data into train/val/test...")
        
        matrix = interactions_matrix.tocsr()
        train_matrix = lil_matrix(matrix.shape, dtype=np.float32)
        val_matrix = lil_matrix(matrix.shape, dtype=np.float32)
        test_matrix = lil_matrix(matrix.shape, dtype=np.float32)
        
        np.random.seed(42)
        
        for user_idx in range(matrix.shape[0]):
            user_interactions = matrix.getrow(user_idx).indices
            n_interactions = len(user_interactions)
            
            if n_interactions < 3:
                # Too few interactions, put all in train
                train_matrix[user_idx, user_interactions] = matrix[user_idx, user_interactions]
                continue
            
            # Calculate split sizes
            n_test = max(1, int(n_interactions * test_percentage))
            n_val = max(1, int(n_interactions * val_percentage))
            n_train = n_interactions - n_test - n_val
            
            if n_train < 1:
                n_train = 1
                n_test = max(1, (n_interactions - n_train) // 2)
                n_val = n_interactions - n_train - n_test
            
            # Random split
            shuffled = np.random.permutation(user_interactions)
            test_indices = shuffled[:n_test]
            val_indices = shuffled[n_test:n_test+n_val]
            train_indices = shuffled[n_test+n_val:]
            
            # Assign to matrices
            train_matrix[user_idx, train_indices] = matrix[user_idx, train_indices]
            val_matrix[user_idx, val_indices] = matrix[user_idx, val_indices]
            test_matrix[user_idx, test_indices] = matrix[user_idx, test_indices]
        
        # Convert to CSR and cleanup
        train_matrix = train_matrix.tocsr()
        val_matrix = val_matrix.tocsr()
        test_matrix = test_matrix.tocsr()
        
        train_matrix.eliminate_zeros()
        val_matrix.eliminate_zeros()
        test_matrix.eliminate_zeros()
        
        # Verify no overlap
        overlap_train_val = train_matrix.multiply(val_matrix).nnz
        overlap_train_test = train_matrix.multiply(test_matrix).nnz
        overlap_val_test = val_matrix.multiply(test_matrix).nnz
        
        logger.info(f"✓ Data split completed:")
        logger.info(f"   Train: {train_matrix.nnz} interactions ({train_matrix.nnz/matrix.nnz:.1%})")
        logger.info(f"   Val:   {val_matrix.nnz} interactions ({val_matrix.nnz/matrix.nnz:.1%})")
        logger.info(f"   Test:  {test_matrix.nnz} interactions ({test_matrix.nnz/matrix.nnz:.1%})")
        logger.info(f"   Overlaps: train-val={overlap_train_val}, train-test={overlap_train_test}, val-test={overlap_val_test}")
        
        return train_matrix, val_matrix, test_matrix
    
    def train_model_with_validation(self, 
                                    train_matrix,
                                    val_matrix,
                                    user_features_matrix,
                                    item_features_matrix,
                                    num_threads: int = 4) -> LightFM:
        """
        Train LightFM model with early stopping based on validation
        """
        logger.info("\n🚀 Training LightFM model with validation...")
        logger.info(f"Hyperparameters:")
        for key, value in self.config.items():
            if key in ['no_components', 'learning_rate', 'loss', 'max_sampled', 
                      'item_alpha', 'user_alpha', 'epochs', 'patience']:
                logger.info(f"   {key}: {value}")
        
        # Initialize model
        self.model = LightFM(
            no_components=self.config['no_components'],
            learning_rate=self.config['learning_rate'],
            loss=self.config['loss'],
            max_sampled=self.config['max_sampled'],
            item_alpha=self.config['item_alpha'],
            user_alpha=self.config['user_alpha'],
            random_state=42
        )
        
        # Training loop with early stopping
        best_val_score = 0.0
        patience_counter = 0
        
        logger.info("\nTraining progress:")
        logger.info("Epoch | Train P@10 | Val P@10   | Gap      | Status")
        logger.info("-" * 60)
        
        for epoch in range(1, self.config['epochs'] + 1):
            # Train one epoch
            self.model.fit_partial(
                interactions=train_matrix,
                user_features=user_features_matrix,
                item_features=item_features_matrix,
                epochs=1,
                num_threads=num_threads,
                verbose=False
            )
            
            # Evaluate every epoch
            if epoch % 1 == 0 or epoch == 1:
                train_score = precision_at_k(
                    self.model, train_matrix,
                    user_features=user_features_matrix,
                    item_features=item_features_matrix,
                    k=10, num_threads=num_threads
                ).mean()
                
                val_score = precision_at_k(
                    self.model, val_matrix,
                    train_interactions=train_matrix,  # Important: exclude train
                    user_features=user_features_matrix,
                    item_features=item_features_matrix,
                    k=10, num_threads=num_threads
                ).mean()
                
                gap = train_score - val_score
                
                # Store history
                self.training_history.append({
                    'epoch': epoch,
                    'train_score': train_score,
                    'val_score': val_score,
                    'gap': gap
                })
                
                # Check for improvement
                status = ""
                if val_score > best_val_score + 0.0001:
                    best_val_score = val_score
                    patience_counter = 0
                    self.best_model = self._copy_model()
                    status = "✓ BEST"
                else:
                    patience_counter += 1
                    status = f"  ({patience_counter}/{self.config['patience']})"
                
                logger.info(
                    f"{epoch:3d}   | {train_score:.4f}     | {val_score:.4f}     | "
                    f"{gap:+.4f}   | {status}"
                )
                
                # Early stopping
                if patience_counter >= self.config['patience']:
                    logger.info(f"\n⚠ Early stopping at epoch {epoch}")
                    logger.info(f"   Best validation P@10: {best_val_score:.4f}")
                    break
        
        # Restore best model
        if self.best_model is not None:
            self.model = self.best_model
            logger.info(f"\n✓ Restored best model (Val P@10: {best_val_score:.4f})")
        
        return self.model
    
    def _copy_model(self):
        """Create a deep copy of current model"""
        import copy
        return copy.deepcopy(self.model)
    
    def evaluate_model(self, 
                      test_matrix,
                      train_matrix,
                      user_features_matrix,
                      item_features_matrix,
                      num_threads: int = 4):
        """
        Comprehensive evaluation on test set
        """
        logger.info("\n📊 Evaluating on test set...")
        
        metrics = {}
        
        # Precision@K
        for k in [5, 10, 20]:
            precision = precision_at_k(
                self.model, test_matrix,
                train_interactions=train_matrix,
                user_features=user_features_matrix,
                item_features=item_features_matrix,
                k=k, num_threads=num_threads
            ).mean()
            metrics[f'precision@{k}'] = precision
            logger.info(f"   Precision@{k}: {precision:.4f}")
        
        # Recall@K
        for k in [5, 10, 20]:
            recall = recall_at_k(
                self.model, test_matrix,
                train_interactions=train_matrix,
                user_features=user_features_matrix,
                item_features=item_features_matrix,
                k=k, num_threads=num_threads
            ).mean()
            metrics[f'recall@{k}'] = recall
            logger.info(f"   Recall@{k}: {recall:.4f}")
        
        # AUC
        auc = auc_score(
            self.model, test_matrix,
            train_interactions=train_matrix,
            user_features=user_features_matrix,
            item_features=item_features_matrix,
            num_threads=num_threads
        ).mean()
        metrics['auc'] = auc
        logger.info(f"   AUC Score: {auc:.4f}")
        
        logger.info("✓ Evaluation completed")
        return metrics
    
    def save_model(self, output_dir: str = "../Models"):
        """Save trained model and mappings"""
        logger.info(f"\n💾 Saving model to {output_dir}/...")
        
        os.makedirs(output_dir, exist_ok=True)
        
        # Save model
        model_path = f"{output_dir}/lightfm_model.pkl"
        with open(model_path, 'wb') as f:
            pickle.dump(self.model, f)
        logger.info(f"✓ Model saved: {model_path}")
        
        # Save dataset
        dataset_path = f"{output_dir}/lightfm_dataset.pkl"
        with open(dataset_path, 'wb') as f:
            pickle.dump(self.dataset, f)
        logger.info(f"✓ Dataset saved: {dataset_path}")
        
        # Save mappings
        mappings = {
            'user_id_map': self.user_id_map,
            'item_id_map': self.item_id_map,
            'user_features_map': self.user_features_map,
            'item_features_map': self.item_features_map
        }
        
        mappings_path = f"{output_dir}/id_mappings.pkl"
        with open(mappings_path, 'wb') as f:
            pickle.dump(mappings, f)
        logger.info(f"✓ ID mappings saved: {mappings_path}")
        
        # Save training history
        history_path = f"{output_dir}/training_history.pkl"
        with open(history_path, 'wb') as f:
            pickle.dump(self.training_history, f)
        logger.info(f"✓ Training history saved: {history_path}")
        
        # Save metadata
        metadata = {
            'trained_at': datetime.now().isoformat(),
            'n_users': int(len(self.user_id_map)),
            'n_items': int(len(self.item_id_map)),
            'model_params': self.config,
            'best_val_score': float(max([h['val_score'] for h in self.training_history])) if self.training_history else None
        }
        
        metadata_path = f"{output_dir}/model_metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        logger.info(f"✓ Metadata saved: {metadata_path}")
        
        logger.info(f"\n✓ All artifacts saved in: {output_dir}/")
    
    def run(self, evaluate: bool = True):
        """Run complete training pipeline"""
        try:
            logger.info("\n" + "="*70)
            logger.info(" STARTING IMPROVED LIGHTFM TRAINING PIPELINE")
            logger.info("="*70)
            
            # Step 1: Load data
            data = self.load_data()
            
            # Step 2: Prepare LightFM dataset
            interactions_matrix, user_features_matrix, item_features_matrix, weights = \
                self.prepare_lightfm_dataset(data)
            
            # Step 3: Split data into train/val/test
            train_matrix, val_matrix, test_matrix = self.split_data(
                interactions_matrix,
                test_percentage=self.config['test_percentage'],
                val_percentage=self.config['val_percentage']
            )
            
            # Step 4: Train model with validation
            self.train_model_with_validation(
                train_matrix,
                val_matrix,
                user_features_matrix,
                item_features_matrix
            )
            
            # Step 5: Evaluate on test set
            if evaluate:
                metrics = self.evaluate_model(
                    test_matrix,
                    train_matrix,
                    user_features_matrix,
                    item_features_matrix
                )
            else:
                metrics = {}
            
            # Step 6: Save model
            self.save_model()
            
            logger.info("\n" + "="*70)
            logger.info(" LIGHTFM TRAINING COMPLETED SUCCESSFULLY!")
            logger.info("="*70)
            
            return {
                'model': self.model,
                'metrics': metrics,
                'training_history': self.training_history
            }
            
        except Exception as e:
            logger.error(f"\n❌ Training failed: {e}", exc_info=True)
            raise


# ============================================================================
# MAIN EXECUTION
# ============================================================================

if __name__ == "__main__":
    # Initialize trainer
    trainer = LightFMTrainer(data_dir="../data/processed")
    
    trainer.config.update({
        'no_components': 256,        # Keep small
        'learning_rate': 0.15,      # Moderate
        'epochs': 100,               # Will early stop anyway
        'patience': 15,              # Stop after 5 epochs no improvement
        'reduce_clip_dims': True,   # Reduce CLIP 512 -> 128
        'clip_target_dims': 64,
        'test_percentage': 0.1,
        'val_percentage': 0.1
    })
    
    # Run training pipeline
    result = trainer.run(evaluate=True)
    
    # Print summary
    print("\n" + "="*70)
    print(" TRAINING SUMMARY")
    print("="*70)
    print("\nFinal Test Metrics:")
    for metric, value in result['metrics'].items():
        print(f"   {metric:20s}: {value:.4f}")
    
    print(f"\nModel saved to: ../Models/")
    print(f"Training history: {len(result['training_history'])} epochs")
    
    # Best validation score
    best_epoch = max(result['training_history'], key=lambda x: x['val_score'])
    print(f"\nBest validation epoch: {best_epoch['epoch']}")
    print(f"   Train P@10: {best_epoch['train_score']:.4f}")
    print(f"   Val P@10:   {best_epoch['val_score']:.4f}")
    print(f"   Gap:        {best_epoch['gap']:.4f}")
    print("="*70)