import pandas as pd
import os

class DataValidator:
    """Validate ETL pipeline output"""
    
    def __init__(self, data_dir='./data/processed'):
        self.data_dir = data_dir
    
    def validate_all(self):
        """Validate all output files"""
        print("\n Validating ETL Output...\n")
        
        files = {
            'interactions': 'interactions.pkl',
            'user_features': 'user_features.pkl',
            'item_features': 'item_features.pkl'
        }
        
        results = {}
        
        for name, filename in files.items():
            filepath = os.path.join(self.data_dir, filename)
            
            if not os.path.exists(filepath):
                print(f" {name}: File not found")
                results[name] = False
                continue
            
            try:
                df = pd.read_pickle(filepath)
                results[name] = self.validate_dataframe(name, df)
            except Exception as e:
                print(f"❌ {name}: Error loading file - {e}")
                results[name] = False
        
        # Summary
        print("\n" + "="*60)
        if all(results.values()):
            print("✅ All validations passed!")
        else:
            print("⚠️  Some validations failed!")
        print("="*60)
        
        return results
    
    def validate_dataframe(self, name, df):
        """Validate individual dataframe"""
        print(f"\n Validating {name}:")
        print(f"   Rows: {len(df)}")
        print(f"   Columns: {len(df.columns)}")
        
        # Check for nulls
        null_counts = df.isnull().sum()
        if null_counts.sum() > 0:
            print(f"    Null values found:")
            for col, count in null_counts[null_counts > 0].items():
                print(f"      - {col}: {count}")
        else:
            print(f"   No null values")
        
        # Check data types
        print(f"   Data types: {df.dtypes.value_counts().to_dict()}")
        
        # Specific validations
        if name == 'interactions':
            required_cols = ['user_id', 'variant_id', 'interaction_score']
            missing = [col for col in required_cols if col not in df.columns]
            if missing:
                print(f"   Missing columns: {missing}")
                return False
            
            if df['interaction_score'].min() < 0:
                print(f"    Negative interaction scores found")
                return False
        
        elif name == 'user_features':
            if 'user_id' not in df.columns:
                print(f"   Missing user_id column")
                return False
        
        elif name == 'item_features':
            if 'variant_id' not in df.columns:
                print(f"   Missing variant_id column")
                return False
        
        print(f"  Validation passed")
        return True


if __name__ == "__main__":
    validator = DataValidator()
    validator.validate_all()