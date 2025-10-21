import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Configuration settings"""
    
    # Database
    DB_CONFIG = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': int(os.getenv('DB_PORT', 5432)),
        'database': os.getenv('DB_NAME', 'ecommerce_db'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', 'your_password')
    }
    
    # ETL Settings
    LOOKBACK_DAYS = int(os.getenv('LOOKBACK_DAYS', 90))
    OUTPUT_DIR = os.getenv('OUTPUT_DIR', 'data/processed')
    
    # Interaction weights
    INTERACTION_WEIGHTS = {
        'purchase': 5.0,
        'add_to_cart': 3.0,
        'wishlist': 2.5,
        'rating': 1.0,  # Will use actual rating value
        'click': 1.0
    }
    
    # Price segments (VND)
    PRICE_SEGMENTS = {
        'budget': (0, 500000),
        'mid': (500000, 1000000),
        'premium': (1000000, 2000000),
        'luxury': (2000000, float('inf'))
    }
    
    # Customer segments (by order count)
    CUSTOMER_SEGMENTS = {
        'new': (0, 0),
        'occasional': (1, 3),
        'regular': (4, 10),
        'loyal': (11, float('inf'))
    }