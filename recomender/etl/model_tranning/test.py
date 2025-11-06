import os
import numpy as np
import pandas as pd
import pickle
from pathlib import Path

data_dir = Path("../data/processed/")

def size_mb(p):
    return p.stat().st_size / (1024**2)

# Check files
for fname in ["interactions.pkl", "user_features.pkl", "item_features.pkl", 
              "clip_item_embeddings.npy", "variant_ids.npy", "variant_id_mapping.pkl"]:
    p = data_dir / fname
    if p.exists():
        print(f"{fname:30s} - exists - {size_mb(p):.2f} MB")
    else:
        print(f"{fname:30s} - MISSING")

# Quick loads and shapes (if files exist)
try:
    inter = pd.read_pickle(data_dir/"interactions.pkl")
    users = pd.read_pickle(data_dir/"user_features.pkl")
    items = pd.read_pickle(data_dir/"item_features.pkl")
    emb = np.load(data_dir/"clip_item_embeddings.npy")
    print("\nShapes:")
    print(" interactions:", inter.shape)
    print(" users:", users.shape)
    print(" items:", items.shape)
    print(" embeddings:", emb.shape)
    # estimate mem for embeddings
    print(f"\nEstimated embeddings mem: {emb.size * emb.itemsize / (1024**2):.2f} MB")
except Exception as e:
    print("Could not load all files:", e)
