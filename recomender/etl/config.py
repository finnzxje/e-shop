import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Configuration settings for recommender system"""
    
    # ---------------- DATABASE ----------------
    DB_CONFIG = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': int(os.getenv('DB_PORT', 5433)),
        'database': os.getenv('DB_NAME', 'ecommerce_db'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', 'your_password'),
    }
    
    # ---------------- ETL SETTINGS ----------------
    LOOKBACK_DAYS = int(os.getenv('LOOKBACK_DAYS', 30))
    OUTPUT_DIR = os.getenv('OUTPUT_DIR', 'data/processed')
    
    # ---------------- INTERACTION WEIGHTS ----------------
    INTERACTION_WEIGHTS = {
        'PURCHASE': 5.0,
        'ADD_TO_CART': 3.0,
        'REMOVE_FROM_CART': -1.0,
        'WISHLIST': 2.5,
        'LIKE': 2.0,
        'VIEW': 1.0,
        'RATING': {
            1: -0.5,   # Very negative
            2: -0.25,  # Negative
            3: 0.0,    # Neutral
            4: 0.25,   # Positive
            5: 0.5     # Very positive
        }
    }

    # ---------------- PRICE SEGMENTS (USD) ----------------
    PRICE_SEGMENTS = {
        'budget': (0, 50),
        'mid': (50, 120),
        'premium': (120, 300),
        'luxury': (300, float('inf')),
    }

    # ---------------- CUSTOMER SEGMENTS ----------------
    CUSTOMER_SEGMENTS = {
        'new': (0, 0),
        'occasional': (1, 3),
        'regular': (4, 10),
        'loyal': (11, float('inf')),
    }
