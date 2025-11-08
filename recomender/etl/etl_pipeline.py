"""
ETL Pipeline cho Recommendation System
Theo flow: PostgreSQL -> ETL -> Feature Engineering -> CLIP Encoding -> LightFM
"""

import psycopg2
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
from typing import Dict, List, Tuple

class DatabaseConnection:
    """database connection handler"""
    
    def __init__(self, config: Dict):
        self.config = config
        self.conn = None
        self.cursor = None
    
    def connect(self):
        """Kết nối database"""
        try:
            self.conn = psycopg2.connect(
                host=self.config['host'],
                port=self.config['port'],
                database=self.config['database'],
                user=self.config['user'],
                password=self.config['password']
            )
            self.cursor = self.conn.cursor()
            print(" Connected to PostgreSQL successfully!")
            return self.conn
        except Exception as e:
            print(f"Error connecting to PostgreSQL: {e}")
            raise
    
    def close(self):
        """Đóng kết nối"""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
        print(" Database connection closed")


class ETLPipeline:
    """Main ETL Pipeline"""
    
    def __init__(self, db_config: Dict):
        self.db = DatabaseConnection(db_config)
        self.conn = None
        
    def run(self, lookback_days: int = 90):
        """run the full ETL pipeline"""
        try:
            print("\n Starting ETL Pipeline...\n")
            
            # Connect to database
            self.conn = self.db.connect()
            
            # Step 1: Extract & Transform Interactions
            print("\n Step 1: Building Interaction Matrix...")
            interactions_df = self.build_interaction_matrix(lookback_days)
            print(f"   ✓ Found {len(interactions_df)} user-item interactions")
            
            # Step 2: Extract User Features
            print("\n Step 2: Extracting User Features...")
            user_features_df = self.extract_user_features()
            print(f"   ✓ Extracted features for {len(user_features_df)} users")
            
            # Step 3: Extract Item Features
            print("\nStep 3: Extracting Item Features...")
            item_features_df = self.extract_item_features()
            print(f"   ✓ Extracted features for {len(item_features_df)} items")
            
            # Step 4: Load to database (optional - save processed features)
            print("\nStep 4: Saving Features to Database...")
            self.save_features_to_db(user_features_df, item_features_df)
            
            # Step 5: Export for training
            print("\nStep 5: Exporting data for model training...")
            self.export_for_training(interactions_df, user_features_df, item_features_df)
            
            print("\nETL Pipeline completed successfully!\n")
            
            return {
                'interactions': interactions_df,
                'user_features': user_features_df,
                'item_features': item_features_df
            }
            
        except Exception as e:
            print(f"\n❌ ETL Pipeline failed: {e}")
            raise
        finally:
            self.db.close()
    
    def build_interaction_matrix(self, lookback_days: int) -> pd.DataFrame:
        """
        step 1: Build interaction matrix with weights
        """
        query = f"""
        WITH interaction_weights AS (
            SELECT 
                user_id,
                variant_id,
                interaction_type,
                CASE 
                    WHEN interaction_type::text = 'RATING' 
                    THEN (metadata->>'rating_value')::integer::float
                    ELSE NULL
                END as rating_value,
                occurred_at as interaction_time,
                CASE interaction_type::text
                    WHEN 'PURCHASE' THEN 5.0
                    WHEN 'ADD_TO_CART' THEN 3.0
                    WHEN 'REMOVE_FROM_CART' THEN -1.0
                    WHEN 'WISHLIST' THEN 2.5
                    WHEN 'LIKE' THEN 2.0
                    WHEN 'VIEW' THEN 1.0
                    WHEN 'RATING' THEN 
                        CASE 
                            WHEN (metadata->>'rating_value')::integer = 1 THEN -0.5
                            WHEN (metadata->>'rating_value')::integer = 2 THEN -0.25
                            WHEN (metadata->>'rating_value')::integer = 3 THEN 0.0
                            WHEN (metadata->>'rating_value')::integer = 4 THEN 0.25
                            WHEN (metadata->>'rating_value')::integer = 5 THEN 0.5
                            ELSE 0.0
                        END
                    ELSE 0.5
                END as weight
            FROM product_interaction_events 
            WHERE occurred_at >= NOW() - INTERVAL '{lookback_days} days'
        ),
        aggregated AS (
            SELECT 
                user_id,
                variant_id,
                COUNT(*) as total_interactions,
                SUM(CASE WHEN interaction_type::text = 'VIEW' THEN 1 ELSE 0 END) as view_count,
                SUM(CASE WHEN interaction_type::text = 'ADD_TO_CART' THEN 1 ELSE 0 END) as cart_count,
                SUM(CASE WHEN interaction_type::text = 'PURCHASE' THEN 1 ELSE 0 END) as purchase_count,
                SUM(CASE WHEN interaction_type::text = 'WISHLIST' THEN 1 ELSE 0 END) as wishlist_count,
                SUM(CASE WHEN interaction_type::text = 'LIKE' THEN 1 ELSE 0 END) as like_count,
                AVG(CASE WHEN interaction_type::text = 'RATING' THEN rating_value ELSE NULL END) as avg_rating,
                SUM(weight) as interaction_score,
                MIN(interaction_time) as first_interaction,
                MAX(interaction_time) as last_interaction
            FROM interaction_weights
            GROUP BY user_id, variant_id
        )
        SELECT 
            user_id::text,
            variant_id::text,
            total_interactions,
            view_count,
            cart_count,
            purchase_count,
            wishlist_count,
            like_count,
            COALESCE(avg_rating, 0) as avg_rating,
            interaction_score,
            first_interaction,
            last_interaction
        FROM aggregated
        WHERE interaction_score > 0
        ORDER BY interaction_score DESC;
        """
        
        df = pd.read_sql(query, self.conn)
        
        # Normalize interaction_score (0-1)
        if len(df) > 0:
            min_score = df['interaction_score'].min()
            max_score = df['interaction_score'].max()
            if max_score > min_score:
                df['normalized_score'] = (df['interaction_score'] - min_score) / (max_score - min_score)
            else:
                df['normalized_score'] = 1.0
        
        return df
    
    def extract_user_features(self) -> pd.DataFrame:
        """
        step2: Extract user features
        
        """
        query = """
        WITH user_stats AS (
            SELECT 
                u.id as user_id,
                
                -- Order statistics
                COUNT(DISTINCT o.id) as total_orders,
                COALESCE(AVG(o.total_amount), 0) as avg_order_value,
                COALESCE(SUM(o.total_amount), 0) as lifetime_value,
                COALESCE(MAX(o.placed_at), u.created_at) as last_order_date,
                
                -- Category preferences (most frequent)
                MODE() WITHIN GROUP (ORDER BY c.id) as preferred_category_id,
                
                -- Color preferences
                MODE() WITHIN GROUP (ORDER BY pv.color_id) as preferred_color_id,
                
                -- Size preferences
                MODE() WITHIN GROUP (ORDER BY pv.size) as preferred_size,
                
                -- Rating behavior
                COALESCE(AVG(pr.rating), 0) as avg_rating_given,
                COUNT(DISTINCT pr.id) as total_reviews,
                
                -- Engagement metrics
                COUNT(DISTINCT i.id) FILTER (WHERE i.interaction_type = 'VIEW') as total_clicks,
                COUNT(DISTINCT w.id) as wishlist_items,
                
                -- Gender preference based on purchases
                MODE() WITHIN GROUP (ORDER BY p.gender) as preferred_gender
                
            FROM users u
            LEFT JOIN orders o ON u.id = o.user_id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN product_variants pv ON oi.variant_id = pv.id
            LEFT JOIN products p ON pv.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN product_reviews pr ON u.id = pr.user_id
            LEFT JOIN product_interaction_events i ON u.id = i.user_id

            LEFT JOIN wishlist_items w ON u.id = w.user_id
            WHERE u.email_verified_at IS NOT NULL  -- Only verified users
            GROUP BY u.id, u.created_at
        )
        SELECT 
            user_id::text,
            
            -- Segmentation
            CASE 
                WHEN total_orders = 0 THEN 'new'
                WHEN total_orders <= 3 THEN 'occasional'
                WHEN total_orders <= 10 THEN 'regular'
                ELSE 'loyal'
            END as customer_segment,
            

            CASE 

                WHEN avg_order_value < 50 THEN 'budget'
                WHEN avg_order_value < 120 THEN 'mid'
                WHEN avg_order_value < 300 THEN 'premium'
                ELSE 'luxury'
           END as price_segment,

            
            CASE 
                WHEN avg_rating_given >= 4 THEN 'positive'
                WHEN avg_rating_given >= 3 THEN 'neutral'
                WHEN avg_rating_given > 0 THEN 'critical'
                ELSE 'no_rating'
            END as rating_behavior,
            
            -- Preferences
            COALESCE(preferred_category_id, 0) as preferred_category_id,
            COALESCE(preferred_color_id, 0) as preferred_color_id,
            COALESCE(preferred_size, 'M') as preferred_size,
            COALESCE(preferred_gender, 'unisex') as preferred_gender,
            
            -- Numeric features
            total_orders,
            ROUND(avg_order_value::numeric, 0) as avg_order_value,
            ROUND(lifetime_value::numeric, 0) as lifetime_value,
            total_reviews,
            total_clicks,
            wishlist_items,
            ROUND(avg_rating_given::numeric, 2) as avg_rating_given,
            
            -- Recency
            EXTRACT(EPOCH FROM (NOW() - last_order_date))/86400 as days_since_last_order
            
        FROM user_stats
        ORDER BY total_orders DESC;
        """
        
        df = pd.read_sql(query, self.conn)
        return df

    def extract_item_features(self) -> pd.DataFrame:
        """
        step 3: Extract item features
        """
        query = """
        WITH variant_stats AS (
            SELECT 
                pv.id as variant_id,
                p.id as product_id,
                p.name as product_name,
                p.description as product_description,
                pv.variant_sku,

                -- Basic attributes
                c.id as category_id,
                c.name as category_name,
                COALESCE(pv.size, 'M') as size,
                COALESCE(pv.color_id, 0) as color_id,
                COALESCE(col.name, 'default') as color_name,
                COALESCE(p.gender, 'unisex') as gender,

                -- Price features
                pv.price,
                CASE 
                    WHEN pv.price < 50 THEN 'budget'
                    WHEN pv.price < 120 THEN 'mid'
                    WHEN pv.price < 300 THEN 'premium'
                    ELSE 'luxury'
                END as price_range,

                -- Popularity metrics
                COUNT(DISTINCT oi.id) as total_sales,
                COUNT(DISTINCT ci.id) as times_in_cart,
                COUNT(DISTINCT w.id) as times_wishlisted,
                COUNT(DISTINCT pview.id) as total_views,

                -- Quality metrics
                COALESCE(AVG(pr.rating), 0) as avg_rating,
                COUNT(DISTINCT pr.id) as review_count,

                -- Stock & status
                pv.quantity_in_stock,
                pv.is_active,
                p.is_featured,

                -- Image URL (primary image)
                (SELECT image_url 
                 FROM product_images 
                 WHERE product_id = p.id 
                 LIMIT 1) as primary_image_url

            FROM product_variants pv
            JOIN products p ON pv.product_id = p.id
            JOIN categories c ON p.category_id = c.id
            LEFT JOIN colors col ON pv.color_id = col.id
            LEFT JOIN order_items oi ON pv.id = oi.variant_id
            LEFT JOIN cart_items ci ON pv.id = ci.variant_id
            LEFT JOIN wishlist_items w ON pv.product_id = w.product_id
            LEFT JOIN product_views pview ON pv.id = pview.variant_id  -- Sửa: JOIN với variant_id thay vì product_id
            LEFT JOIN product_reviews pr ON p.id = pr.product_id
            WHERE pv.is_active = true
            GROUP BY pv.id, p.id, p.name, p.description, c.id, c.name, col.id, col.name
        )
        SELECT 
            variant_id::text,
            product_id::text,
            product_name,
            product_description,
            variant_sku,
            category_id,
            category_name,
            size,
            color_id,
            color_name,
            gender,
            price,
            price_range,

            -- Popularity score (weighted)
            (total_sales * 5 + times_in_cart * 3 + times_wishlisted * 2 + total_views) as popularity_score,

            total_sales,
            times_in_cart,
            times_wishlisted,
            total_views,
            ROUND(avg_rating::numeric, 2) as avg_rating,
            review_count,
            quantity_in_stock,
            is_active,
            is_featured,
            primary_image_url

        FROM variant_stats
        ORDER BY popularity_score DESC;
        """

        df = pd.read_sql(query, self.conn)

        # Normalize popularity_score
        if len(df) > 0 and df['popularity_score'].max() > 0:
            df['popularity_score_normalized'] = df['popularity_score'] / df['popularity_score'].max()
        else:
            df['popularity_score_normalized'] = 0

        return df
    # def extract_item_features(self) -> pd.DataFrame:
    #     """
    #     Simple query to test data extraction
    #     """
    #     query = """
    #     SELECT 
    #         pv.id::text as variant_id,
    #         p.id::text as product_id,
    #         p.name as product_name,
    #         pv.variant_sku,
    #         c.name as category_name,
    #         pv.size,
    #         pv.price,
    #         pv.quantity_in_stock,
    #         pv.is_active
    #     FROM product_variants pv
    #     JOIN products p ON pv.product_id = p.id
    #     JOIN categories c ON p.category_id = c.id
    #     WHERE pv.is_active = true
    #     LIMIT 100;
    #     """
        
    #     df = pd.read_sql(query, self.conn)
    #     return df
    def save_features_to_db(self, user_features_df: pd.DataFrame, item_features_df: pd.DataFrame):
        """
        Bước 4: Lưu features vào database 
        """
        cursor = self.conn.cursor()
        
        try:
            # 🔹 Tạo bảng nếu chưa tồn tại
            cursor.execute("""
            CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    
            CREATE TABLE IF NOT EXISTS user_features (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id TEXT NOT NULL,
                feature_type TEXT,
                feature_name TEXT,
                feature_value TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
    
            CREATE TABLE IF NOT EXISTS item_features (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                variant_id TEXT NOT NULL,
                feature_type TEXT,
                feature_name TEXT,
                feature_value TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """)
            
            # delete existing data
            cursor.execute("TRUNCATE TABLE user_features, item_features CASCADE;")
            
            # save user features
            user_feature_cols = [
                'customer_segment', 'price_segment', 'rating_behavior',
                'preferred_category_id', 'preferred_color_id', 'preferred_size', 'preferred_gender'
            ]
            
            for _, row in user_features_df.iterrows():
                for col in user_feature_cols:
                    if col in row:
                        cursor.execute("""
                            INSERT INTO user_features 
                            (id, user_id, feature_type, feature_name, feature_value, created_at)
                            VALUES (gen_random_uuid(), %s, 'behavioral', %s, %s, NOW())
                        """, (row['user_id'], col, str(row[col])))
            
            # save item features
            item_feature_cols = [
                'category_id', 'category_name', 'size', 'color_id', 
                'color_name', 'gender', 'price_range'
            ]
            
            for _, row in item_features_df.iterrows():
                for col in item_feature_cols:
                    if col in row:
                        cursor.execute("""
                            INSERT INTO item_features 
                            (id, variant_id, feature_type, feature_name, feature_value, created_at)
                            VALUES (gen_random_uuid(), %s, 'product_attr', %s, %s, NOW())
                        """, (row['variant_id'], col, str(row[col])))
            
            self.conn.commit()
            print("    Features saved to database")
            
        except Exception as e:
            self.conn.rollback()
            print(f"     Warning: Could not save features to database: {e}")
    
    
    def export_for_training(self, interactions_df: pd.DataFrame, 
                           user_features_df: pd.DataFrame, 
                           item_features_df: pd.DataFrame):
        """
        Bước 5: Export data ra files để train model
        """
        output_dir = "data/processed"
        import os
        os.makedirs(output_dir, exist_ok=True)
        
        # Export to CSV
        interactions_df.to_csv(f"{output_dir}/interactions.csv", index=False)
        user_features_df.to_csv(f"{output_dir}/user_features.csv", index=False)
        item_features_df.to_csv(f"{output_dir}/item_features.csv", index=False)
        
        # Export to pickle (faster loading)
        interactions_df.to_pickle(f"{output_dir}/interactions.pkl")
        user_features_df.to_pickle(f"{output_dir}/user_features.pkl")
        item_features_df.to_pickle(f"{output_dir}/item_features.pkl")
        
        print(f"    Data exported to {output_dir}/")
        print(f"     - interactions: {len(interactions_df)} rows")
        print(f"     - user_features: {len(user_features_df)} rows")
        print(f"     - item_features: {len(item_features_df)} rows")

if __name__ == "__main__":
    # Database configuration
    DB_CONFIG = {
        'host': 'localhost',
        'port': 5433,
        'database': 'eshop',
        'user': 'app',
        'password': 'secret'
    }
    
    # Run ETL Pipeline
    etl = ETLPipeline(DB_CONFIG)
    result = etl.run(lookback_days=90)
    
    # Print summary
    print("\n" + "="*60)
    print("ETL SUMMARY")
    
    print(f"Interactions: {len(result['interactions'])} records")
    print(f"Users: {len(result['user_features'])} users")
    print(f"Items: {len(result['item_features'])} items")
    print("="*60)