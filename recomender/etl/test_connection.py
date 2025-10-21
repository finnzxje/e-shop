import psycopg2
from config import Config

def test_connection():
    """Test PostgreSQL connection"""
    try:
        print("Testing database connection...")
        print(f"Host: {Config.DB_CONFIG['host']}")
        print(f"Port: {Config.DB_CONFIG['port']}")
        print(f"Database: {Config.DB_CONFIG['database']}")
        print(f"User: {Config.DB_CONFIG['user']}")
        
        conn = psycopg2.connect(**Config.DB_CONFIG)
        cursor = conn.cursor()
        
        # Test query
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        print(f"\n Connection successful!")
        print(f"PostgreSQL version: {version[0]}")
        
        # Check required tables
        print("\nChecking required table...")
        required_tables = [
            'interactions', 'users', 'products', 'product_variants',
            'orders', 'order_items', 'categories', 'colors',
            'product_reviews', 'wishlists', 'cart_items', 'product_views'
        ]
        
        for table in required_tables:
            cursor.execute(f"""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = '{table}'
                );
            """)
            exists = cursor.fetchone()[0]
            status = "✓" if exists else "✗"
            print(f"  {status} {table}")
        
        cursor.close()
        conn.close()
        
        print("\n All checks passed!")
        
    except Exception as e:
        print(f"\n Connection failed: {e}")
        raise


if __name__ == "__main__":
    test_connection()
